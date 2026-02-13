import express from 'express'
import { z } from 'zod'
import prisma from '../lib/prisma.js'
import { requireAuth, requireRole } from '../lib/auth.js'

const router = express.Router()

const areaSchema = z.object({
  name: z.string().min(2).max(120),
})

router.get('/', requireAuth, async (req, res, next) => {
  try {
    const areas = await prisma.area.findMany({
      where: { companyId: req.user.companyId },
      orderBy: { name: 'asc' },
    })
    res.json({ data: areas })
  } catch (error) {
    next(error)
  }
})

router.post('/', requireAuth, requireRole(['ADMIN', 'MANAGER']), async (req, res, next) => {
  try {
    const parsed = areaSchema.safeParse(req.body)
    if (!parsed.success) {
      return res.status(400).json({ error: 'Invalid input', details: parsed.error.issues })
    }

    const area = await prisma.area.create({
      data: {
        companyId: req.user.companyId,
        name: parsed.data.name.trim(),
        createdById: req.user.userId,
      },
    })

    return res.status(201).json({ data: area })
  } catch (error) {
    if (error.code === 'P2002') {
      return res.status(409).json({ error: 'Area already exists' })
    }
    return next(error)
  }
})

export default router
