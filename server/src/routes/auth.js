import express from 'express'
import bcrypt from 'bcryptjs'
import { z } from 'zod'
import prisma from '../lib/prisma.js'
import { signToken } from '../lib/auth.js'

const router = express.Router()

const bdMobileRegex = /^01[3-9]\d{8}$/

const registerSchema = z.object({
  name: z.string().min(2).max(80),
  companyName: z.string().min(2).max(120),
  mobile: z.string().regex(bdMobileRegex),
  password: z.string().min(6).max(100),
  email: z.string().email().optional().or(z.literal('')),
  packageId: z.string().optional().nullable(),
})

const loginSchema = z.object({
  mobile: z.string().regex(bdMobileRegex),
  password: z.string().min(6).max(100),
  rememberMe: z.boolean().optional(),
})

router.post('/register-company', async (req, res) => {
  const parsed = registerSchema.safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json({ error: 'Invalid input', details: parsed.error.issues })
  }

  const { name, companyName, mobile, password, email, packageId } = parsed.data

  const existingUser = await prisma.user.findFirst({
    where: {
      mobile,
    },
  })

  if (existingUser) {
    return res.status(409).json({ error: 'Mobile already registered' })
  }

  const passwordHash = await bcrypt.hash(password, 10)

  const company = await prisma.company.create({
    data: {
      name: companyName,
      packageId: packageId || null,
      users: {
        create: {
          role: 'ADMIN',
          name,
          mobile,
          email: email || null,
          passwordHash,
        },
      },
    },
    include: {
      users: true,
    },
  })

  const adminUser = company.users[0]
  const token = signToken({
    userId: adminUser.id,
    role: adminUser.role,
    companyId: adminUser.companyId,
  })

  return res.status(201).json({
    token,
    user: {
      id: adminUser.id,
      name: adminUser.name,
      mobile: adminUser.mobile,
      role: adminUser.role,
      companyId: adminUser.companyId,
    },
    company: {
      id: company.id,
      name: company.name,
    },
  })
})

router.post('/login', async (req, res) => {
  const parsed = loginSchema.safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json({ error: 'Invalid input', details: parsed.error.issues })
  }

  const { mobile, password, rememberMe } = parsed.data

  const user = await prisma.user.findFirst({
    where: {
      mobile,
      isActive: true,
    },
  })

  if (!user) {
    return res.status(401).json({ error: 'Invalid credentials' })
  }

  const match = await bcrypt.compare(password, user.passwordHash)
  if (!match) {
    return res.status(401).json({ error: 'Invalid credentials' })
  }

  const token = signToken({
    userId: user.id,
    role: user.role,
    companyId: user.companyId,
  }, rememberMe)

  return res.json({
    token,
    user: {
      id: user.id,
      name: user.name,
      mobile: user.mobile,
      role: user.role,
      companyId: user.companyId,
    },
  })
})

export default router
