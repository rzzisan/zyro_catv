import { useEffect, useMemo, useState } from 'react'
import AppLayout from '../components/AppLayout.jsx'

const apiBase = import.meta.env.PROD
  ? '/api'
  : import.meta.env.VITE_API_BASE || 'http://localhost:5000'

const statusOptions = [
  { value: '', label: 'সব' },
  { value: 'PENDING', label: 'পেন্ডিং' },
  { value: 'APPROVED', label: 'অ্যাপ্রুভড' },
  { value: 'REJECTED', label: 'রিজেক্টেড' },
]

const statusLabel = (value) => {
  const match = statusOptions.find((option) => option.value === value)
  return match ? match.label : value
}

const formatDateInput = (value) => {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return date.toISOString().slice(0, 10)
}

const formatCurrency = (value) => `৳ ${Number(value || 0).toLocaleString('bn-BD')}`

const getUserRole = () => {
  const token = localStorage.getItem('auth_token')
  if (!token) return null
  const parts = token.split('.')
  if (parts.length !== 3) return null
  try {
    const payload = JSON.parse(atob(parts[1]))
    return payload?.role || null
  } catch (error) {
    return null
  }
}

function Deposits() {
  const [rows, setRows] = useState([])
  const [collectors, setCollectors] = useState([])
  const [filters, setFilters] = useState({
    status: '',
    collectorId: '',
    startDate: '',
    endDate: '',
  })
  const [status, setStatus] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const token = localStorage.getItem('auth_token')
  const role = getUserRole()

  const filterQuery = useMemo(() => {
    const params = new URLSearchParams()
    if (filters.status) params.append('status', filters.status)
    if (filters.collectorId) params.append('collectorId', filters.collectorId)
    if (filters.startDate) params.append('startDate', filters.startDate)
    if (filters.endDate) params.append('endDate', filters.endDate)
    const query = params.toString()
    return query ? `?${query}` : ''
  }, [filters])

  const loadCollectors = async () => {
    if (!token || role === 'COLLECTOR') return
    try {
      const response = await fetch(`${apiBase}/users/collectors`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await response.json()
      if (response.ok) {
        setCollectors(data.data || [])
      }
    } catch (error) {
      setStatus('কালেক্টর লোড করা যায়নি')
    }
  }

  const loadDeposits = async () => {
    if (!token) return
    setIsLoading(true)
    setStatus('')
    try {
      const response = await fetch(`${apiBase}/deposits${filterQuery}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || 'ডিপোজিট লোড করা যায়নি')
      }
      setRows(data.data || [])
    } catch (error) {
      setStatus(error.message)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadCollectors()
  }, [role])

  useEffect(() => {
    loadDeposits()
  }, [filterQuery])

  const handleAction = async (row, action) => {
    if (!token) return
    setIsLoading(true)
    setStatus('')
    try {
      const response = await fetch(`${apiBase}/deposits/${row.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ action }),
      })
      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || 'ডিপোজিট আপডেট করা যায়নি')
      }
      await loadDeposits()
    } catch (error) {
      setStatus(error.message)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <AppLayout title="ডিপোজিট" subtitle="ডিপোজিট হিসাব">
      <div className="module-card">
        <div className="module-header">
          <div>
            <div className="module-title">ডিপোজিট তালিকা</div>
            <div className="module-sub">মোট {rows.length} টি</div>
          </div>
        </div>
        <div className="filter-grid">
          <label className="filter-item">
            <span>স্ট্যাটাস</span>
            <select
              value={filters.status}
              onChange={(event) => setFilters((prev) => ({ ...prev, status: event.target.value }))}
            >
              {statusOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          {role === 'COLLECTOR' ? null : (
            <label className="filter-item">
              <span>কালেক্টর</span>
              <select
                value={filters.collectorId}
                onChange={(event) => setFilters((prev) => ({ ...prev, collectorId: event.target.value }))}
              >
                <option value="">সব</option>
                {collectors.map((collector) => (
                  <option key={collector.id} value={collector.id}>
                    {collector.name}
                  </option>
                ))}
              </select>
            </label>
          )}
          <label className="filter-item">
            <span>শুরু তারিখ</span>
            <input
              type="date"
              value={filters.startDate}
              onChange={(event) => setFilters((prev) => ({ ...prev, startDate: event.target.value }))}
            />
          </label>
          <label className="filter-item">
            <span>শেষ তারিখ</span>
            <input
              type="date"
              value={filters.endDate}
              onChange={(event) => setFilters((prev) => ({ ...prev, endDate: event.target.value }))}
            />
          </label>
        </div>
        {isLoading ? <div className="module-sub">লোড হচ্ছে...</div> : null}
        <table className="data-table">
          <thead>
            <tr>
              <th>কালেক্টর</th>
              <th>পরিমাণ</th>
              <th>তারিখ</th>
              <th>স্ট্যাটাস</th>
              <th>অ্যাকশন</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id}>
                <td>{row.collector?.name || '—'}</td>
                <td>{formatCurrency(row.amount)}</td>
                <td>{formatDateInput(row.depositedAt)}</td>
                <td>{statusLabel(row.status)}</td>
                <td>
                  {role === 'COLLECTOR' || row.status !== 'PENDING' ? (
                    '—'
                  ) : (
                    <div className="action-buttons">
                      <button
                        className="btn ghost small"
                        type="button"
                        onClick={() => handleAction(row, 'APPROVE')}
                      >
                        অ্যাপ্রুভ
                      </button>
                      <button
                        className="btn outline small"
                        type="button"
                        onClick={() => handleAction(row, 'REJECT')}
                      >
                        রিজেক্ট
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {status ? <div className="status-banner error">{status}</div> : null}
      </div>
    </AppLayout>
  )
}

export default Deposits
