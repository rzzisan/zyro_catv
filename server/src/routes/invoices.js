import express from 'express'
import prisma from '../lib/prisma.js'
import { requireAuth, requireRole } from '../lib/auth.js'

const router = express.Router()

const normalizeStatus = (amount, paidTotal) => {
  if (paidTotal > amount) return 'ADVANCE'
  if (paidTotal === amount && amount > 0) return 'PAID'
  if (paidTotal > 0 && paidTotal < amount) return 'PARTIAL'
  return 'DUE'
}

const monthNames = [
  'জানুয়ারি',
  'ফেব্রুয়ারি',
  'মার্চ',
  'এপ্রিল',
  'মে',
  'জুন',
  'জুলাই',
  'আগস্ট',
  'সেপ্টেম্বর',
  'অক্টোবর',
  'নভেম্বর',
  'ডিসেম্বর',
]

const monthLabel = (year, month) => {
  const name = monthNames[month - 1] || String(month)
  return `${name} ${year}`
}

router.get('/:billId', requireAuth, requireRole(['ADMIN', 'MANAGER', 'COLLECTOR']), async (req, res, next) => {
  try {
    const bill = await prisma.bill.findFirst({
      where: { id: req.params.billId, companyId: req.user.companyId },
      include: {
        customer: {
          select: {
            id: true,
            name: true,
            customerCode: true,
            mobile: true,
            address: true,
            dueBalance: true,
            area: { select: { id: true, name: true } },
          },
        },
        payments: {
          select: {
            id: true,
            amount: true,
            paidAt: true,
            method: true,
            collectedBy: { select: { id: true, name: true } },
          },
          orderBy: { paidAt: 'desc' },
        },
      },
    })

    if (!bill) {
      return res.status(404).json({ error: 'Bill not found' })
    }

    if (req.user.role === 'COLLECTOR') {
      const assignments = await prisma.collectorArea.findMany({
        where: { collectorId: req.user.userId, area: { companyId: req.user.companyId } },
        select: { areaId: true },
      })
      const areaIds = assignments.map((item) => item.areaId)
      if (!areaIds.includes(bill.customer.area.id)) {
        return res.status(403).json({ error: 'Forbidden' })
      }
    }

    const allocationRows = await prisma.paymentAllocation.findMany({
      where: { billId: bill.id },
      include: {
        bill: { select: { periodMonth: true, periodYear: true } },
      },
      orderBy: [
        { bill: { periodYear: 'asc' } },
        { bill: { periodMonth: 'asc' } },
      ],
    })
    const lastPayment = await prisma.payment.findFirst({
      where: { bill: { customerId: bill.customer.id, companyId: req.user.companyId } },
      orderBy: { paidAt: 'desc' },
      select: {
        id: true,
        amount: true,
        paidAt: true,
        method: true,
        collectedBy: { select: { id: true, name: true } },
      },
    })

    const lastPaymentAllocations = lastPayment
      ? await prisma.paymentAllocation.findMany({
          where: { paymentId: lastPayment.id },
          include: { bill: { select: { periodMonth: true, periodYear: true } } },
          orderBy: [
            { bill: { periodYear: 'asc' } },
            { bill: { periodMonth: 'asc' } },
          ],
        })
      : []

    const paidTotal = lastPaymentAllocations.reduce((sum, row) => sum + row.amount, 0)

    const allBills = await prisma.bill.findMany({
      where: { customerId: bill.customer.id },
      select: { id: true, amount: true },
    })
    const allBillIds = allBills.map((item) => item.id)
    const allAllocations = allBillIds.length
      ? await prisma.paymentAllocation.findMany({
          where: { billId: { in: allBillIds } },
          select: { billId: true, amount: true },
        })
      : []
    const allocationsByBill = allAllocations.reduce((acc, row) => {
      acc[row.billId] = (acc[row.billId] || 0) + row.amount
      return acc
    }, {})
    const totalAmount = allBills.reduce((sum, item) => sum + item.amount, 0)
    const totalPaid = allBills.reduce((sum, item) => sum + (allocationsByBill[item.id] || 0), 0)
    const totalDue = Math.max(0, totalAmount - totalPaid)
    const dueCurrent = Math.max(0, bill.amount - (allocationsByBill[bill.id] || 0))
    const advanceAmount = totalPaid > totalAmount ? totalPaid - totalAmount : 0
    const status = normalizeStatus(totalAmount, totalPaid)
    const allocationMonths = lastPaymentAllocations.map((row) => ({
      month: row.bill.periodMonth,
      year: row.bill.periodYear,
      label: monthLabel(row.bill.periodYear, row.bill.periodMonth),
    }))

    const company = await prisma.company.findFirst({
      where: { id: req.user.companyId },
      select: {
        id: true,
        name: true,
        helplineNumber: true,
        invoiceNote: true,
        slogan: true,
        address: true,
      },
    })

    return res.json({
      data: {
        bill: {
          id: bill.id,
          amount: bill.amount,
          periodMonth: bill.periodMonth,
          periodYear: bill.periodYear,
          status,
        },
        customer: bill.customer,
        payments: bill.payments,
        paidTotal,
        dueCurrent,
        advanceAmount,
        totalDue,
        lastPayment,
        allocationMonths,
        company,
      },
    })
  } catch (error) {
    return next(error)
  }
})

export default router
