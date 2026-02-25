import express from 'express'
import prisma from '../lib/prisma.js'
import { requireAuth, requireRole } from '../lib/auth.js'

const router = express.Router()

// ==================== MIDDLEWARE ====================
// Only SUPER_ADMIN can access these endpoints
const requireSuperAdmin = (req, res, next) => {
  const user = req.user
  if (user.role !== 'SUPER_ADMIN') {
    return res.status(403).json({ error: 'সুপার এডমিন অনুমতি প্রয়োজন' })
  }
  next()
}

// ==================== DASHBOARD ====================

/**
 * GET /api/admin/dashboard/summary
 * সিস্টেম সংক্ষিপ্ত তথ্য (সব কোম্পানি মিলিয়ে)
 */
router.get('/dashboard/summary', requireAuth, requireSuperAdmin, async (req, res) => {
  try {
    const totalCompanies = await prisma.company.count()
    const totalUsers = await prisma.user.count()
    const totalCustomers = await prisma.customer.count()
    const activeSubscriptions = await prisma.companySubscription.count({
      where: { status: 'ACTIVE' },
    })

    // সব কোম্পানির মোট রাজস্ব
    const billData = await prisma.bill.findMany({
      select: {
        amount: true,
        status: true,
      },
    })

    const totalRevenue = billData.reduce((sum, bill) => sum + bill.amount, 0)
    const collectedRevenue = billData
      .filter((b) => b.status === 'PAID' || b.status === 'ADVANCE')
      .reduce((sum, bill) => sum + bill.amount, 0)
    const pendingRevenue = billData
      .filter((b) => b.status === 'DUE' || b.status === 'PARTIAL')
      .reduce((sum, bill) => sum + bill.amount, 0)

    // কোম্পানি সাবস্ক্রিপশন পরিসংখ্যান
    const subscriptionStatus = await prisma.companySubscription.groupBy({
      by: ['status'],
      _count: true,
    })

    res.json({
      data: {
        totalCompanies,
        totalUsers,
        totalCustomers,
        activeSubscriptions,
        totalRevenue,
        collectedRevenue,
        pendingRevenue,
        collectionRate: totalRevenue > 0 ? ((collectedRevenue / totalRevenue) * 100).toFixed(2) : 0,
        subscriptionStatus: subscriptionStatus.reduce(
          (acc, item) => ({ ...acc, [item.status]: item._count }),
          {}
        ),
      },
    })
  } catch (error) {
    console.error('Dashboard summary error:', error)
    res.status(500).json({ error: 'ড্যাশবোর্ড লোড করা যায়নি' })
  }
})

/**
 * GET /api/admin/analytics/overview
 * সিস্টেম বিশ্লেষণ (লাইভ ডাটা)
 */
router.get('/analytics/overview', requireAuth, requireSuperAdmin, async (req, res) => {
  try {
    const totalCompanies = await prisma.company.count()
    const totalUsers = await prisma.user.count()
    const totalCustomers = await prisma.customer.count()
    const activeSubscriptions = await prisma.companySubscription.count({
      where: { status: 'ACTIVE' },
    })

    const billData = await prisma.bill.findMany({
      select: {
        amount: true,
        status: true,
      },
    })

    const totalRevenue = billData.reduce((sum, bill) => sum + bill.amount, 0)
    const collectedRevenue = billData
      .filter((b) => b.status === 'PAID' || b.status === 'ADVANCE')
      .reduce((sum, bill) => sum + bill.amount, 0)
    const pendingRevenue = billData
      .filter((b) => b.status === 'DUE' || b.status === 'PARTIAL')
      .reduce((sum, bill) => sum + bill.amount, 0)

    const now = new Date()
    const currentStart = new Date(now)
    currentStart.setDate(currentStart.getDate() - 30)
    const previousStart = new Date(now)
    previousStart.setDate(previousStart.getDate() - 60)

    const currentCustomers = await prisma.customer.count({
      where: { createdAt: { gte: currentStart } },
    })
    const previousCustomers = await prisma.customer.count({
      where: { createdAt: { gte: previousStart, lt: currentStart } },
    })

    const customerGrowthRate =
      previousCustomers > 0
        ? Number((((currentCustomers - previousCustomers) / previousCustomers) * 100).toFixed(2))
        : currentCustomers > 0
          ? 100
          : 0

    const companyStats = await prisma.company.findMany({
      select: {
        id: true,
        name: true,
        _count: { select: { customers: true } },
      },
    })

    const revenueTotals = await prisma.bill.groupBy({
      by: ['companyId'],
      _sum: { amount: true },
    })

    const revenueCollected = await prisma.bill.groupBy({
      by: ['companyId'],
      _sum: { amount: true },
      where: { status: { in: ['PAID', 'ADVANCE'] } },
    })

    const totalMap = new Map(
      revenueTotals.map((item) => [item.companyId, item._sum.amount || 0])
    )
    const collectedMap = new Map(
      revenueCollected.map((item) => [item.companyId, item._sum.amount || 0])
    )

    const topCompanies = companyStats
      .map((company) => {
        const total = totalMap.get(company.id) || 0
        const collected = collectedMap.get(company.id) || 0
        const rate = total > 0 ? Math.round((collected / total) * 100) : 0
        return {
          id: company.id,
          name: company.name,
          customers: company._count.customers,
          totalRevenue: total,
          collectedRevenue: collected,
          collectionRate: rate,
        }
      })
      .sort((a, b) => b.customers - a.customers || b.collectionRate - a.collectionRate)
      .slice(0, 5)

    const lastBackup = await prisma.backupLog.findFirst({
      orderBy: { createdAt: 'desc' },
      select: { createdAt: true, status: true, backupName: true },
    })

    const lastActivity = await prisma.activityLog.findFirst({
      orderBy: { createdAt: 'desc' },
      select: { createdAt: true },
    })

    res.json({
      data: {
        summary: {
          totalCompanies,
          totalUsers,
          totalCustomers,
          activeSubscriptions,
          totalRevenue,
          collectedRevenue,
          pendingRevenue,
          collectionRate: totalRevenue > 0 ? Number(((collectedRevenue / totalRevenue) * 100).toFixed(2)) : 0,
        },
        customerGrowth: {
          current: currentCustomers,
          previous: previousCustomers,
          rate: customerGrowthRate,
        },
        systemHealth: {
          uptimeHours: Number((process.uptime() / 3600).toFixed(1)),
          lastBackupAt: lastBackup?.createdAt || null,
          lastBackupStatus: lastBackup?.status || null,
          lastBackupName: lastBackup?.backupName || null,
          lastActivityAt: lastActivity?.createdAt || null,
        },
        topCompanies,
      },
    })
  } catch (error) {
    console.error('Analytics overview error:', error)
    res.status(500).json({ error: 'বিশ্লেষণ লোড করা যায়নি' })
  }
})

// ==================== COMPANY MANAGEMENT ====================

/**
 * GET /api/admin/companies
 * সব কোম্পানি লিস্ট
 */
router.get('/companies', requireAuth, requireSuperAdmin, async (req, res) => {
  try {
    const { page = 1, limit = 20, status } = req.query

    const where = status ? { status } : {}
    const skip = (parseInt(page) - 1) * parseInt(limit)

    const companies = await prisma.company.findMany({
      where,
      include: {
        package: true,
        subscription: true,
        _count: {
          select: { users: true, customers: true, bills: true },
        },
      },
      skip,
      take: parseInt(limit),
      orderBy: { createdAt: 'desc' },
    })

    const total = await prisma.company.count({ where })

    res.json({
      data: companies.map((c) => ({
        id: c.id,
        name: c.name,
        status: c.status,
        packageName: c.package?.name,
        subscriptionStatus: c.subscription?.status,
        userCount: c._count.users,
        customerCount: c._count.customers,
        billCount: c._count.bills,
        createdAt: c.createdAt,
      })),
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit)),
      },
    })
  } catch (error) {
    console.error('Companies error:', error)
    res.status(500).json({ error: 'কোম্পানি লোড করা যায়নি' })
  }
})

/**
 * GET /api/admin/companies/:companyId
 * কোম্পানির বিস্তারিত তথ্য
 */
router.get('/companies/:companyId', requireAuth, requireSuperAdmin, async (req, res) => {
  try {
    const { companyId } = req.params

    const company = await prisma.company.findUnique({
      where: { id: companyId },
      include: {
        package: true,
        subscription: true,
        users: {
          select: {
            id: true,
            name: true,
            mobile: true,
            email: true,
            role: true,
            isActive: true,
            lastLogin: true,
          },
        },
        _count: {
          select: {
            users: true,
            customers: true,
            bills: true,
            areas: true,
          },
        },
      },
    })

    if (!company) {
      return res.status(404).json({ error: 'কোম্পানি খুঁজে পাওয়া যায়নি' })
    }

    res.json({ data: company })
  } catch (error) {
    console.error('Company detail error:', error)
    res.status(500).json({ error: 'কোম্পানি বিস্তারিত লোড করা যায়নি' })
  }
})

/**
 * POST /api/admin/companies
 * নতুন কোম্পানি তৈরি করা
 */
router.post('/companies', requireAuth, requireSuperAdmin, async (req, res) => {
  try {
    const { name, packageId, helplineNumber, address, slogan } = req.body

    if (!name || !packageId) {
      return res.status(400).json({ error: 'কোম্পানির নাম এবং প্যাকেজ প্রয়োজন' })
    }

    // Check if company already exists
    const existingCompany = await prisma.company.findUnique({
      where: { name },
    })

    if (existingCompany) {
      return res.status(409).json({ error: 'এই নামের কোম্পানি ইতিমধ্যে বিদ্যমান' })
    }

    // Create company
    const company = await prisma.company.create({
      data: {
        name,
        packageId,
        helplineNumber,
        address,
        slogan,
        status: 'TRIAL', // মনে রাখুন: নতুন কোম্পানি TRIAL থেকে শুরু হয়
      },
    })

    res.status(201).json({
      data: company,
      message: 'কোম্পানি সফলভাবে তৈরি হয়েছে',
    })
  } catch (error) {
    console.error('Company create error:', error)
    res.status(500).json({ error: 'কোম্পানি তৈরি করা যায়নি' })
  }
})

/**
 * PUT /api/admin/companies/:companyId
 * কোম্পানির তথ্য আপডেট করা
 */
router.put('/companies/:companyId', requireAuth, requireSuperAdmin, async (req, res) => {
  try {
    const { companyId } = req.params
    const { name, status, packageId, helplineNumber, address, slogan } = req.body

    // যাচাই করুন যে কোম্পানি বিদ্যমান
    const company = await prisma.company.findUnique({
      where: { id: companyId },
    })

    if (!company) {
      return res.status(404).json({ error: 'কোম্পানি খুঁজে পাওয়া যায়নি' })
    }

    // আপডেট করুন
    const updated = await prisma.company.update({
      where: { id: companyId },
      data: {
        ...(name && { name }),
        ...(status && { status }),
        ...(packageId && { packageId }),
        ...(helplineNumber && { helplineNumber }),
        ...(address && { address }),
        ...(slogan && { slogan }),
        updatedAt: new Date(),
      },
      include: { package: true, subscription: true },
    })

    res.json({
      data: updated,
      message: 'কোম্পানি সফলভাবে আপডেট হয়েছে',
    })
  } catch (error) {
    console.error('Company update error:', error)
    res.status(500).json({ error: 'কোম্পানি আপডেট করা যায়নি' })
  }
})

// ==================== USER MANAGEMENT ====================

/**
 * GET /api/admin/users
 * সব ইউজার লিস্ট (সব কোম্পানি থেকে)
 */
router.get('/users', requireAuth, requireSuperAdmin, async (req, res) => {
  try {
    const { page = 1, limit = 20, role, companyId } = req.query

    const where = {}
    if (role) where.role = role
    if (companyId) where.companyId = companyId

    const skip = (parseInt(page) - 1) * parseInt(limit)

    const users = await prisma.user.findMany({
      where,
      include: {
        company: { select: { id: true, name: true } },
      },
      skip,
      take: parseInt(limit),
      orderBy: { createdAt: 'desc' },
    })

    const total = await prisma.user.count({ where })

    res.json({
      data: users.map((u) => ({
        id: u.id,
        name: u.name,
        mobile: u.mobile,
        email: u.email,
        role: u.role,
        isActive: u.isActive,
        lastLogin: u.lastLogin,
        company: u.company,
        createdAt: u.createdAt,
      })),
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit)),
      },
    })
  } catch (error) {
    console.error('Users error:', error)
    res.status(500).json({ error: 'ইউজার লোড করা যায়নি' })
  }
})

/**
 * GET /api/admin/users/:userId
 * একটি ইউজারের বিস্তারিত তথ্য
 */
router.get('/users/:userId', requireAuth, requireSuperAdmin, async (req, res) => {
  try {
    const { userId } = req.params

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        company: true,
        managerPermissions: { include: { permission: true } },
      },
    })

    if (!user) {
      return res.status(404).json({ error: 'ইউজার খুঁজে পাওয়া যায়নি' })
    }

    res.json({ data: user })
  } catch (error) {
    console.error('User detail error:', error)
    res.status(500).json({ error: 'ইউজার বিস্তারিত লোড করা যায়নি' })
  }
})

/**
 * PUT /api/admin/users/:userId
 * ইউজার ডিঅ্যাক্টিভেট/অ্যাক্টিভেট করা
 */
router.put('/users/:userId', requireAuth, requireSuperAdmin, async (req, res) => {
  try {
    const { userId } = req.params
    const { isActive } = req.body

    const user = await prisma.user.update({
      where: { id: userId },
      data: { isActive },
      include: { company: true },
    })

    res.json({
      data: user,
      message: `ইউজার ${isActive ? 'সক্রিয় করা হয়েছে' : 'নিষ্ক্রিয় করা হয়েছে'}`,
    })
  } catch (error) {
    console.error('User update error:', error)
    res.status(500).json({ error: 'ইউজার আপডেট করা যায়নি' })
  }
})

// ==================== ACTIVITY LOG ====================

/**
 * GET /api/admin/activity-logs
 * সিস্টেম কার্যক্রম লগ
 */
router.get('/activity-logs', requireAuth, requireSuperAdmin, async (req, res) => {
  try {
    const { page = 1, limit = 50, userId, action, startDate, endDate } = req.query

    const where = {}
    if (userId) where.userId = userId
    if (action) where.action = action
    if (startDate || endDate) {
      where.createdAt = {}
      if (startDate) where.createdAt.gte = new Date(startDate)
      if (endDate) where.createdAt.lte = new Date(endDate)
    }

    const skip = (parseInt(page) - 1) * parseInt(limit)

    const logs = await prisma.activityLog.findMany({
      where,
      skip,
      take: parseInt(limit),
      orderBy: { createdAt: 'desc' },
    })

    const total = await prisma.activityLog.count({ where })

    res.json({
      data: logs,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit)),
      },
    })
  } catch (error) {
    console.error('Activity logs error:', error)
    res.status(500).json({ error: 'কার্যক্রম লগ লোড করা যায়নি' })
  }
})

// ==================== AUDIT TRAIL ====================

/**
 * GET /api/admin/audit-trail
 * পরিবর্তনের ইতিহাস (Audit Trail)
 */
router.get('/audit-trail', requireAuth, requireSuperAdmin, async (req, res) => {
  try {
    const { page = 1, limit = 50, tableName, recordId, startDate, endDate } = req.query

    const where = {}
    if (tableName) where.tableName = tableName
    if (recordId) where.recordId = recordId
    if (startDate || endDate) {
      where.changedAt = {}
      if (startDate) where.changedAt.gte = new Date(startDate)
      if (endDate) where.changedAt.lte = new Date(endDate)
    }

    const skip = (parseInt(page) - 1) * parseInt(limit)

    const trail = await prisma.auditTrail.findMany({
      where,
      skip,
      take: parseInt(limit),
      orderBy: { changedAt: 'desc' },
    })

    const total = await prisma.auditTrail.count({ where })

    res.json({
      data: trail,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit)),
      },
    })
  } catch (error) {
    console.error('Audit trail error:', error)
    res.status(500).json({ error: 'পরিবর্তনের ইতিহাস লোড করা যায়নি' })
  }
})

// ==================== SYSTEM SETTINGS ====================

/**
 * GET /api/admin/system-settings
 * সিস্টেম সেটিংস
 */
router.get('/system-settings', requireAuth, requireSuperAdmin, async (req, res) => {
  try {
    const settings = await prisma.systemSettings.findMany({
      orderBy: { category: 'asc' },
    })

    const grouped = settings.reduce((acc, setting) => {
      if (!acc[setting.category]) acc[setting.category] = []
      acc[setting.category].push(setting)
      return acc
    }, {})

    res.json({ data: grouped })
  } catch (error) {
    console.error('System settings error:', error)
    res.status(500).json({ error: 'সিস্টেম সেটিংস লোড করা যায়নি' })
  }
})

/**
 * POST /api/admin/system-settings
 * নতুন সিস্টেম সেটিংস তৈরি করা
 */
router.post('/system-settings', requireAuth, requireSuperAdmin, async (req, res) => {
  try {
    const { key, value, category, description, isEnvironment } = req.body

    if (!key || typeof value === 'undefined') {
      return res.status(400).json({ error: 'সেটিং কী এবং মান প্রয়োজন' })
    }

    const created = await prisma.systemSettings.create({
      data: {
        settingKey: key,
        settingValue: String(value),
        category: category || 'general',
        description: description || null,
        isEnvironment: Boolean(isEnvironment),
        updatedAt: new Date(),
      },
    })

    res.status(201).json({
      data: created,
      message: 'সেটিংস তৈরি হয়েছে',
    })
  } catch (error) {
    if (error?.code === 'P2002') {
      return res.status(409).json({ error: 'এই কী ইতিমধ্যে রয়েছে' })
    }
    console.error('Setting create error:', error)
    res.status(500).json({ error: 'সেটিংস তৈরি করা যায়নি' })
  }
})

/**
 * PUT /api/admin/system-settings/:key
 * সিস্টেম সেটিংস আপডেট করা
 */
router.put('/system-settings/:key', requireAuth, requireSuperAdmin, async (req, res) => {
  try {
    const { key } = req.params
    const { value, category, description, isEnvironment } = req.body

    const setting = await prisma.systemSettings.upsert({
      where: { settingKey: key },
      update: {
        ...(typeof value !== 'undefined' ? { settingValue: String(value) } : {}),
        ...(category ? { category } : {}),
        ...(typeof description !== 'undefined' ? { description } : {}),
        ...(typeof isEnvironment !== 'undefined' ? { isEnvironment: Boolean(isEnvironment) } : {}),
        updatedAt: new Date(),
      },
      create: {
        settingKey: key,
        settingValue: typeof value === 'undefined' ? '' : String(value),
        category: category || 'general',
        description: typeof description === 'undefined' ? null : description,
        isEnvironment: Boolean(isEnvironment),
      },
    })

    res.json({
      data: setting,
      message: 'সেটিংস আপডেট হয়েছে',
    })
  } catch (error) {
    console.error('Setting update error:', error)
    res.status(500).json({ error: 'সেটিংস আপডেট করা যায়নি' })
  }
})

// ==================== BACKUP MANAGEMENT ====================

/**
 * GET /api/admin/backups
 * ব্যাকআপ হিস্টরি
 */
router.get('/backups', requireAuth, requireSuperAdmin, async (req, res) => {
  try {
    const backups = await prisma.backupLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: 50,
    })

    res.json({ data: backups })
  } catch (error) {
    console.error('Backups error:', error)
    res.status(500).json({ error: 'ব্যাকআপ তথ্য লোড করা যায়নি' })
  }
})

// ==================== SUPPORT TICKETS ====================

/**
 * GET /api/admin/support-tickets
 * সব সাপোর্ট টিকেট
 */
router.get('/support-tickets', requireAuth, requireSuperAdmin, async (req, res) => {
  try {
    const { page = 1, limit = 20, status } = req.query

    const where = status ? { status } : {}
    const skip = (parseInt(page) - 1) * parseInt(limit)

    const tickets = await prisma.supportTicket.findMany({
      where,
      include: {
        company: { select: { id: true, name: true } },
      },
      skip,
      take: parseInt(limit),
      orderBy: { createdAt: 'desc' },
    })

    const total = await prisma.supportTicket.count({ where })

    res.json({
      data: tickets,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit)),
      },
    })
  } catch (error) {
    console.error('Support tickets error:', error)
    res.status(500).json({ error: 'টিকেট লোড করা যায়নি' })
  }
})

export default router
