import express from 'express'
import cors from 'cors'
import authRoutes from './routes/auth.js'
import areaRoutes from './routes/areas.js'
import userRoutes from './routes/users.js'

const app = express()

app.use(cors())
app.use(express.json())

app.get('/health', (req, res) => {
  res.json({ ok: true, service: 'catv-server' })
})

app.use('/api/auth', authRoutes)
app.use('/api/areas', areaRoutes)
app.use('/api/users', userRoutes)

app.use((err, req, res, next) => {
  console.error(err)
  res.status(500).json({ error: 'Server error' })
})

export default app
