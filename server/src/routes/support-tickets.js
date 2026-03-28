import express from 'express'
import { z } from 'zod'
import prisma from '../lib/prisma.js'
import { requireAuth, requireRole } from '../lib/auth.js'

const router = express.Router()
const bdMobileRegex = /^01[3-9]\d{8}$/

const uiToDbStatus = {
  PENDING: ['OPEN'],
  PROCESSING: ['IN_PROGRESS', 'ESCALATED'],
  COMPLETED: ['RESOLVED', 'CLOSED'],
}

const normalizeStatus = (status) => {
  if (status === 'OPEN') return 'PENDING'
  if (status === 'IN_PROGRESS' || status === 'ESCALATED') return 'PROCESSING'
  if (status === 'RESOLVED' || status === 'CLOSED') return 'COMPLETED'
  return 'PENDING'
}

const startOfToday = () => {
  const now = new Date()
  return new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0)
}

const startOfTomorrow = () => {
  const today = startOfToday()
  return new Date(today.getTime() + 24 * 60 * 60 * 1000)
}

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

const updateTicketSchema = z.object({
  category: z.string().min(2).max(80).optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).optional(),
  description: z.string().min(3).max(250).optional(),
  alternateMobile: z.string().max(20).optional().nullable(),
})

const updateStatusSchema = z.object({
  status: z.enum(['PENDING', 'PROCESSING', 'COMPLETED']),
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
    const { status, priority, category, q, guest, view } = req.query
    const mode = String(view || 'active').toLowerCase()
    const todayStart = startOfToday()
    const tomorrowStart = startOfTomorrow()
    const filters = []

    if (priority) filters.push({ priority: String(priority) })
    if (category) filters.push({ category: String(category) })
    if (String(guest) === 'true') filters.push({ isGuest: true })
    if (String(guest) === 'false') filters.push({ isGuest: false })

    const uiStatus = String(status || '').toUpperCase()
    const statusIn = uiToDbStatus[uiStatus]
    if (statusIn) {
      filters.push({ status: { in: statusIn } })
    }

    if (q) {
      const needle = String(q)
      filters.push({
        OR: [
          { ticketNumber: { contains: needle } },
          { title: { contains: needle } },
          { description: { contains: needle } },
          { customerName: { contains: needle } },
          { customerCode: { contains: needle } },
          { customerMobile: { contains: needle } },
          { customerStbId: { contains: needle } },
        ],
      })
    }

    if (mode === 'history') {
      filters.push({
        status: { in: uiToDbStatus.COMPLETED },
      })
      filters.push({
        OR: [
          { resolvedAt: { lt: todayStart } },
          {
            AND: [
              { resolvedAt: null },
              { updatedAt: { lt: todayStart } },
            ],
          },
        ],
      })
    } else {
      filters.push({
        OR: [
          { status: { in: [...uiToDbStatus.PENDING, ...uiToDbStatus.PROCESSING] } },
          {
            AND: [
              { status: { in: uiToDbStatus.COMPLETED } },
              {
                OR: [
                  { resolvedAt: { gte: todayStart, lt: tomorrowStart } },
                  {
                    AND: [
                      { resolvedAt: null },
                      { updatedAt: { gte: todayStart, lt: tomorrowStart } },
                    ],
                  },
                ],
              },
            ],
          },
        ],
      })
    }

    const where = {
      companyId: req.user.companyId,
      AND: filters,
    }

    const rows = await prisma.supportTicket.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 200,
    })

    const normalizedRows = rows.map((row) => ({
      ...row,
      status: normalizeStatus(row.status),
    }))

    return res.json({ data: normalizedRows })
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

    return res.status(201).json({
      data: {
        ...created,
        status: normalizeStatus(created.status),
      },
    })
  } catch (error) {
    return next(error)
  }
})

router.patch('/:id/status', requireAuth, requireRole(['ADMIN', 'MANAGER']), async (req, res, next) => {
  try {
    const parsed = updateStatusSchema.safeParse(req.body)
    if (!parsed.success) {
      return res.status(400).json({ error: 'Invalid status', details: parsed.error.issues })
    }

    const ticket = await prisma.supportTicket.findFirst({
      where: {
        id: req.params.id,
        companyId: req.user.companyId,
      },
      select: { id: true },
    })

    if (!ticket) {
      return res.status(404).json({ error: 'Ticket not found' })
    }

    const nextStatus = parsed.data.status
    const dbStatus = nextStatus === 'PENDING'
      ? 'OPEN'
      : nextStatus === 'PROCESSING'
        ? 'IN_PROGRESS'
        : 'RESOLVED'

    const updated = await prisma.supportTicket.update({
      where: { id: req.params.id },
      data: {
        status: dbStatus,
        resolvedAt: nextStatus === 'COMPLETED' ? new Date() : null,
      },
    })

    return res.json({
      data: {
        ...updated,
        status: normalizeStatus(updated.status),
      },
    })
  } catch (error) {
    return next(error)
  }
})

router.patch('/:id', requireAuth, requireRole(['ADMIN', 'MANAGER']), async (req, res, next) => {
  try {
    const parsed = updateTicketSchema.safeParse(req.body)
    if (!parsed.success) {
      return res.status(400).json({ error: 'Invalid input', details: parsed.error.issues })
    }

    const payload = parsed.data
    const updateData = {}

    if (payload.category !== undefined) {
      updateData.category = payload.category.trim()
      updateData.title = `${payload.category.trim()} সমস্যা`
    }
    if (payload.priority !== undefined) updateData.priority = payload.priority
    if (payload.description !== undefined) updateData.description = payload.description.trim()
    if (payload.alternateMobile !== undefined) {
      const mobile = payload.alternateMobile ? String(payload.alternateMobile).trim() : null
      if (mobile && !bdMobileRegex.test(mobile)) {
        return res.status(400).json({ error: 'Invalid alternate mobile' })
      }
      updateData.alternateMobile = mobile
    }

    if (!Object.keys(updateData).length) {
      return res.status(400).json({ error: 'No changes provided' })
    }

    const ticket = await prisma.supportTicket.findFirst({
      where: {
        id: req.params.id,
        companyId: req.user.companyId,
      },
      select: { id: true },
    })

    if (!ticket) {
      return res.status(404).json({ error: 'Ticket not found' })
    }

    const updated = await prisma.supportTicket.update({
      where: { id: req.params.id },
      data: updateData,
    })

    return res.json({
      data: {
        ...updated,
        status: normalizeStatus(updated.status),
      },
    })
  } catch (error) {
    return next(error)
  }
})

router.delete('/:id', requireAuth, requireRole(['ADMIN', 'MANAGER']), async (req, res, next) => {
  try {
    const deleted = await prisma.supportTicket.deleteMany({
      where: {
        id: req.params.id,
        companyId: req.user.companyId,
      },
    })

    if (!deleted.count) {
      return res.status(404).json({ error: 'Ticket not found' })
    }

    return res.json({ ok: true })
  } catch (error) {
    return next(error)
  }
})

export default router
