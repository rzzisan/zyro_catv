import express from 'express'
import { z } from 'zod'
import prisma from '../lib/prisma.js'
import { requireAuth, requireRole } from '../lib/auth.js'

const router = express.Router()

const depositSchema = z.object({
  amount: z.preprocess((value) => Number(value), z.number().positive()),
  depositedAt: z.string().min(4),
})

const actionSchema = z.object({
  action: z.enum(['APPROVE', 'REJECT']),
})

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

router.get('/summary', requireAuth, requireRole(['ADMIN', 'MANAGER', 'COLLECTOR']), async (req, res, next) => {
  try {
    if (req.user.role === 'COLLECTOR') {
      const now = new Date()
      const [paymentsSum, approvedSum, pendingSum, todaySum, todayCount] = await Promise.all([
        prisma.payment.aggregate({
          where: {
            collectedById: req.user.userId,
            bill: { companyId: req.user.companyId },
          },
          _sum: { amount: true },
        }),
        prisma.deposit.aggregate({
          where: {
            collectorId: req.user.userId,
            status: 'APPROVED',
          },
          _sum: { amount: true },
        }),
        prisma.deposit.aggregate({
          where: {
            collectorId: req.user.userId,
            status: 'PENDING',
          },
          _sum: { amount: true },
        }),
        prisma.payment.aggregate({
          where: {
            collectedById: req.user.userId,
            paidAt: { gte: startOfDay(now), lte: endOfDay(now) },
            bill: { companyId: req.user.companyId },
          },
          _sum: { amount: true },
        }),
        prisma.payment.count({
          where: {
            collectedById: req.user.userId,
            paidAt: { gte: startOfDay(now), lte: endOfDay(now) },
            bill: { companyId: req.user.companyId },
          },
        }),
      ])

      const collectedTotal = paymentsSum._sum.amount || 0
      const approvedTotal = approvedSum._sum.amount || 0
      const pendingTotal = pendingSum._sum.amount || 0
      const balance = collectedTotal - approvedTotal

      return res.json({
        data: {
          collectedTotal,
          approvedTotal,
          pendingTotal,
          balance,
          todayAmount: todaySum._sum.amount || 0,
          todayCount,
        },
      })
    }

    const [pendingSum, pendingCount] = await Promise.all([
      prisma.deposit.aggregate({
        where: { companyId: req.user.companyId, status: 'PENDING' },
        _sum: { amount: true },
      }),
      prisma.deposit.count({
        where: { companyId: req.user.companyId, status: 'PENDING' },
      }),
    ])

    return res.json({
      data: {
        pendingAmount: pendingSum._sum.amount || 0,
        pendingCount,
      },
    })
  } catch (error) {
    return next(error)
  }
})

router.get('/', requireAuth, requireRole(['ADMIN', 'MANAGER', 'COLLECTOR']), async (req, res, next) => {
  try {
    const { status, collectorId, startDate, endDate } = req.query
    const where = {
      companyId: req.user.companyId,
    }

    if (status) {
      where.status = status
    }

    if (req.user.role === 'COLLECTOR') {
      where.collectorId = req.user.userId
    } else if (collectorId) {
      where.collectorId = collectorId
    }

    if (startDate || endDate) {
      where.depositedAt = {
        gte: startDate ? startOfDay(startDate) : undefined,
        lte: endDate ? endOfDay(endDate) : undefined,
      }
    }

    const deposits = await prisma.deposit.findMany({
      where,
      include: {
        collector: { select: { id: true, name: true, mobile: true } },
        approvedBy: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
    })

    res.json({ data: deposits })
  } catch (error) {
    return next(error)
  }
})

router.post('/', requireAuth, requireRole(['COLLECTOR']), async (req, res, next) => {
  try {
    const parsed = depositSchema.safeParse(req.body)
    if (!parsed.success) {
      return res.status(400).json({ error: 'Invalid input', details: parsed.error.issues })
    }

    const payload = parsed.data
    const depositedAt = new Date(payload.depositedAt)
    if (Number.isNaN(depositedAt.getTime())) {
      return res.status(400).json({ error: 'Invalid deposited date' })
    }

    const deposit = await prisma.deposit.create({
      data: {
        companyId: req.user.companyId,
        collectorId: req.user.userId,
        amount: payload.amount,
        depositedAt,
      },
    })

    return res.status(201).json({ data: deposit })
  } catch (error) {
    return next(error)
  }
})

router.patch('/:id', requireAuth, requireRole(['ADMIN', 'MANAGER']), async (req, res, next) => {
  try {
    const parsed = actionSchema.safeParse(req.body)
    if (!parsed.success) {
      return res.status(400).json({ error: 'Invalid input', details: parsed.error.issues })
    }

    const existing = await prisma.deposit.findFirst({
      where: { id: req.params.id, companyId: req.user.companyId },
    })

    if (!existing) {
      return res.status(404).json({ error: 'Deposit not found' })
    }

    if (existing.status !== 'PENDING') {
      return res.status(400).json({ error: 'Deposit already processed' })
    }

    const status = parsed.data.action === 'APPROVE' ? 'APPROVED' : 'REJECTED'

    const deposit = await prisma.deposit.update({
      where: { id: existing.id },
      data: {
        status,
        approvedAt: new Date(),
        approvedById: req.user.userId,
      },
      include: {
        collector: { select: { id: true, name: true, mobile: true } },
        approvedBy: { select: { id: true, name: true } },
      },
    })

    return res.json({ data: deposit })
  } catch (error) {
    return next(error)
  }
})

export default router
