import express from 'express'
import { z } from 'zod'
import prisma from '../lib/prisma.js'
import { requireAuth, requireRole } from '../lib/auth.js'

const router = express.Router()

const companyUpdateSchema = z.object({
  name: z.string().min(2).max(120),
  helplineNumber: z.string().max(40).optional().nullable(),
  invoiceNote: z.string().max(500).optional().nullable(),
  slogan: z.string().max(120).optional().nullable(),
  address: z.string().max(300).optional().nullable(),
})

router.get('/', requireAuth, requireRole(['ADMIN', 'MANAGER', 'COLLECTOR']), async (req, res, next) => {
  try {
    const company = await prisma.company.findFirst({
      where: { id: req.user.companyId },
      select: {
        id: true,
        name: true,
        helplineNumber: true,
        invoiceNote: true,
        slogan: true,
        address: true,
      },
    })

    if (!company) {
      return res.status(404).json({ error: 'Company not found' })
    }

    return res.json({ data: company })
  } catch (error) {
    return next(error)
  }
})

router.patch('/', requireAuth, requireRole(['ADMIN']), async (req, res, next) => {
  try {
    const parsed = companyUpdateSchema.safeParse(req.body)
    if (!parsed.success) {
      return res.status(400).json({ error: 'Invalid input', details: parsed.error.issues })
    }

    const payload = parsed.data
    const company = await prisma.company.update({
      where: { id: req.user.companyId },
      data: {
        name: payload.name.trim(),
        helplineNumber: payload.helplineNumber?.trim() || null,
        invoiceNote: payload.invoiceNote?.trim() || null,
        slogan: payload.slogan?.trim() || null,
        address: payload.address?.trim() || null,
      },
      select: {
        id: true,
        name: true,
        helplineNumber: true,
        invoiceNote: true,
        slogan: true,
        address: true,
      },
    })

    return res.json({ data: company })
  } catch (error) {
    return next(error)
  }
})

export default router
