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

    const customersById = new Map(customers.map((customer) => [customer.id, customer]))
    const rows = []
    let totalDue = 0
    let totalPaid = 0
    let totalAdvance = 0
    let monthAmount = 0

    for (const bill of finalBills) {
      const customer = customersById.get(bill.customerId)
      if (!customer) continue

      const paidTotal = bill.payments.reduce((sum, payment) => sum + payment.amount, 0)
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
      include: { customer: { select: { name: true, customerCode: true } } },
    })

    if (!bill) {
      return res.status(404).json({ error: 'Bill not found' })
    }

    const paidAt = payload.paidAt ? new Date(payload.paidAt) : new Date()
    if (Number.isNaN(paidAt.getTime())) {
      return res.status(400).json({ error: 'Invalid paid date' })
    }

    const payment = await prisma.payment.create({
      data: {
        billId: bill.id,
        amount: payload.amount,
        paidAt,
        method: payload.method ? payload.method.trim() : null,
        collectedById: req.user.userId,
      },
    })

    const totals = await prisma.payment.aggregate({
      where: { billId: bill.id },
      _sum: { amount: true },
    })

    const paidTotal = totals._sum.amount || 0
    const newStatus = normalizeStatus(bill.amount, paidTotal)

    await prisma.bill.update({
      where: { id: bill.id },
      data: { status: newStatus },
    })

    return res.json({
      data: {
        billId: bill.id,
        customer: bill.customer,
        payment,
        paidTotal,
        status: newStatus,
      },
    })
  } catch (error) {
    return next(error)
  }
})

export default router
