import 'dotenv/config'
import app from './app.js'
import scheduleMonthlyBilling from './lib/billingScheduler.js'

const port = process.env.PORT || 5000

app.listen(port, () => {
  console.log(`CATV API running on port ${port}`)
})

scheduleMonthlyBilling()
