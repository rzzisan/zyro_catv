import express from 'express'
import prisma from '../lib/prisma.js'
import { requireAuth, requireRole } from '../lib/auth.js'

const router = express.Router()

const startOfDay = (date) => {
  const value = new Date(date)
  value.setHours(0, 0, 0, 0)
  return value
}

const endOfDay = (date) => {
  const value = new Date(date)
  value.setHours(23, 59, 59, 999)
  return value
}

const resolveRange = (query) => {
  const now = new Date()
  if (query.month || query.year) {
    const monthValue = Number(query.month || now.getMonth() + 1)
    const yearValue = Number(query.year || now.getFullYear())
    const month = Number.isNaN(monthValue) || monthValue < 1 || monthValue > 12
      ? now.getMonth() + 1
      : monthValue
    const year = Number.isNaN(yearValue) || yearValue < 2000 ? now.getFullYear() : yearValue
    const start = new Date(year, month - 1, 1)
    const end = endOfDay(new Date(year, month, 0))
    return { start, end, mode: 'month', month, year }
  }

  if (query.startDate || query.endDate) {
    const start = query.startDate ? startOfDay(query.startDate) : startOfDay(now)
    const end = query.endDate ? endOfDay(query.endDate) : endOfDay(now)
    return { start, end, mode: 'range' }
  }

  return { start: startOfDay(now), end: endOfDay(now), mode: 'today' }
}

const monthShortLabels = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

router.get('/collections', requireAuth, requireRole(['ADMIN', 'MANAGER', 'COLLECTOR']), async (req, res, next) => {
  try {
    const { collectorId } = req.query
    const range = resolveRange(req.query)
    const detailsFlag = String(req.query.details || '').toLowerCase()
    const includeDetails = req.user.role === 'COLLECTOR' || detailsFlag === 'true' || detailsFlag === '1'
    const where = {
      paidAt: {
        gte: range.start,
        lte: range.end,
      },
      bill: { companyId: req.user.companyId },
    }

    if (req.user.role === 'COLLECTOR') {
      where.collectedById = req.user.userId
    } else if (collectorId) {
      where.collectedById = collectorId
    }

    const payments = await prisma.payment.findMany({
      where,
      include: {
        collectedBy: { select: { id: true, name: true } },
        ...(includeDetails
          ? {
              bill: {
                select: {
                  id: true,
                  periodMonth: true,
                  periodYear: true,
                  amount: true,
                  status: true,
                  customer: { select: { name: true, customerCode: true, mobile: true } },
                },
              },
            }
          : {}),
      },
      orderBy: { paidAt: 'desc' },
    })

    const rowsByCollector = new Map()
    let totalAmount = 0
    let totalCount = 0

    for (const payment of payments) {
      const collector = payment.collectedBy
      const key = collector ? collector.id : 'unknown'
      if (!rowsByCollector.has(key)) {
        rowsByCollector.set(key, {
          collectorId: collector ? collector.id : null,
          collectorName: collector ? collector.name : 'Unassigned',
          totalAmount: 0,
          totalCount: 0,
        })
      }
      const row = rowsByCollector.get(key)
      row.totalAmount += payment.amount
      row.totalCount += 1
      totalAmount += payment.amount
      totalCount += 1
    }

    const data = Array.from(rowsByCollector.values()).sort((a, b) => b.totalAmount - a.totalAmount)
    const details = includeDetails
      ? payments.map((payment) => ({
          id: payment.id,
          amount: payment.amount,
          paidAt: payment.paidAt,
          method: payment.method,
          collector: payment.collectedBy,
          customer: payment.bill?.customer || null,
        }))
      : undefined

    return res.json({
      data,
      summary: {
        totalCollectors: data.length,
        totalAmount,
        totalCount,
      },
      details,
      range: {
        mode: range.mode,
        start: range.start.toISOString(),
        end: range.end.toISOString(),
        month: range.month || null,
        year: range.year || null,
      },
    })
  } catch (error) {
    return next(error)
  }
})

/**
 * GET /api/reports/collection-summary
 * কালেকশন সামারি - সকল কালেক্টর, ম্যানেজার, অ্যাডমিনের দৈনিক এবং মাসিক কালেকশন
 */
router.get('/collection-summary', requireAuth, requireRole(['ADMIN', 'MANAGER', 'SUPER_ADMIN']), async (req, res, next) => {
  try {
    const companyId = req.user.companyId
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const todayEnd = new Date(today)
    todayEnd.setHours(23, 59, 59, 999)

    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1)
    const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0)
    monthEnd.setHours(23, 59, 59, 999)

    // সব ইউজার যারা কালেকশন করেছে (ADMIN, MANAGER, COLLECTOR)
    const users = await prisma.user.findMany({
      where: {
        companyId: companyId,
        role: { in: ['ADMIN', 'MANAGER', 'COLLECTOR'] },
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        role: true,
        mobile: true,
      },
    })

    const summaryData = []

    for (const user of users) {
      // আজকের কালেকশন
      const todayPayments = await prisma.payment.findMany({
        where: {
          collectedById: user.id,
          paidAt: {
            gte: today,
            lte: todayEnd,
          },
        },
      })

      const todayAmount = todayPayments.reduce((sum, p) => sum + p.amount, 0)
      const todayCount = todayPayments.length

      // এই মাসের কালেকশন
      const monthPayments = await prisma.payment.findMany({
        where: {
          collectedById: user.id,
          paidAt: {
            gte: monthStart,
            lte: monthEnd,
          },
        },
      })

      const monthAmount = monthPayments.reduce((sum, p) => sum + p.amount, 0)
      const monthCount = monthPayments.length

      // ডিপোজিট
      const deposits = await prisma.deposit.findMany({
        where: {
          collectorId: user.id,
          status: 'APPROVED',
        },
      })

      const totalDeposit = deposits.reduce((sum, d) => sum + d.amount, 0)

      // ব্যালেন্স (কালেকশন করেছে - ডিপোজিট করেছে)
      const balance = todayAmount + (monthAmount - todayAmount) - totalDeposit

      summaryData.push({
        id: user.id,
        name: user.name,
        role: user.role,
        mobile: user.mobile,
        today: {
          count: todayCount,
          amount: todayAmount,
        },
        thisMonth: {
          count: monthCount,
          amount: monthAmount,
        },
        deposit: totalDeposit,
        balance: balance,
      })
    }

    // Filter: শুধুমাত্র যারা এই মাসে কালেকশন করেছে (মাসিক কালেকশন count > 0 এবং amount > 0)
    const filteredData = summaryData.filter(
      (item) => item.thisMonth.count > 0 && item.thisMonth.amount > 0
    )

    // Sort by name
    filteredData.sort((a, b) => a.name.localeCompare(b.name))

    // Calculate totals from filtered data
    const totals = {
      todayCount: filteredData.reduce((sum, item) => sum + item.today.count, 0),
      todayAmount: filteredData.reduce((sum, item) => sum + item.today.amount, 0),
      monthCount: filteredData.reduce((sum, item) => sum + item.thisMonth.count, 0),
      monthAmount: filteredData.reduce((sum, item) => sum + item.thisMonth.amount, 0),
      totalDeposit: filteredData.reduce((sum, item) => sum + item.deposit, 0),
      totalBalance: filteredData.reduce((sum, item) => sum + item.balance, 0),
    }

    res.json({
      data: filteredData,
      totals: totals,
      today: {
        date: today.toISOString().split('T')[0],
      },
    })
  } catch (error) {
    console.error('Collection summary error:', error)
    return next(error)
  }
})

/**
 * GET /api/reports/dashboard-stats
 * ড্যাশবোর্ড স্ট্যাটিস্টিক্স (সঞ্চয়, প্রগ্রেস, কালেকশন)
 */
router.get('/dashboard-stats', requireAuth, requireRole(['ADMIN', 'MANAGER']), async (req, res, next) => {
  try {
    const now = new Date()
    const currentMonth = now.getMonth() + 1
    const currentYear = now.getFullYear()

    const companyId = req.user.companyId

    const activeCustomers = await prisma.customer.findMany({
      where: {
        companyId,
        billingType: 'ACTIVE',
        deletedAt: null,
      },
      select: {
        id: true,
        monthlyFee: true,
      },
    })

    const customerIds = activeCustomers.map((item) => item.id)

    if (customerIds.length) {
      const monthBills = await prisma.bill.findMany({
        where: {
          customerId: { in: customerIds },
          periodMonth: currentMonth,
          periodYear: currentYear,
        },
        select: { customerId: true },
      })

      const billedCustomerIds = new Set(monthBills.map((item) => item.customerId))
      const missingBills = activeCustomers.filter((item) => !billedCustomerIds.has(item.id))

      if (missingBills.length) {
        await prisma.bill.createMany({
          data: missingBills.map((item) => ({
            companyId,
            customerId: item.id,
            periodMonth: currentMonth,
            periodYear: currentYear,
            amount: item.monthlyFee ?? 0,
            status: 'DUE',
          })),
        })
      }
    }

    const [totalCollectedData, approvedData, allBills, monthBills] = await Promise.all([
      prisma.payment.aggregate({
        where: {
          bill: { companyId },
        },
        _sum: { amount: true },
      }),
      prisma.deposit.aggregate({
        where: {
          companyId,
          status: 'APPROVED',
        },
        _sum: { amount: true },
      }),
      prisma.bill.findMany({
        where: { companyId },
        select: { id: true, amount: true },
      }),
      prisma.bill.findMany({
        where: {
          companyId,
          periodMonth: currentMonth,
          periodYear: currentYear,
        },
        select: { id: true, amount: true },
      }),
    ])

    const allBillIds = allBills.map((item) => item.id)
    const monthBillIds = monthBills.map((item) => item.id)

    const [allAllocations, monthAllocations] = await Promise.all([
      allBillIds.length
        ? prisma.paymentAllocation.findMany({
            where: { billId: { in: allBillIds } },
            select: { billId: true, amount: true },
          })
        : Promise.resolve([]),
      monthBillIds.length
        ? prisma.paymentAllocation.findMany({
            where: { billId: { in: monthBillIds } },
            select: { billId: true, amount: true },
          })
        : Promise.resolve([]),
    ])

    const allAllocByBill = allAllocations.reduce((acc, item) => {
      acc[item.billId] = (acc[item.billId] || 0) + item.amount
      return acc
    }, {})

    const monthAllocByBill = monthAllocations.reduce((acc, item) => {
      acc[item.billId] = (acc[item.billId] || 0) + item.amount
      return acc
    }, {})

    const totalDue = allBills.reduce((sum, item) => {
      const paid = allAllocByBill[item.id] || 0
      return sum + Math.max(0, item.amount - paid)
    }, 0)

    const monthDue = monthBills.reduce((sum, item) => {
      const paid = monthAllocByBill[item.id] || 0
      return sum + Math.max(0, item.amount - paid)
    }, 0)

    const monthCollection = monthBills.reduce((sum, item) => {
      const paid = monthAllocByBill[item.id] || 0
      return sum + paid
    }, 0)

    const totalCollected = totalCollectedData._sum.amount || 0
    const totalApproved = approvedData._sum.amount || 0

    // সঞ্চয় = সংগ্রহ - অনুমোদিত ডিপোজিট
    const savings = totalCollected - totalApproved

    // প্রগ্রেস = (এই মাসে সংগ্রহ / এই মাসের বকেয়া) * 100
    const progressBase = monthCollection + monthDue
    const progress = progressBase > 0 ? ((monthCollection / progressBase) * 100).toFixed(2) : 0
    const normalizedProgress = Math.max(0, Math.min(100, Number(progress)))

    res.json({
      data: {
        savings: Math.max(0, savings), // নেগেটিভ মান প্রতিরোধ
        progress: Number(progress),
        collectionProgress: normalizedProgress,
        totalDue,
        monthDue,
        monthCollection,
      },
    })
  } catch (error) {
    console.error('Dashboard stats error:', error)
    return next(error)
  }
})

/**
 * GET /api/reports/monthly-performance
 * শেষ ১২ মাসে মাসভিত্তিক কতজন গ্রাহকের বিল কালেক্ট হয়েছে (unique customer count)
 */
router.get('/monthly-performance', requireAuth, requireRole(['ADMIN', 'MANAGER']), async (req, res, next) => {
  try {
    const now = new Date()
    const months = []
    const monthBuckets = new Map()

    for (let index = 11; index >= 0; index -= 1) {
      const date = new Date(now.getFullYear(), now.getMonth() - index, 1)
      const year = date.getFullYear()
      const month = date.getMonth() + 1
      const key = `${year}-${String(month).padStart(2, '0')}`
      const item = {
        key,
        year,
        month,
        label: monthShortLabels[month - 1],
      }
      months.push(item)
      monthBuckets.set(key, new Set())
    }

    const firstMonth = months[0]
    const lastMonth = months[months.length - 1]
    const start = new Date(firstMonth.year, firstMonth.month - 1, 1)
    const end = endOfDay(new Date(lastMonth.year, lastMonth.month, 0))

    const payments = await prisma.payment.findMany({
      where: {
        paidAt: {
          gte: start,
          lte: end,
        },
        bill: {
          companyId: req.user.companyId,
        },
      },
      select: {
        paidAt: true,
        bill: {
          select: {
            customerId: true,
          },
        },
      },
    })

    for (const payment of payments) {
      const date = new Date(payment.paidAt)
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
      const customerId = payment.bill?.customerId
      if (!customerId || !monthBuckets.has(key)) continue
      monthBuckets.get(key).add(customerId)
    }

    const data = months.map((item) => ({
      month: item.month,
      year: item.year,
      label: item.label,
      count: monthBuckets.get(item.key)?.size || 0,
    }))

    return res.json({
      data,
      range: {
        start: start.toISOString(),
        end: end.toISOString(),
      },
    })
  } catch (error) {
    return next(error)
  }
})

export default router
