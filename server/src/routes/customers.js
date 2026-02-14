import express from 'express'
import { z } from 'zod'
import prisma from '../lib/prisma.js'
import { requireAuth, requireRole } from '../lib/auth.js'

const router = express.Router()
const bdMobileRegex = /^01[3-9]\d{8}$/

const customerSchema = z.object({
  areaId: z.string().min(1),
  customerTypeId: z.string().min(1),
  customerCode: z.string().min(2).max(40),
  name: z.string().min(2).max(120),
  mobile: z.string().regex(bdMobileRegex),
  address: z.string().max(200).optional().nullable(),
  billingType: z.enum(['ACTIVE', 'FREE', 'CLOSED']),
  monthlyFee: z.number().int().nonnegative().optional().nullable(),
  dueBalance: z.number().int().nonnegative().optional().nullable(),
  connectionDate: z.string().min(4),
})

router.get('/', requireAuth, requireRole(['ADMIN', 'MANAGER']), async (req, res, next) => {
  try {
    const { areaId, customerTypeId, billingType, q } = req.query

    const where = {
      companyId: req.user.companyId,
    }

    if (areaId) {
      where.areaId = areaId
    }

    if (customerTypeId) {
      where.customerTypeId = customerTypeId
    }

    if (billingType) {
      where.billingType = billingType
    }

    if (q) {
      const needle = String(q)
      where.OR = [
        { name: { contains: needle, mode: 'insensitive' } },
        { mobile: { contains: needle } },
        { customerCode: { contains: needle, mode: 'insensitive' } },
      ]
    }

    const customers = await prisma.customer.findMany({
      where,
      include: {
        area: { select: { id: true, name: true } },
        customerType: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
    })

    res.json({ data: customers })
  } catch (error) {
    next(error)
  }
})

router.post('/', requireAuth, requireRole(['ADMIN', 'MANAGER']), async (req, res, next) => {
  try {
    const parsed = customerSchema.safeParse(req.body)
    if (!parsed.success) {
      return res.status(400).json({ error: 'Invalid input', details: parsed.error.issues })
    }

    const payload = parsed.data
    const connectionDate = new Date(payload.connectionDate)
    if (Number.isNaN(connectionDate.getTime())) {
      return res.status(400).json({ error: 'Invalid connection date' })
    }

    const monthlyFee = payload.billingType === 'ACTIVE'
      ? payload.monthlyFee ?? 0
      : null

    const customer = await prisma.customer.create({
      data: {
        companyId: req.user.companyId,
        areaId: payload.areaId,
        customerTypeId: payload.customerTypeId,
        customerCode: payload.customerCode.trim(),
        name: payload.name.trim(),
        mobile: payload.mobile.trim(),
        address: payload.address || null,
        billingType: payload.billingType,
        monthlyFee,
        dueBalance: payload.dueBalance ?? 0,
        connectionDate,
        createdById: req.user.userId,
      },
    })

    res.status(201).json({ data: customer })
  } catch (error) {
    if (error.code === 'P2002') {
      return res.status(409).json({ error: 'Customer already exists' })
    }
    return next(error)
  }
})

export default router
