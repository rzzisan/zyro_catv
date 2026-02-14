import express from 'express'
import { z } from 'zod'
import prisma from '../lib/prisma.js'
import { requireAuth, requireRole } from '../lib/auth.js'

const router = express.Router()

const typeSchema = z.object({
  name: z.string().min(2).max(80),
})

const typeUpdateSchema = z.object({
  name: z.string().min(2).max(80),
})

router.get('/', requireAuth, requireRole(['ADMIN', 'MANAGER']), async (req, res, next) => {
  try {
    const types = await prisma.customerType.findMany({
      where: { companyId: req.user.companyId },
      orderBy: { name: 'asc' },
    })
    res.json({ data: types })
  } catch (error) {
    next(error)
  }
})

router.post('/', requireAuth, requireRole(['ADMIN']), async (req, res, next) => {
  try {
    const parsed = typeSchema.safeParse(req.body)
    if (!parsed.success) {
      return res.status(400).json({ error: 'Invalid input', details: parsed.error.issues })
    }

    const type = await prisma.customerType.create({
      data: {
        companyId: req.user.companyId,
        name: parsed.data.name.trim(),
        createdById: req.user.userId,
      },
    })

    res.status(201).json({ data: type })
  } catch (error) {
    if (error.code === 'P2002') {
      return res.status(409).json({ error: 'Customer type already exists' })
    }
    return next(error)
  }
})

router.patch('/:id', requireAuth, requireRole(['ADMIN']), async (req, res, next) => {
  try {
    const parsed = typeUpdateSchema.safeParse(req.body)
    if (!parsed.success) {
      return res.status(400).json({ error: 'Invalid input', details: parsed.error.issues })
    }

    const existing = await prisma.customerType.findFirst({
      where: { id: req.params.id, companyId: req.user.companyId },
    })

    if (!existing) {
      return res.status(404).json({ error: 'Customer type not found' })
    }

    const updated = await prisma.customerType.update({
      where: { id: existing.id },
      data: { name: parsed.data.name.trim() },
    })

    return res.json({ data: updated })
  } catch (error) {
    if (error.code === 'P2002') {
      return res.status(409).json({ error: 'Customer type already exists' })
    }
    return next(error)
  }
})

router.delete('/:id', requireAuth, requireRole(['ADMIN']), async (req, res, next) => {
  try {
    const existing = await prisma.customerType.findFirst({
      where: { id: req.params.id, companyId: req.user.companyId },
    })

    if (!existing) {
      return res.status(404).json({ error: 'Customer type not found' })
    }

    await prisma.customerType.delete({
      where: { id: existing.id },
    })

    return res.json({ ok: true })
  } catch (error) {
    if (error.code === 'P2003') {
      return res.status(409).json({ error: 'Customer type has related records' })
    }
    return next(error)
  }
})

export default router
