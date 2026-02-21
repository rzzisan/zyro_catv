import cron from 'node-cron'
import prisma from './prisma.js'

const DEFAULT_SCHEDULE = '5 0 1 * *'
const DEFAULT_TIMEZONE = 'Asia/Dhaka'

const getMonthYear = (timeZone) => {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: 'numeric',
  })
  const parts = formatter.formatToParts(new Date())
  const month = Number(parts.find((part) => part.type === 'month')?.value)
  const year = Number(parts.find((part) => part.type === 'year')?.value)
  return {
    month: Number.isNaN(month) ? new Date().getMonth() + 1 : month,
    year: Number.isNaN(year) ? new Date().getFullYear() : year,
  }
}

const buildBillRows = (customers, period) => customers.map((customer) => ({
  companyId: customer.companyId,
  customerId: customer.id,
  periodMonth: period.month,
  periodYear: period.year,
  amount: customer.monthlyFee ?? 0,
  status: 'DUE',
}))

const generateMonthlyBills = async (period) => {
  const customers = await prisma.customer.findMany({
    where: { billingType: 'ACTIVE' },
    select: { id: true, companyId: true, monthlyFee: true },
  })

  if (!customers.length) {
    return { created: 0, customers: 0 }
  }

  const rows = buildBillRows(customers, period)
  const result = await prisma.bill.createMany({
    data: rows,
    skipDuplicates: true,
  })

  return { created: result.count, customers: customers.length }
}

const scheduleMonthlyBilling = () => {
  if (process.env.BILLING_CRON === 'false') return null

  const schedule = process.env.BILLING_CRON_SCHEDULE || DEFAULT_SCHEDULE
  const timeZone = process.env.BILLING_CRON_TZ || DEFAULT_TIMEZONE

  const task = cron.schedule(
    schedule,
    async () => {
      const period = getMonthYear(timeZone)
      try {
        const result = await generateMonthlyBills(period)
        console.log(
          `[billing-cron] Generated ${result.created} bills for ${period.month}/${period.year} (customers ${result.customers})`,
        )
      } catch (error) {
        console.error('[billing-cron] Failed to generate bills', error)
      }
    },
    { timezone: timeZone },
  )

  return task
}

export { generateMonthlyBills, scheduleMonthlyBilling }
export default scheduleMonthlyBilling
