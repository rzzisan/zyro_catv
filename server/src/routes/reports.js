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

export default router
