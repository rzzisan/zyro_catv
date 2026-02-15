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

const monthLabel = (year, month) => `${month}/${year}`

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
    })
    const paidTotal = allocationRows.reduce((sum, row) => sum + row.amount, 0)
    const dueCurrent = Math.max(0, bill.amount - paidTotal)
    const advanceAmount = paidTotal > bill.amount ? paidTotal - bill.amount : 0
    const totalDue = (bill.customer.dueBalance ?? 0) + dueCurrent
    const status = normalizeStatus(bill.amount, paidTotal)
    const lastPayment = bill.payments[0] || null

    const lastPaymentAllocations = lastPayment
      ? allocationRows.filter((row) => row.paymentId === lastPayment.id)
      : []
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
