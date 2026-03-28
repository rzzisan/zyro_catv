import express from 'express'
import { z } from 'zod'
import prisma from '../lib/prisma.js'
import { requireAuth, requireRole } from '../lib/auth.js'

const router = express.Router()
const bdMobileRegex = /^01[3-9]\d{8}$/

const createTicketSchema = z.object({
  guestTicket: z.boolean().optional(),
  customerId: z.string().optional(),
  customerName: z.string().max(120).optional(),
  customerCode: z.string().max(40).optional(),
  customerMobile: z.string().optional(),
  customerStbId: z.string().max(50).optional(),
  customerAddress: z.string().max(250).optional(),
  areaName: z.string().max(80).optional(),
  customerTypeName: z.string().max(80).optional(),
  category: z.string().min(2).max(80),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).optional(),
  description: z.string().min(3).max(250),
  alternateMobile: z.string().max(20).optional().nullable(),
})

const generateTicketNumber = () => {
  const now = new Date()
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  const d = String(now.getDate()).padStart(2, '0')
  const rand = Math.floor(1000 + Math.random() * 9000)
  return `TKT-${y}${m}${d}-${rand}`
}

router.get('/', requireAuth, requireRole(['ADMIN', 'MANAGER', 'COLLECTOR']), async (req, res, next) => {
  try {
    const { status, priority, category, q, guest } = req.query
    const where = {
      companyId: req.user.companyId,
    }

    if (status) where.status = String(status)
    if (priority) where.priority = String(priority)
    if (category) where.category = String(category)
    if (String(guest) === 'true') where.isGuest = true
    if (String(guest) === 'false') where.isGuest = false

    if (q) {
      const needle = String(q)
      where.OR = [
        { ticketNumber: { contains: needle } },
        { title: { contains: needle } },
        { description: { contains: needle } },
        { customerName: { contains: needle } },
        { customerCode: { contains: needle } },
        { customerMobile: { contains: needle } },
        { customerStbId: { contains: needle } },
      ]
    }

    const rows = await prisma.supportTicket.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 200,
    })

    return res.json({ data: rows })
  } catch (error) {
    return next(error)
  }
})

router.post('/', requireAuth, requireRole(['ADMIN', 'MANAGER', 'COLLECTOR']), async (req, res, next) => {
  try {
    const parsed = createTicketSchema.safeParse(req.body)
    if (!parsed.success) {
      return res.status(400).json({ error: 'Invalid input', details: parsed.error.issues })
    }

    const payload = parsed.data
    const isGuest = Boolean(payload.guestTicket)

    if (payload.alternateMobile && !bdMobileRegex.test(String(payload.alternateMobile))) {
      return res.status(400).json({ error: 'Invalid alternate mobile' })
    }

    const ticketData = {
      companyId: req.user.companyId,
      createdById: req.user.userId,
      isGuest,
      category: payload.category.trim(),
      priority: payload.priority || 'MEDIUM',
      description: payload.description.trim(),
      title: `${payload.category.trim()} সমস্যা`,
      status: 'OPEN',
      alternateMobile: payload.alternateMobile ? String(payload.alternateMobile).trim() : null,
    }

    if (isGuest) {
      const guestName = String(payload.customerName || '').trim()
      const guestMobile = String(payload.customerMobile || '').trim()
      const guestAddress = String(payload.customerAddress || '').trim()

      if (!guestName || !guestMobile || !guestAddress) {
        return res.status(400).json({ error: 'Guest ticket requires name, mobile and address' })
      }
      if (!bdMobileRegex.test(guestMobile)) {
        return res.status(400).json({ error: 'Invalid guest mobile' })
      }

      ticketData.customerName = guestName
      ticketData.customerCode = String(payload.customerCode || '').trim() || null
      ticketData.customerMobile = guestMobile
      ticketData.customerStbId = String(payload.customerStbId || '').trim() || null
      ticketData.customerAddress = guestAddress
      ticketData.areaName = String(payload.areaName || '').trim() || null
      ticketData.customerTypeName = String(payload.customerTypeName || '').trim() || null
    } else {
      if (!payload.customerId) {
        return res.status(400).json({ error: 'Customer নির্বাচন করা আবশ্যক' })
      }

      const customer = await prisma.customer.findFirst({
        where: {
          id: payload.customerId,
          companyId: req.user.companyId,
          deletedAt: null,
        },
        include: {
          area: { select: { name: true } },
          customerType: { select: { name: true } },
        },
      })

      if (!customer) {
        return res.status(404).json({ error: 'Customer not found' })
      }

      ticketData.customerId = customer.id
      ticketData.customerName = customer.name
      ticketData.customerCode = customer.customerCode
      ticketData.customerMobile = customer.mobile
      ticketData.customerStbId = customer.stbId || null
      ticketData.customerAddress = customer.address || null
      ticketData.areaName = customer.area?.name || null
      ticketData.customerTypeName = customer.customerType?.name || null
    }

    let created = null
    for (let i = 0; i < 5; i += 1) {
      try {
        created = await prisma.supportTicket.create({
          data: {
            ...ticketData,
            ticketNumber: generateTicketNumber(),
          },
        })
        break
      } catch (error) {
        if (error.code !== 'P2002') throw error
      }
    }

    if (!created) {
      return res.status(500).json({ error: 'Ticket number generation failed' })
    }

    return res.status(201).json({ data: created })
  } catch (error) {
    return next(error)
  }
})

export default router
