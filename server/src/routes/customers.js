import express from 'express'
import multer from 'multer'
import xlsx from 'xlsx'
import { z } from 'zod'
import prisma from '../lib/prisma.js'
import { requireAuth, requireRole } from '../lib/auth.js'

const router = express.Router()
const bdMobileRegex = /^01[3-9]\d{8}$/
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 6 * 1024 * 1024 },
})

const normalizeKey = (value) =>
  String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[\s_-]+/g, '')

const normalizeValue = (value) => String(value || '').trim()

const headerMap = {
  customercode: 'customerCode',
  customerid: 'customerCode',
  code: 'customerCode',
  name: 'name',
  mobile: 'mobile',
  phone: 'mobile',
  address: 'address',
  area: 'area',
  areaname: 'area',
  customertype: 'customerType',
  type: 'customerType',
  billingtype: 'billingType',
  monthlyfee: 'monthlyFee',
  monthly: 'monthlyFee',
  duebalance: 'dueBalance',
  due: 'dueBalance',
  গ্রাহকআইডি: 'customerCode',
  গ্রাহককোড: 'customerCode',
  নাম: 'name',
  মোবাইল: 'mobile',
  ঠিকানা: 'address',
  এরিয়া: 'area',
  গ্রাহকটাইপ: 'customerType',
  বিলিংটাইপ: 'billingType',
  মাসিকবিল: 'monthlyFee',
  বকেয়াবিল: 'dueBalance',
}

const normalizeBillingType = (value) => {
  const raw = String(value || '').trim()
  if (!raw) return null
  const upper = raw.toUpperCase()
  if (['ACTIVE', 'FREE', 'CLOSED'].includes(upper)) return upper
  const mapped = {
    একটিভ: 'ACTIVE',
    ফ্রি: 'FREE',
    বন্ধ: 'CLOSED',
  }
  return mapped[raw] || null
}

const parseNumber = (value) => {
  if (value === null || value === undefined || value === '') return undefined
  const numberValue = Number(value)
  return Number.isNaN(numberValue) ? undefined : numberValue
}

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

const customerUpdateSchema = z.object({
  areaId: z.string().min(1),
  customerTypeId: z.string().min(1),
  customerCode: z.string().min(2).max(40),
  name: z.string().min(2).max(120),
  mobile: z.string().regex(bdMobileRegex).or(z.literal('')),
  address: z.string().max(200).optional().nullable(),
  billingType: z.enum(['ACTIVE', 'FREE', 'CLOSED']),
  monthlyFee: z.number().int().nonnegative().optional().nullable(),
  dueBalance: z.number().int().nonnegative().optional().nullable(),
  connectionDate: z.string().min(4),
})

router.get('/', requireAuth, requireRole(['ADMIN', 'MANAGER', 'COLLECTOR']), async (req, res, next) => {
  try {
    const { areaId, customerTypeId, billingType, q } = req.query
    let collectorAreaIds = null

    if (req.user.role === 'COLLECTOR') {
      const assignments = await prisma.collectorArea.findMany({
        where: { collectorId: req.user.userId, area: { companyId: req.user.companyId } },
        select: { areaId: true },
      })
      collectorAreaIds = assignments.map((item) => item.areaId)
      if (!collectorAreaIds.length) {
        return res.json({
          data: [],
          meta: { total: 0, page: 1, perPage: 0, totalPages: 1 },
        })
      }
    }
    const pageParam = Number(req.query.page || 1)
    const limitParam = req.query.limit
    const page = Number.isNaN(pageParam) || pageParam < 1 ? 1 : pageParam
    const isAll = String(limitParam || '').toLowerCase() === 'all'
    const perPage = isAll
      ? null
      : (() => {
          const parsed = Number(limitParam || 50)
          if (Number.isNaN(parsed) || parsed < 1) return 50
          return Math.min(parsed, 200)
        })()

    const where = {
      companyId: req.user.companyId,
    }

    if (areaId) {
      if (collectorAreaIds && !collectorAreaIds.includes(areaId)) {
        return res.json({
          data: [],
          meta: { total: 0, page: 1, perPage: 0, totalPages: 1 },
        })
      }
      where.areaId = areaId
    } else if (collectorAreaIds) {
      where.areaId = { in: collectorAreaIds }
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
        { name: { contains: needle } },
        { mobile: { contains: needle } },
        { customerCode: { contains: needle } },
      ]
    }

    const [customers, total] = await Promise.all([
      prisma.customer.findMany({
        where,
        include: {
          area: { select: { id: true, name: true } },
          customerType: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: perPage ? (page - 1) * perPage : undefined,
        take: perPage || undefined,
      }),
      prisma.customer.count({ where }),
    ])

    const totalPages = perPage ? Math.max(1, Math.ceil(total / perPage)) : 1

    res.json({
      data: customers,
      meta: {
        total,
        page,
        perPage: perPage || total || customers.length,
        totalPages,
      },
    })
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

router.post(
  '/import',
  requireAuth,
  requireRole(['ADMIN', 'MANAGER']),
  upload.single('file'),
  async (req, res, next) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'Excel file is required' })
      }

      const allowMissingMobile = req.body.allowMissingMobile === 'true'

      let workbook
      try {
        workbook = xlsx.read(req.file.buffer, { type: 'buffer' })
      } catch (error) {
        return res.status(400).json({ error: 'Invalid Excel file' })
      }

      const sheetName = workbook.SheetNames[0]
      if (!sheetName) {
        return res.status(400).json({ error: 'Excel sheet not found' })
      }

      const sheet = workbook.Sheets[sheetName]
      const rawRows = xlsx.utils.sheet_to_json(sheet, { defval: '' })
      if (!rawRows.length) {
        return res.status(400).json({ error: 'No rows found in the Excel sheet' })
      }

      const [areas, types, existing] = await Promise.all([
        prisma.area.findMany({
          where: { companyId: req.user.companyId },
          select: { id: true, name: true },
        }),
        prisma.customerType.findMany({
          where: { companyId: req.user.companyId },
          select: { id: true, name: true },
        }),
        prisma.customer.findMany({
          where: { companyId: req.user.companyId },
          select: { customerCode: true, mobile: true },
        }),
      ])

      const areaMap = new Map(
        areas.map((area) => [normalizeKey(area.name), area.id])
      )
      const typeMap = new Map(
        types.map((type) => [normalizeKey(type.name), type.id])
      )
      const existingCodes = new Set(
        existing.map((item) => normalizeValue(item.customerCode).toLowerCase())
      )
      const existingMobiles = new Set(
        existing
          .map((item) => normalizeValue(item.mobile))
          .filter((value) => value)
      )

      let created = 0
      let skipped = 0
      let failed = 0
      const errors = []

      for (let index = 0; index < rawRows.length; index += 1) {
        const row = rawRows[index]
        const rowNumber = index + 2
        const mapped = {}

        Object.entries(row).forEach(([key, value]) => {
          const normalizedKey = normalizeKey(key)
          const field = headerMap[normalizedKey]
          if (field) {
            mapped[field] = value
          }
        })

        const customerCode = normalizeValue(mapped.customerCode)
        const name = normalizeValue(mapped.name)
        const mobile = normalizeValue(mapped.mobile)
        const billingType = normalizeBillingType(mapped.billingType) || 'ACTIVE'
        const areaName = normalizeKey(mapped.area)
        const typeName = normalizeKey(mapped.customerType)

        if (!customerCode || !name || !areaName || !typeName || (!mobile && !allowMissingMobile)) {
          failed += 1
          errors.push({ row: rowNumber, reason: 'Required fields missing' })
          continue
        }

        if (mobile && !bdMobileRegex.test(mobile)) {
          failed += 1
          errors.push({ row: rowNumber, reason: 'Invalid mobile number' })
          continue
        }

        if (!['ACTIVE', 'FREE', 'CLOSED'].includes(billingType)) {
          failed += 1
          errors.push({ row: rowNumber, reason: 'Invalid billing type' })
          continue
        }

        const areaId = areaMap.get(areaName)
        const customerTypeId = typeMap.get(typeName)

        if (!areaId || !customerTypeId) {
          failed += 1
          errors.push({ row: rowNumber, reason: 'Area or customer type not found' })
          continue
        }

        const codeKey = customerCode.toLowerCase()
        if (existingCodes.has(codeKey) || (mobile && existingMobiles.has(mobile))) {
          skipped += 1
          continue
        }

        const monthlyFee = parseNumber(mapped.monthlyFee)
        const dueBalance = parseNumber(mapped.dueBalance) ?? 0

        try {
          await prisma.customer.create({
            data: {
              companyId: req.user.companyId,
              areaId,
              customerTypeId,
              customerCode,
              name,
              mobile: mobile || '',
              address: normalizeValue(mapped.address) || null,
              billingType,
              monthlyFee: billingType === 'ACTIVE' ? monthlyFee ?? 0 : null,
              dueBalance,
              connectionDate: new Date(),
              createdById: req.user.userId,
            },
          })
          created += 1
          existingCodes.add(codeKey)
          if (mobile) existingMobiles.add(mobile)
        } catch (error) {
          if (error.code === 'P2002') {
            skipped += 1
          } else {
            failed += 1
            errors.push({ row: rowNumber, reason: 'Database error' })
          }
        }
      }

      return res.json({
        summary: {
          total: rawRows.length,
          created,
          skipped,
          failed,
        },
        errors: errors.slice(0, 10),
      })
    } catch (error) {
      return next(error)
    }
  }
)

router.patch('/:id', requireAuth, requireRole(['ADMIN', 'MANAGER']), async (req, res, next) => {
  try {
    const parsed = customerUpdateSchema.safeParse(req.body)
    if (!parsed.success) {
      return res.status(400).json({ error: 'Invalid input', details: parsed.error.issues })
    }

    const existing = await prisma.customer.findFirst({
      where: { id: req.params.id, companyId: req.user.companyId },
    })

    if (!existing) {
      return res.status(404).json({ error: 'Customer not found' })
    }

    const payload = parsed.data
    const connectionDate = new Date(payload.connectionDate)
    if (Number.isNaN(connectionDate.getTime())) {
      return res.status(400).json({ error: 'Invalid connection date' })
    }

    const monthlyFee = payload.billingType === 'ACTIVE'
      ? payload.monthlyFee ?? 0
      : null

    const customer = await prisma.customer.update({
      where: { id: existing.id },
      data: {
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
      },
    })

    return res.json({ data: customer })
  } catch (error) {
    if (error.code === 'P2002') {
      return res.status(409).json({ error: 'Customer already exists' })
    }
    return next(error)
  }
})

router.delete('/:id', requireAuth, requireRole(['ADMIN', 'MANAGER']), async (req, res, next) => {
  try {
    const existing = await prisma.customer.findFirst({
      where: { id: req.params.id, companyId: req.user.companyId },
    })

    if (!existing) {
      return res.status(404).json({ error: 'Customer not found' })
    }

    await prisma.customer.delete({ where: { id: existing.id } })

    return res.json({ ok: true })
  } catch (error) {
    if (error.code === 'P2003') {
      return res.status(409).json({ error: 'Customer has related records' })
    }
    return next(error)
  }
})

export default router
