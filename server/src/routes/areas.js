import express from 'express'
import { z } from 'zod'
import prisma from '../lib/prisma.js'
import { requireAuth, requireRole } from '../lib/auth.js'

const router = express.Router()

const areaSchema = z.object({
  name: z.string().min(2).max(120),
})

const areaUpdateSchema = z.object({
  name: z.string().min(2).max(120),
})

router.get('/', requireAuth, async (req, res, next) => {
  try {
    const where = { companyId: req.user.companyId }
    if (req.user.role === 'COLLECTOR') {
      const assignments = await prisma.collectorArea.findMany({
        where: { collectorId: req.user.userId, area: { companyId: req.user.companyId } },
        select: { areaId: true },
      })
      const areaIds = assignments.map((item) => item.areaId)
      if (!areaIds.length) {
        return res.json({ data: [] })
      }
      where.id = { in: areaIds }
    }

    const areas = await prisma.area.findMany({
      where,
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

router.patch('/:id', requireAuth, requireRole(['ADMIN', 'MANAGER']), async (req, res, next) => {
  try {
    const parsed = areaUpdateSchema.safeParse(req.body)
    if (!parsed.success) {
      return res.status(400).json({ error: 'Invalid input', details: parsed.error.issues })
    }

    const existing = await prisma.area.findFirst({
      where: { id: req.params.id, companyId: req.user.companyId },
    })

    if (!existing) {
      return res.status(404).json({ error: 'Area not found' })
    }

    const area = await prisma.area.update({
      where: { id: existing.id },
      data: { name: parsed.data.name.trim() },
    })

    return res.json({ data: area })
  } catch (error) {
    if (error.code === 'P2002') {
      return res.status(409).json({ error: 'Area already exists' })
    }
    return next(error)
  }
})

router.delete('/:id', requireAuth, requireRole(['ADMIN', 'MANAGER']), async (req, res, next) => {
  try {
    const existing = await prisma.area.findFirst({
      where: { id: req.params.id, companyId: req.user.companyId },
    })

    if (!existing) {
      return res.status(404).json({ error: 'Area not found' })
    }

    await prisma.area.delete({
      where: { id: existing.id },
    })

    return res.json({ ok: true })
  } catch (error) {
    if (error.code === 'P2003') {
      return res.status(409).json({ error: 'Area has related records' })
    }
    return next(error)
  }
})

export default router
