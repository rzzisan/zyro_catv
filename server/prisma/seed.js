import bcrypt from 'bcryptjs'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const permissions = [
  { key: 'MANAGE_AREAS', label: 'এরিয়া ম্যানেজমেন্ট' },
  { key: 'MANAGE_CUSTOMERS', label: 'গ্রাহক ম্যানেজমেন্ট' },
  { key: 'MANAGE_BILLING', label: 'বিলিং ও কালেকশন' },
  { key: 'MANAGE_COLLECTORS', label: 'কালেক্টর ম্যানেজমেন্ট' },
  { key: 'VIEW_REPORTS', label: 'রিপোর্ট দেখা' },
]

async function seed() {
  const adminPassword = await bcrypt.hash('admin123', 10)
  const managerPassword = await bcrypt.hash('manager123', 10)
  const collectorPassword = await bcrypt.hash('collector123', 10)
  const superAdminPassword = await bcrypt.hash('superadmin123', 10)

  // === SUPER ADMIN SETUP (Global, no company) ===
  const superAdmin = await prisma.user.upsert({
    where: { mobile: '01600000000' },
    update: {
      name: 'সুপার এডমিন',
      role: 'SUPER_ADMIN',
      passwordHash: superAdminPassword,
      email: 'superadmin@zyrotech.com',
    },
    create: {
      role: 'SUPER_ADMIN',
      name: 'সুপার এডমিন',
      mobile: '01600000000',
      email: 'superadmin@zyrotech.com',
      passwordHash: superAdminPassword,
      // companyId is null for SUPER_ADMIN
    },
  })

  console.log('✅ Super Admin created: 01600000000 / superadmin123')

  // ===== EXISTING COMPANY SETUP =====
  const starterPackage = await prisma.package.findFirst({
    where: { name: 'Starter' },
  })

  const packageRecord = starterPackage
    ? starterPackage
    : await prisma.package.create({
        data: {
          name: 'Starter',
          price: 1200,
          durationMonths: 12,
          features: {
            users: 5,
            collectors: 5,
            customers: 500,
          },
        },
      })

  const existingCompany = await prisma.company.findFirst({
    where: { name: 'Zyrotech CATV billing Managment' },
  })

  const company = existingCompany
    ? existingCompany
    : await prisma.company.create({
        data: {
          name: 'Zyrotech CATV billing Managment',
          packageId: packageRecord.id,
        },
      })

  const adminUser = await prisma.user.upsert({
    where: {
      company_mobile: {
        companyId: company.id,
        mobile: '01700000000',
      },
    },
    update: {
      name: 'সিস্টেম অ্যাডমিন',
      role: 'ADMIN',
      passwordHash: adminPassword,
    },
    create: {
      companyId: company.id,
      role: 'ADMIN',
      name: 'সিস্টেম অ্যাডমিন',
      mobile: '01700000000',
      email: 'admin@zyrotech.com',
      passwordHash: adminPassword,
    },
  })

  const managerUser = await prisma.user.upsert({
    where: {
      company_mobile: {
        companyId: company.id,
        mobile: '01800000000',
      },
    },
    update: {
      name: 'মেইন ম্যানেজার',
      role: 'MANAGER',
      passwordHash: managerPassword,
    },
    create: {
      companyId: company.id,
      role: 'MANAGER',
      name: 'মেইন ম্যানেজার',
      mobile: '01800000000',
      passwordHash: managerPassword,
    },
  })

  const collectorUser = await prisma.user.upsert({
    where: {
      company_mobile: {
        companyId: company.id,
        mobile: '01900000000',
      },
    },
    update: {
      name: 'ফিল্ড কালেক্টর',
      role: 'COLLECTOR',
      passwordHash: collectorPassword,
    },
    create: {
      companyId: company.id,
      role: 'COLLECTOR',
      name: 'ফিল্ড কালেক্টর',
      mobile: '01900000000',
      passwordHash: collectorPassword,
    },
  })

  await prisma.permission.createMany({
    data: permissions,
    skipDuplicates: true,
  })

  const permissionRows = await prisma.permission.findMany()
  await prisma.managerPermission.createMany({
    data: permissionRows.map((permission) => ({
      managerId: managerUser.id,
      permissionId: permission.id,
    })),
    skipDuplicates: true,
  })

  await prisma.area.createMany({
    data: [
      { companyId: company.id, name: 'পূর্বপাড়া', createdById: adminUser.id },
      { companyId: company.id, name: 'রিকাবী বাজার', createdById: adminUser.id },
      { companyId: company.id, name: 'বিনোদপুর', createdById: managerUser.id },
    ],
    skipDuplicates: true,
  })

  await prisma.customerType.createMany({
    data: [
      { companyId: company.id, name: 'অনালোগ', createdById: adminUser.id },
      { companyId: company.id, name: 'ডিজিটাল', createdById: adminUser.id },
    ],
    skipDuplicates: true,
  })

  const [areaPurbopara, areaRikabi, areaBinodpur] = await prisma.area.findMany({
    where: { companyId: company.id },
    orderBy: { name: 'asc' },
  })

  const [analogType, digitalType] = await prisma.customerType.findMany({
    where: { companyId: company.id },
    orderBy: { name: 'asc' },
  })

  await prisma.customer.createMany({
    data: [
      {
        companyId: company.id,
        areaId: areaPurbopara.id,
        customerTypeId: analogType.id,
        customerCode: 'C-1001',
        name: 'রফিক ইসলাম',
        mobile: '01712345678',
        address: 'পূর্বপাড়া, নীলফামারী',
        billingType: 'ACTIVE',
        monthlyFee: 350,
        dueBalance: 700,
        connectionDate: new Date('2024-01-12'),
        createdById: adminUser.id,
      },
      {
        companyId: company.id,
        areaId: areaRikabi.id,
        customerTypeId: digitalType.id,
        customerCode: 'C-1002',
        name: 'সাইফুল করিম',
        mobile: '01812345678',
        address: 'রিকাবী বাজার, রংপুর',
        billingType: 'ACTIVE',
        monthlyFee: 500,
        dueBalance: 0,
        connectionDate: new Date('2023-09-22'),
        createdById: managerUser.id,
      },
      {
        companyId: company.id,
        areaId: areaBinodpur.id,
        customerTypeId: analogType.id,
        customerCode: 'C-1003',
        name: 'নাসিমা বেগম',
        mobile: '01912345678',
        address: 'বিনোদপুর, দিনাজপুর',
        billingType: 'FREE',
        monthlyFee: null,
        dueBalance: 0,
        connectionDate: new Date('2022-12-01'),
        createdById: adminUser.id,
      },
      {
        companyId: company.id,
        areaId: areaRikabi.id,
        customerTypeId: digitalType.id,
        customerCode: 'C-1004',
        name: 'মিজানুর রহমান',
        mobile: '01612345678',
        address: 'রিকাবী বাজার, রংপুর',
        billingType: 'CLOSED',
        monthlyFee: null,
        dueBalance: 350,
        connectionDate: new Date('2021-06-18'),
        createdById: managerUser.id,
      },
    ],
    skipDuplicates: true,
  })

  const seededCustomers = await prisma.customer.findMany({
    where: { companyId: company.id },
    orderBy: { customerCode: 'asc' },
  })

  const billData = [
    {
      customerCode: 'C-1001',
      periodMonth: 1,
      periodYear: 2026,
      amount: 350,
      status: 'DUE',
    },
    {
      customerCode: 'C-1002',
      periodMonth: 1,
      periodYear: 2026,
      amount: 500,
      status: 'PAID',
    },
    {
      customerCode: 'C-1003',
      periodMonth: 1,
      periodYear: 2026,
      amount: 0,
      status: 'ADVANCE',
    },
    {
      customerCode: 'C-1004',
      periodMonth: 1,
      periodYear: 2026,
      amount: 350,
      status: 'PARTIAL',
    },
  ]

  const billRows = []
  for (const entry of billData) {
    const customer = seededCustomers.find(
      (row) => row.customerCode === entry.customerCode,
    )
    if (!customer) continue
    billRows.push({
      companyId: company.id,
      customerId: customer.id,
      periodMonth: entry.periodMonth,
      periodYear: entry.periodYear,
      amount: entry.amount,
      status: entry.status,
    })
  }

  await prisma.bill.createMany({
    data: billRows,
    skipDuplicates: true,
  })

  const bills = await prisma.bill.findMany({
    where: { companyId: company.id },
  })

  const paymentTargets = bills.filter((bill) =>
    ['PAID', 'PARTIAL'].includes(bill.status),
  )

  await prisma.payment.createMany({
    data: paymentTargets.map((bill) => ({
      billId: bill.id,
      amount: bill.status === 'PAID' ? bill.amount : Math.round(bill.amount * 0.6),
      collectedById: collectorUser.id,
    })),
    skipDuplicates: true,
  })

  console.log('Seed completed')
}

seed()
  .catch((error) => {
    console.error('Seed failed', error)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
