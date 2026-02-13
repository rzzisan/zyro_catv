import express from 'express'
import bcrypt from 'bcryptjs'
import { z } from 'zod'
import prisma from '../lib/prisma.js'
import { requireAuth, requireRole } from '../lib/auth.js'

const router = express.Router()
const bdMobileRegex = /^01[3-9]\d{8}$/

const userSchema = z.object({
  name: z.string().min(2).max(80),
  mobile: z.string().regex(bdMobileRegex),
  password: z.string().min(6).max(100),
})

async function listUsersByRole(companyId, role) {
  const users = await prisma.user.findMany({
    where: { companyId, role },
    orderBy: { createdAt: 'desc' },
  })

  return users.map((user) => ({
    id: user.id,
    name: user.name,
    mobile: user.mobile,
    isActive: user.isActive,
  }))
}

async function createUser(companyId, role, payload) {
  const passwordHash = await bcrypt.hash(payload.password, 10)
  const user = await prisma.user.create({
    data: {
      companyId,
      role,
      name: payload.name,
      mobile: payload.mobile,
      passwordHash,
    },
  })

  return {
    id: user.id,
    name: user.name,
    mobile: user.mobile,
    isActive: user.isActive,
  }
}

router.get('/managers', requireAuth, requireRole(['ADMIN']), async (req, res, next) => {
  try {
    const data = await listUsersByRole(req.user.companyId, 'MANAGER')
    res.json({ data })
  } catch (error) {
    next(error)
  }
})

router.post('/managers', requireAuth, requireRole(['ADMIN']), async (req, res, next) => {
  try {
    const parsed = userSchema.safeParse(req.body)
    if (!parsed.success) {
      return res.status(400).json({ error: 'Invalid input', details: parsed.error.issues })
    }

    const data = await createUser(req.user.companyId, 'MANAGER', parsed.data)
    res.status(201).json({ data })
  } catch (error) {
    if (error.code === 'P2002') {
      return res.status(409).json({ error: 'Mobile already registered' })
    }
    return next(error)
  }
})

router.get('/collectors', requireAuth, requireRole(['ADMIN', 'MANAGER']), async (req, res, next) => {
  try {
    const data = await listUsersByRole(req.user.companyId, 'COLLECTOR')
    res.json({ data })
  } catch (error) {
    next(error)
  }
})

router.post('/collectors', requireAuth, requireRole(['ADMIN', 'MANAGER']), async (req, res, next) => {
  try {
    const parsed = userSchema.safeParse(req.body)
    if (!parsed.success) {
      return res.status(400).json({ error: 'Invalid input', details: parsed.error.issues })
    }

    const data = await createUser(req.user.companyId, 'COLLECTOR', parsed.data)
    res.status(201).json({ data })
  } catch (error) {
    if (error.code === 'P2002') {
      return res.status(409).json({ error: 'Mobile already registered' })
    }
    return next(error)
  }
})

export default router
