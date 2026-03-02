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
      deletedAt: null, // Exclude soft-deleted customers
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

    // যদি opening/arrear due (dueBalance) থাকে, তাহলে এই মাসে একটি bill তৈরি করি
    if ((payload.dueBalance ?? 0) > 0) {
      const now = new Date()
      const month = now.getMonth() + 1
      const year = now.getFullYear()
      
      try {
        await prisma.bill.create({
          data: {
            companyId: req.user.companyId,
            customerId: customer.id,
            periodMonth: month,
            periodYear: year,
            amount: payload.dueBalance,
            status: 'DUE',
          },
        })
      } catch (billError) {
        // যদি এই মাসে বিল ইতিমধ্যে exist করে, তাহলে skip করি (duplicate key error)
        if (billError.code !== 'P2002') {
          console.error('Opening bill creation error:', billError)
        }
      }
    }

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
          where: { companyId: req.user.companyId, deletedAt: null },
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

      let created = 0
      let skipped = 0
      let failed = 0
      const errors = []
      const skippedRecords = []

      // Current month/year for opening bills
      const now = new Date()
      const currentMonth = now.getMonth() + 1
      const currentYear = now.getFullYear()

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
        if (existingCodes.has(codeKey)) {
          skipped += 1
          const reason = 'Duplicate customer code'
          skippedRecords.push({
            row: rowNumber,
            customerCode,
            name,
            mobile: mobile || '',
            area: mapped.area,
            customerType: mapped.customerType,
            reason,
          })
          continue
        }

        const monthlyFee = parseNumber(mapped.monthlyFee)
        const dueBalance = parseNumber(mapped.dueBalance) ?? 0

        try {
          const newCustomer = await prisma.customer.create({
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

          // যদি opening/arrear due (dueBalance) থাকে, তাহলে চলতি মাসে একটি bill তৈরি করি
          if (dueBalance > 0) {
            try {
              await prisma.bill.create({
                data: {
                  companyId: req.user.companyId,
                  customerId: newCustomer.id,
                  periodMonth: currentMonth,
                  periodYear: currentYear,
                  amount: dueBalance,
                  status: 'DUE',
                },
              })
            } catch (billError) {
              // Duplicate bill ignore করি
              if (billError.code !== 'P2002') {
                console.error('Opening bill creation error (import):', billError)
              }
            }
          }
        } catch (error) {
          if (error.code === 'P2002') {
            skipped += 1
            skippedRecords.push({
              row: rowNumber,
              customerCode,
              name,
              mobile: mobile || '',
              area: mapped.area,
              customerType: mapped.customerType,
              reason: 'Database duplicate constraint',
            })
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
        skippedRecords: skippedRecords.slice(0, 50),
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
      where: { id: req.params.id, companyId: req.user.companyId, deletedAt: null },
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
    if (req.params.id === 'cleanup-all') {
      return next()
    }

    const existing = await prisma.customer.findFirst({
      where: { id: req.params.id, companyId: req.user.companyId, deletedAt: null },
      include: { bills: { select: { id: true } } },
    })

    if (!existing) {
      return res.status(404).json({ error: 'Customer not found' })
    }

    if (existing.deletedAt) {
      return res.status(409).json({ error: 'Customer already deleted' })
    }

    const suffix = `__DEL__${existing.id.slice(-10)}`
    const maxCodeLength = 191
    const baseLength = Math.max(0, maxCodeLength - suffix.length)
    const archivedCustomerCode = `${String(existing.customerCode || '').slice(0, baseLength)}${suffix}`

    // Soft delete - গ্রাহক soft delete করি কিন্তু বিল থেকে যায়
    await prisma.customer.update({
      where: { id: existing.id },
      data: {
        deletedAt: new Date(),
        customerCode: archivedCustomerCode,
      },
    })

    // Audit trail - deletion রেকর্ড করি
    try {
      await prisma.activityLog.create({
        data: {
          userId: req.user.userId,
          action: 'DELETE',
          entityType: 'Customer',
          entityId: existing.id,
          oldData: {
            id: existing.id,
            name: existing.name,
            customerCode: existing.customerCode,
            mobile: existing.mobile,
          },
          status: 'SUCCESS',
          companyId: req.user.companyId,
        },
      })
    } catch (logError) {
      console.error('Activity log error:', logError)
    }

    return res.json({ ok: true, message: 'গ্রাহক সফলভাবে ডিলিট হয়েছে। বিল ও পেমেন্ট রেকর্ড থেকে যাবে।' })
  } catch (error) {
    return next(error)
  }
})

router.get('/:id', requireAuth, requireRole(['ADMIN', 'MANAGER', 'COLLECTOR']), async (req, res, next) => {
  try {
    const customer = await prisma.customer.findFirst({
      where: { id: req.params.id, companyId: req.user.companyId, deletedAt: null },
      include: {
        area: { select: { id: true, name: true } },
        customerType: { select: { id: true, name: true } },
      },
    })

    if (!customer) {
      return res.status(404).json({ error: 'Customer not found' })
    }

    if (req.user.role === 'COLLECTOR') {
      const assignments = await prisma.collectorArea.findMany({
        where: { collectorId: req.user.userId, area: { companyId: req.user.companyId } },
        select: { areaId: true },
      })
      const areaIds = assignments.map((item) => item.areaId)
      if (!areaIds.includes(customer.areaId)) {
        return res.status(403).json({ error: 'Forbidden' })
      }
    }

    const bills = await prisma.bill.findMany({
      where: { customerId: customer.id },
      orderBy: [
        { periodYear: 'desc' },
        { periodMonth: 'desc' },
      ],
    })

    const billIds = bills.map((bill) => bill.id)
    const allocations = billIds.length
      ? await prisma.paymentAllocation.findMany({
          where: { billId: { in: billIds } },
          select: { billId: true, amount: true, paymentId: true },
        })
      : []

    const allocationMap = allocations.reduce((acc, row) => {
      acc[row.billId] = (acc[row.billId] || 0) + row.amount
      return acc
    }, {})

    const billsWithPaid = bills.map((bill) => ({
      ...bill,
      paidTotal: allocationMap[bill.id] || 0,
    }))

    const payments = await prisma.payment.findMany({
      where: { bill: { customerId: customer.id } },
      include: {
        collectedBy: { select: { id: true, name: true } },
        bill: { select: { periodMonth: true, periodYear: true } },
      },
      orderBy: { paidAt: 'desc' },
    })

    const totalGenerated = bills.reduce((sum, bill) => sum + bill.amount, 0)
    const totalCollected = payments.reduce((sum, payment) => sum + payment.amount, 0)
    const totalDue = totalGenerated - totalCollected

    return res.json({
      data: {
        customer,
        bills: billsWithPaid,
        payments,
        summary: {
          totalGenerated,
          totalCollected,
          totalDue,
        },
      },
    })
  } catch (error) {
    return next(error)
  }
})

// Admin: Hard delete all customers and related data for testing
router.delete('/cleanup-all', requireAuth, requireRole(['ADMIN']), async (req, res, next) => {
  try {
    const { companyId } = req.user

    const result = await prisma.$transaction(async (tx) => {
      const bills = await tx.bill.findMany({
        where: { companyId },
        select: { id: true },
      })
      const billIds = bills.map((bill) => bill.id)

      const paymentIds = billIds.length
        ? (await tx.payment.findMany({
            where: { billId: { in: billIds } },
            select: { id: true },
          })).map((payment) => payment.id)
        : []

      const deletedBillLogs = await tx.$executeRawUnsafe(
        'DELETE bul FROM BillUpdateLog bul INNER JOIN Customer c ON c.id = bul.customerId WHERE c.companyId = ?',
        companyId
      )

      const deletedAllocations = billIds.length
        ? await tx.paymentAllocation.deleteMany({ where: { billId: { in: billIds } } })
        : { count: 0 }

      const deletedPayments = billIds.length
        ? await tx.payment.deleteMany({ where: { billId: { in: billIds } } })
        : { count: 0 }

      const deletedBills = await tx.bill.deleteMany({ where: { companyId } })
      const deletedCustomers = await tx.customer.deleteMany({ where: { companyId } })

      return {
        deletedBillLogs,
        deletedAllocations: deletedAllocations.count,
        deletedPayments: deletedPayments.count,
        deletedBills: deletedBills.count,
        deletedCustomers: deletedCustomers.count,
        touchedPaymentIds: paymentIds.length,
      }
    })

    res.json({
      success: true,
      message: 'সকল গ্রাহক এবং সংশ্লিষ্ট ডাটা মুছে ফেলা হয়েছে',
      summary: result,
    })
  } catch (error) {
    return next(error)
  }
})

export default router
