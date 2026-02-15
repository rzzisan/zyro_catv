import express from 'express'
import { z } from 'zod'
import prisma from '../lib/prisma.js'
import { requireAuth, requireRole } from '../lib/auth.js'

const router = express.Router()

const collectSchema = z.object({
  billId: z.string().min(1),
  amount: z.preprocess((value) => Number(value), z.number().positive()),
  paidAt: z.string().optional(),
  method: z.string().max(40).optional().nullable(),
})

const normalizeStatus = (amount, paidTotal) => {
  if (paidTotal > amount) return 'ADVANCE'
  if (paidTotal === amount && amount > 0) return 'PAID'
  if (paidTotal > 0 && paidTotal < amount) return 'PARTIAL'
  return 'DUE'
}

const toMonthKey = (year, month) => `${year}-${String(month).padStart(2, '0')}`

const monthStart = (date) => new Date(date.getFullYear(), date.getMonth(), 1)

const addMonths = (date, months) => {
  const value = new Date(date)
  value.setMonth(value.getMonth() + months)
  return monthStart(value)
}

const buildMonthRange = (start, end) => {
  const months = []
  let cursor = monthStart(start)
  const limit = monthStart(end)
  while (cursor <= limit) {
    months.push({ year: cursor.getFullYear(), month: cursor.getMonth() + 1 })
    cursor = addMonths(cursor, 1)
  }
  return months
}

const buildTrailingMonths = (endDate, count) => {
  const months = []
  const endMonth = monthStart(endDate)
  const total = Math.max(1, count)
  for (let index = total - 1; index >= 0; index -= 1) {
    const cursor = addMonths(endMonth, -index)
    months.push({ year: cursor.getFullYear(), month: cursor.getMonth() + 1 })
  }
  return months
}

const monthNames = [
  'জানুয়ারি',
  'ফেব্রুয়ারি',
  'মার্চ',
  'এপ্রিল',
  'মে',
  'জুন',
  'জুলাই',
  'আগস্ট',
  'সেপ্টেম্বর',
  'অক্টোবর',
  'নভেম্বর',
  'ডিসেম্বর',
]

const monthLabel = (year, month) => {
  const name = monthNames[month - 1] || String(month)
  return `${name} ${year}`
}

const resolvePeriod = (query) => {
  const now = new Date()
  const monthParam = Number(query.month)
  const yearParam = Number(query.year)
  const month = Number.isNaN(monthParam) || monthParam < 1 || monthParam > 12
    ? now.getMonth() + 1
    : monthParam
  const year = Number.isNaN(yearParam) || yearParam < 2000 ? now.getFullYear() : yearParam
  return { month, year }
}

router.get('/', requireAuth, requireRole(['ADMIN', 'MANAGER', 'COLLECTOR']), async (req, res, next) => {
  try {
    const { month, year } = resolvePeriod(req.query)
    const { areaId, status, collectorId, q } = req.query
    let collectorAreaIds = null
    const pageParam = Number(req.query.page || 1)
    const limitParam = req.query.limit
    const isAll = String(limitParam || '').toLowerCase() === 'all'
    const perPage = isAll
      ? null
      : (() => {
          const parsed = Number(limitParam || 50)
          if (Number.isNaN(parsed) || parsed < 1) return 50
          return Math.min(parsed, 200)
        })()
    const page = Number.isNaN(pageParam) || pageParam < 1 ? 1 : pageParam

    const customerWhere = {
      companyId: req.user.companyId,
      billingType: 'ACTIVE',
    }

    if (req.user.role === 'COLLECTOR') {
      const assignments = await prisma.collectorArea.findMany({
        where: { collectorId: req.user.userId, area: { companyId: req.user.companyId } },
        select: { areaId: true },
      })
      collectorAreaIds = assignments.map((item) => item.areaId)
      if (!collectorAreaIds.length) {
        return res.json({
          data: [],
          summary: { totalCustomers: 0, totalDue: 0, totalPaid: 0, totalAdvance: 0, monthAmount: 0 },
          period: { month, year },
          meta: { total: 0, page: 1, perPage: perPage || 0, totalPages: 1 },
        })
      }
    }

    if (areaId) {
      if (collectorAreaIds && !collectorAreaIds.includes(areaId)) {
        return res.json({
          data: [],
          summary: { totalCustomers: 0, totalDue: 0, totalPaid: 0, totalAdvance: 0, monthAmount: 0 },
          period: { month, year },
          meta: { total: 0, page: 1, perPage: perPage || 0, totalPages: 1 },
        })
      }
      customerWhere.areaId = areaId
    } else if (collectorAreaIds) {
      customerWhere.areaId = { in: collectorAreaIds }
    }

    if (q) {
      const needle = String(q)
      customerWhere.OR = [
        { name: { contains: needle } },
        { mobile: { contains: needle } },
        { customerCode: { contains: needle } },
      ]
    }

    const customers = await prisma.customer.findMany({
      where: customerWhere,
      include: {
        area: { select: { id: true, name: true } },
        customerType: { select: { id: true, name: true } },
      },
    })

    if (!customers.length) {
      return res.json({
        data: [],
        summary: { totalCustomers: 0, totalDue: 0, totalPaid: 0, totalAdvance: 0, monthAmount: 0 },
        period: { month, year },
        meta: { total: 0, page: 1, perPage: perPage || 0, totalPages: 1 },
      })
    }

    const customerIds = customers.map((customer) => customer.id)

    const bills = await prisma.bill.findMany({
      where: {
        customerId: { in: customerIds },
        periodMonth: month,
        periodYear: year,
      },
      include: {
        payments: {
          select: {
            id: true,
            amount: true,
            paidAt: true,
            method: true,
            collectedById: true,
            collectedBy: { select: { id: true, name: true } },
          },
          orderBy: { paidAt: 'desc' },
        },
      },
    })

    const billsByCustomer = new Map(bills.map((bill) => [bill.customerId, bill]))
    const missingBills = customers.filter((customer) => !billsByCustomer.has(customer.id))

    if (missingBills.length) {
      await prisma.bill.createMany({
        data: missingBills.map((customer) => ({
          companyId: req.user.companyId,
          customerId: customer.id,
          periodMonth: month,
          periodYear: year,
          amount: customer.monthlyFee ?? 0,
          status: 'DUE',
        })),
      })
    }

    const finalBills = missingBills.length
      ? await prisma.bill.findMany({
          where: {
            customerId: { in: customerIds },
            periodMonth: month,
            periodYear: year,
          },
          include: {
            payments: {
              select: {
                id: true,
                amount: true,
                paidAt: true,
                method: true,
                collectedById: true,
                collectedBy: { select: { id: true, name: true } },
              },
              orderBy: { paidAt: 'desc' },
            },
          },
        })
      : bills

    const billIds = finalBills.map((bill) => bill.id)
    const allocationRows = billIds.length
      ? await prisma.paymentAllocation.findMany({
          where: { billId: { in: billIds } },
          select: { billId: true, amount: true },
        })
      : []
    const allocationMap = allocationRows.reduce((acc, row) => {
      acc[row.billId] = (acc[row.billId] || 0) + row.amount
      return acc
    }, {})

    const customersById = new Map(customers.map((customer) => [customer.id, customer]))
    const rows = []
    let totalDue = 0
    let totalPaid = 0
    let totalAdvance = 0
    let monthAmount = 0

    for (const bill of finalBills) {
      const customer = customersById.get(bill.customerId)
      if (!customer) continue

      const paidTotal = allocationMap[bill.id] || 0
      const billStatus = normalizeStatus(bill.amount, paidTotal)

      if (status && String(status).toUpperCase() !== billStatus) {
        continue
      }

      if (collectorId) {
        const matchesCollector = bill.payments.some(
          (payment) => payment.collectedById === collectorId
        )
        if (!matchesCollector) continue
      }

      const dueCurrent = Math.max(0, bill.amount - paidTotal)
      const advanceAmount = paidTotal > bill.amount ? paidTotal - bill.amount : 0
      const totalDueAmount = (customer.dueBalance ?? 0) + dueCurrent
      const lastPayment = bill.payments[0] || null

      rows.push({
        billId: bill.id,
        customerId: customer.id,
        customerCode: customer.customerCode,
        name: customer.name,
        mobile: customer.mobile,
        area: customer.area,
        customerType: customer.customerType,
        monthlyFee: customer.monthlyFee ?? 0,
        dueBalance: customer.dueBalance ?? 0,
        amount: bill.amount,
        paidTotal,
        status: billStatus,
        dueCurrent,
        advanceAmount,
        totalDue: totalDueAmount,
        lastPayment,
      })

      totalDue += totalDueAmount
      totalPaid += paidTotal
      totalAdvance += advanceAmount
      monthAmount += bill.amount
    }

    const total = rows.length
    const totalPages = perPage ? Math.max(1, Math.ceil(total / perPage)) : 1
    const safePage = perPage ? Math.min(page, totalPages) : 1
    const startIndex = perPage ? (safePage - 1) * perPage : 0
    const pageRows = perPage ? rows.slice(startIndex, startIndex + perPage) : rows

    return res.json({
      data: pageRows,
      summary: {
        totalCustomers: total,
        totalDue,
        totalPaid,
        totalAdvance,
        monthAmount,
      },
      period: { month, year },
      meta: {
        total,
        page: safePage,
        perPage: perPage || total || pageRows.length,
        totalPages,
      },
    })
  } catch (error) {
    next(error)
  }
})

router.post('/collect', requireAuth, requireRole(['ADMIN', 'MANAGER', 'COLLECTOR']), async (req, res, next) => {
  try {
    const parsed = collectSchema.safeParse(req.body)
    if (!parsed.success) {
      return res.status(400).json({ error: 'Invalid input', details: parsed.error.issues })
    }

    const payload = parsed.data
    const bill = await prisma.bill.findFirst({
      where: { id: payload.billId, companyId: req.user.companyId },
      include: {
        customer: {
          select: {
            id: true,
            name: true,
            customerCode: true,
            monthlyFee: true,
            connectionDate: true,
            areaId: true,
          },
        },
      },
    })

    if (!bill) {
      return res.status(404).json({ error: 'Bill not found' })
    }

    const paidAt = payload.paidAt ? new Date(payload.paidAt) : new Date()
    if (Number.isNaN(paidAt.getTime())) {
      return res.status(400).json({ error: 'Invalid paid date' })
    }

    const company = await prisma.company.findFirst({
      where: { id: req.user.companyId },
      select: { billingSystem: true },
    })

    if (!bill.customer.monthlyFee || bill.customer.monthlyFee <= 0) {
      return res.status(400).json({ error: 'Monthly fee is not set' })
    }

    const billingSystem = company?.billingSystem || 'POSTPAID'
    const now = new Date()
    const monthlyFee = bill.customer.monthlyFee

    let monthTargets = []
    if (billingSystem === 'POSTPAID') {
      const endDate = addMonths(monthStart(now), -1)
      const totalDue = (bill.customer.dueBalance || 0) + bill.amount
      const dueMonths = Math.max(1, Math.ceil(totalDue / monthlyFee))
      monthTargets = buildTrailingMonths(endDate, dueMonths)
    } else {
      const startDate = monthStart(now)
      const monthsNeeded = Math.max(1, Math.ceil(payload.amount / monthlyFee))
      monthTargets = Array.from({ length: monthsNeeded }).map((_, index) => {
        const date = addMonths(startDate, index)
        return { year: date.getFullYear(), month: date.getMonth() + 1 }
      })
    }

    if (!monthTargets.length) {
      return res.status(400).json({ error: 'No billing months available' })
    }

    const monthConditions = monthTargets.map((item) => ({
      periodMonth: item.month,
      periodYear: item.year,
    }))

    const existingBills = await prisma.bill.findMany({
      where: {
        customerId: bill.customer.id,
        OR: monthConditions,
      },
    })

    const existingMap = new Map(
      existingBills.map((item) => [toMonthKey(item.periodYear, item.periodMonth), item])
    )

    const missingTargets = monthTargets.filter(
      (item) => !existingMap.has(toMonthKey(item.year, item.month))
    )

    if (missingTargets.length) {
      await prisma.bill.createMany({
        data: missingTargets.map((item) => ({
          companyId: req.user.companyId,
          customerId: bill.customer.id,
          periodMonth: item.month,
          periodYear: item.year,
          amount: monthlyFee,
          status: 'DUE',
        })),
      })
    }

    let billsForPayment = await prisma.bill.findMany({
      where: {
        customerId: bill.customer.id,
        OR: monthConditions,
      },
      orderBy: [
        { periodYear: 'asc' },
        { periodMonth: 'asc' },
      ],
    })

    let remaining = payload.amount
    const allocations = []

    const paidRows = await prisma.paymentAllocation.findMany({
      where: { billId: { in: billsForPayment.map((item) => item.id) } },
      select: { billId: true, amount: true },
    })
    const paidMap = paidRows.reduce((acc, row) => {
      acc[row.billId] = (acc[row.billId] || 0) + row.amount
      return acc
    }, {})

    for (const target of billsForPayment) {
      if (remaining <= 0) break
      const alreadyPaid = paidMap[target.id] || 0
      const available = Math.max(0, target.amount - alreadyPaid)
      if (available <= 0) continue
      const applied = Math.min(available, remaining)
      allocations.push({ billId: target.id, amount: applied })
      remaining -= applied
    }

    if (remaining > 0) {
      let safety = 0
      let cursorDate = monthTargets.length
        ? addMonths(monthStart(new Date(monthTargets[monthTargets.length - 1].year, monthTargets[monthTargets.length - 1].month - 1, 1)), 1)
        : monthStart(now)

      while (remaining > 0 && safety < 24) {
        const year = cursorDate.getFullYear()
        const month = cursorDate.getMonth() + 1
        const newBill = await prisma.bill.create({
          data: {
            companyId: req.user.companyId,
            customerId: bill.customer.id,
            periodMonth: month,
            periodYear: year,
            amount: monthlyFee,
            status: 'DUE',
          },
        })
        const applied = Math.min(monthlyFee, remaining)
        allocations.push({ billId: newBill.id, amount: applied })
        remaining -= applied
        cursorDate = addMonths(cursorDate, 1)
        safety += 1
      }
    }

    if (!allocations.length) {
      return res.status(400).json({ error: 'No payable bills found' })
    }

    const payment = await prisma.payment.create({
      data: {
        billId: allocations[0].billId,
        amount: payload.amount,
        paidAt,
        method: payload.method ? payload.method.trim() : null,
        collectedById: req.user.userId,
      },
    })

    await prisma.paymentAllocation.createMany({
      data: allocations.map((item) => ({
        paymentId: payment.id,
        billId: item.billId,
        amount: item.amount,
      })),
    })

    const affectedBillIds = allocations.map((item) => item.billId)
    const totalsByBill = await prisma.paymentAllocation.findMany({
      where: { billId: { in: affectedBillIds } },
      select: { billId: true, amount: true },
    })
    const totalMap = totalsByBill.reduce((acc, row) => {
      acc[row.billId] = (acc[row.billId] || 0) + row.amount
      return acc
    }, {})

    const affectedBills = await prisma.bill.findMany({
      where: { id: { in: affectedBillIds } },
      select: { id: true, amount: true },
    })

    await prisma.$transaction(
      affectedBills.map((item) =>
        prisma.bill.update({
          where: { id: item.id },
          data: { status: normalizeStatus(item.amount, totalMap[item.id] || 0) },
        })
      )
    )

    return res.json({
      data: {
        billId: bill.id,
        customer: bill.customer,
        payment,
        allocations: allocations.map((item) => ({
          billId: item.billId,
          amount: item.amount,
        })),
      },
    })
  } catch (error) {
    return next(error)
  }
})

router.get('/history/:customerId', requireAuth, requireRole(['ADMIN', 'MANAGER', 'COLLECTOR']), async (req, res, next) => {
  try {
    const customer = await prisma.customer.findFirst({
      where: { id: req.params.customerId, companyId: req.user.companyId },
      select: { id: true, areaId: true },
    })

    if (!customer) {
      return res.status(404).json({ error: 'Customer not found' })
    }

    if (req.user.role === 'COLLECTOR') {
      const assignments = await prisma.collectorArea.findMany({
        where: { collectorId: req.user.userId, area: { companyId: req.user.companyId } },
        select: { areaId: true },
      })
      const areaIds = assignments.map((item) => item.areaId)
      if (!areaIds.includes(customer.areaId)) {
        return res.status(403).json({ error: 'Forbidden' })
      }
    }

    const allocations = await prisma.paymentAllocation.findMany({
      where: { bill: { customerId: customer.id, companyId: req.user.companyId } },
      include: {
        payment: { select: { id: true, amount: true, paidAt: true, method: true, collectedBy: { select: { id: true, name: true } } } },
        bill: { select: { periodMonth: true, periodYear: true } },
      },
      orderBy: { payment: { paidAt: 'desc' } },
    })

    const grouped = new Map()
    allocations.forEach((item) => {
      if (!grouped.has(item.payment.id)) {
        grouped.set(item.payment.id, {
          paymentId: item.payment.id,
          amount: item.payment.amount,
          paidAt: item.payment.paidAt,
          method: item.payment.method,
          collector: item.payment.collectedBy,
          months: [],
        })
      }
      grouped.get(item.payment.id).months.push({
        month: item.bill.periodMonth,
        year: item.bill.periodYear,
        amount: item.amount,
        label: monthLabel(item.bill.periodYear, item.bill.periodMonth),
      })
    })

    return res.json({ data: Array.from(grouped.values()) })
  } catch (error) {
    return next(error)
  }
})

router.delete('/payments/:paymentId', requireAuth, requireRole(['ADMIN']), async (req, res, next) => {
  try {
    const payment = await prisma.payment.findFirst({
      where: { id: req.params.paymentId, bill: { companyId: req.user.companyId } },
    })

    if (!payment) {
      return res.status(404).json({ error: 'Payment not found' })
    }

    const allocations = await prisma.paymentAllocation.findMany({
      where: { paymentId: payment.id },
      select: { billId: true },
    })

    const billIds = allocations.map((item) => item.billId)

    await prisma.payment.delete({ where: { id: payment.id } })

    if (billIds.length) {
      const totalsByBill = await prisma.paymentAllocation.findMany({
        where: { billId: { in: billIds } },
        select: { billId: true, amount: true },
      })
      const totalMap = totalsByBill.reduce((acc, row) => {
        acc[row.billId] = (acc[row.billId] || 0) + row.amount
        return acc
      }, {})

      const affectedBills = await prisma.bill.findMany({
        where: { id: { in: billIds } },
        select: { id: true, amount: true },
      })

      await prisma.$transaction(
        affectedBills.map((item) =>
          prisma.bill.update({
            where: { id: item.id },
            data: { status: normalizeStatus(item.amount, totalMap[item.id] || 0) },
          })
        )
      )
    }

    return res.json({ ok: true })
  } catch (error) {
    return next(error)
  }
})

export default router
