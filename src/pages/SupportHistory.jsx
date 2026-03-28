import { useEffect, useState } from 'react'
import AppLayout from '../components/AppLayout.jsx'

const apiBase = import.meta.env.PROD
  ? '/api'
  : import.meta.env.VITE_API_BASE || 'http://localhost:5000'

const statusClass = (s) => {
  if (s === 'PENDING') return 'due'
  if (s === 'PROCESSING') return 'free'
  if (s === 'COMPLETED') return 'paid'
  return 'closed'
}

function SupportHistory() {
  const [rows, setRows] = useState([])
  const [categories, setCategories] = useState([])
  const [status, setStatus] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [filters, setFilters] = useState({
    category: '',
    q: '',
  })

  const loadCategories = async () => {
    const token = localStorage.getItem('auth_token')
    if (!token) return
    try {
      const response = await fetch(`${apiBase}/support-categories`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || 'সাপোর্ট ক্যাটাগরি লোড করা যায়নি')
      }
      setCategories(data.data || [])
    } catch (error) {
      setStatus(error.message)
    }
  }

  const loadHistory = async () => {
    const token = localStorage.getItem('auth_token')
    if (!token) return
    setIsLoading(true)
    setStatus('')
    try {
      const params = new URLSearchParams()
      params.set('view', 'history')
      params.set('status', 'COMPLETED')
      if (filters.category) params.set('category', filters.category)
      if (filters.q.trim()) params.set('q', filters.q.trim())

      const response = await fetch(`${apiBase}/support-tickets?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || 'সাপোর্ট হিস্টোরি লোড করা যায়নি')
      }
      setRows(data.data || [])
    } catch (error) {
      setStatus(error.message)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadCategories()
    loadHistory()
  }, [])

  useEffect(() => {
    loadHistory()
  }, [filters.category])

  useEffect(() => {
    const timer = setTimeout(() => {
      loadHistory()
    }, 350)
    return () => clearTimeout(timer)
  }, [filters.q])

  return (
    <AppLayout title="সাপোর্ট হিস্টোরি" subtitle="আজকের আগের সম্পন্ন টিকেট">
      <div className="module-card">
        <div className="module-header">
          <div>
            <div className="module-title">পূর্বের সম্পন্ন টিকেট</div>
            <div className="module-sub">মোট {rows.length} টি</div>
          </div>
        </div>

        <div className="filter-grid">
          <div className="filter-item search">
            <span>সার্চ</span>
            <input
              type="text"
              placeholder="টিকেট নম্বর / নাম / মোবাইল / বিবরণ"
              value={filters.q}
              onChange={(event) => setFilters((prev) => ({ ...prev, q: event.target.value }))}
            />
          </div>
          <div className="filter-item">
            <span>ক্যাটাগরি</span>
            <select
              value={filters.category}
              onChange={(event) => setFilters((prev) => ({ ...prev, category: event.target.value }))}
            >
              <option value="">সব ক্যাটাগরি</option>
              {categories.map((item) => (
                <option key={item.id} value={item.name}>{item.name}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="table-scroll">
          <table className="data-table">
            <thead>
              <tr>
                <th>টিকেট</th>
                <th>গ্রাহক</th>
                <th>মোবাইল</th>
                <th>ক্যাটাগরি</th>
                <th>সমস্যার বিবরণ</th>
                <th>Priority</th>
                <th>Status</th>
                <th>সমাধান সময়</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id}>
                  <td>
                    <strong>{row.ticketNumber}</strong>
                    <div style={{ fontSize: 12, color: 'var(--muted)' }}>{row.title}</div>
                  </td>
                  <td>
                    <div>{row.customerName || '—'}</div>
                    <div style={{ fontSize: 12, color: 'var(--muted)' }}>{row.customerCode || '—'}</div>
                  </td>
                  <td>{row.customerMobile || '—'}</td>
                  <td>{row.category}</td>
                  <td style={{ maxWidth: 240 }}>
                    <div style={{ whiteSpace: 'normal', wordBreak: 'break-word' }}>{row.description || '—'}</div>
                  </td>
                  <td>{row.priority}</td>
                  <td>
                    <span className={`status-pill ${statusClass(row.status)}`}>{row.status}</span>
                  </td>
                  <td>{new Date(row.resolvedAt || row.updatedAt || row.createdAt).toLocaleString('bn-BD')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="data-cards">
          {rows.map((row) => (
            <div key={row.id} className="data-card">
              <div className="card-head">
                <div>
                  <div className="card-title">{row.ticketNumber}</div>
                  <div className="card-sub">{row.category}</div>
                </div>
                <span className={`status-pill ${statusClass(row.status)}`}>{row.status}</span>
              </div>
              <div className="card-row">
                <span>গ্রাহক</span>
                <div style={{ textAlign: 'right' }}>
                  <div>{row.customerName || '—'}</div>
                  {row.customerCode ? <div className="card-sub">{row.customerCode}</div> : null}
                </div>
              </div>
              <div className="card-row">
                <span>মোবাইল</span>
                <span>{row.customerMobile || '—'}</span>
              </div>
              <div className="card-row" style={{ alignItems: 'flex-start' }}>
                <span>সমস্যা</span>
                <span style={{ textAlign: 'right', whiteSpace: 'normal', wordBreak: 'break-word', maxWidth: 180 }}>
                  {row.description || '—'}
                </span>
              </div>
              <div className="card-row">
                <span>সমাধান সময়</span>
                <span style={{ fontSize: 13 }}>{new Date(row.resolvedAt || row.updatedAt || row.createdAt).toLocaleString('bn-BD')}</span>
              </div>
            </div>
          ))}
        </div>

        {isLoading ? <div className="module-sub">লোড হচ্ছে...</div> : null}
        {status ? <div className="status-banner error">{status}</div> : null}
      </div>
    </AppLayout>
  )
}

export default SupportHistory
