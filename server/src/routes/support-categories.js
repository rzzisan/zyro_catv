import express from 'express'
import { z } from 'zod'
import prisma from '../lib/prisma.js'
import { requireAuth, requireRole } from '../lib/auth.js'

const router = express.Router()

const supportCategorySchema = z.object({
  name: z.string().min(2).max(80),
  description: z.string().max(300).optional().nullable(),
  isActive: z.boolean().optional(),
})

const supportCategoryUpdateSchema = z.object({
  name: z.string().min(2).max(80),
  description: z.string().max(300).optional().nullable(),
  isActive: z.boolean().optional(),
})

router.get('/', requireAuth, requireRole(['ADMIN', 'MANAGER', 'COLLECTOR']), async (req, res, next) => {
  try {
    const rows = await prisma.supportCategory.findMany({
      where: { companyId: req.user.companyId },
      orderBy: [
        { isActive: 'desc' },
        { name: 'asc' },
      ],
    })
    return res.json({ data: rows })
  } catch (error) {
    return next(error)
  }
})

router.post('/', requireAuth, requireRole(['ADMIN']), async (req, res, next) => {
  try {
    const parsed = supportCategorySchema.safeParse(req.body)
    if (!parsed.success) {
      return res.status(400).json({ error: 'Invalid input', details: parsed.error.issues })
    }

    const category = await prisma.supportCategory.create({
      data: {
        companyId: req.user.companyId,
        name: parsed.data.name.trim(),
        description: parsed.data.description?.trim() || null,
        isActive: parsed.data.isActive ?? true,
        createdById: req.user.userId,
      },
    })

    return res.status(201).json({ data: category })
  } catch (error) {
    if (error.code === 'P2002') {
      return res.status(409).json({ error: 'Support category already exists' })
    }
    return next(error)
  }
})

router.patch('/:id', requireAuth, requireRole(['ADMIN']), async (req, res, next) => {
  try {
    const parsed = supportCategoryUpdateSchema.safeParse(req.body)
    if (!parsed.success) {
      return res.status(400).json({ error: 'Invalid input', details: parsed.error.issues })
    }

    const existing = await prisma.supportCategory.findFirst({
      where: { id: req.params.id, companyId: req.user.companyId },
    })

    if (!existing) {
      return res.status(404).json({ error: 'Support category not found' })
    }

    const updated = await prisma.supportCategory.update({
      where: { id: existing.id },
      data: {
        name: parsed.data.name.trim(),
        description: parsed.data.description?.trim() || null,
        isActive: parsed.data.isActive ?? existing.isActive,
      },
    })

    return res.json({ data: updated })
  } catch (error) {
    if (error.code === 'P2002') {
      return res.status(409).json({ error: 'Support category already exists' })
    }
    return next(error)
  }
})

router.delete('/:id', requireAuth, requireRole(['ADMIN']), async (req, res, next) => {
  try {
    const existing = await prisma.supportCategory.findFirst({
      where: { id: req.params.id, companyId: req.user.companyId },
    })

    if (!existing) {
      return res.status(404).json({ error: 'Support category not found' })
    }

    await prisma.supportCategory.delete({
      where: { id: existing.id },
    })

    return res.json({ ok: true })
  } catch (error) {
    return next(error)
  }
})

export default router
