import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

try {
  const softDeletedCustomers = await prisma.customer.findMany({
    where: { deletedAt: { not: null } },
    select: { id: true },
  })

  const customerIds = softDeletedCustomers.map((customer) => customer.id)

  if (customerIds.length === 0) {
    console.log(JSON.stringify({ message: 'No soft-deleted customers found', customersDeleted: 0 }))
    process.exit(0)
  }

  const bills = await prisma.bill.findMany({
    where: { customerId: { in: customerIds } },
    select: { id: true },
  })
  const billIds = bills.map((bill) => bill.id)

  const payments = billIds.length
    ? await prisma.payment.findMany({
        where: { billId: { in: billIds } },
        select: { id: true },
      })
    : []
  const paymentIds = payments.map((payment) => payment.id)

  const result = await prisma.$transaction(async (tx) => {
    const deletedAllocations = await tx.paymentAllocation.deleteMany({
      where: {
        OR: [
          paymentIds.length ? { paymentId: { in: paymentIds } } : undefined,
          billIds.length ? { billId: { in: billIds } } : undefined,
        ].filter(Boolean),
      },
    })

    const deletedPayments = billIds.length
      ? await tx.payment.deleteMany({ where: { billId: { in: billIds } } })
      : { count: 0 }

    const deletedBills = await tx.bill.deleteMany({
      where: { customerId: { in: customerIds } },
    })

    const deletedCustomers = await tx.customer.deleteMany({
      where: { id: { in: customerIds } },
    })

    return {
      deletedAllocations: deletedAllocations.count,
      deletedPayments: deletedPayments.count,
      deletedBills: deletedBills.count,
      deletedCustomers: deletedCustomers.count,
    }
  })

  const remainingSoftDeleted = await prisma.customer.count({
    where: { deletedAt: { not: null } },
  })

  console.log(
    JSON.stringify({
      ...result,
      remainingSoftDeleted,
    })
  )
} catch (error) {
  console.error('DELETE_ERROR', error)
  process.exit(1)
} finally {
  await prisma.$disconnect()
}
