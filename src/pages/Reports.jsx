import { useEffect, useMemo, useState } from 'react'
import AppLayout from '../components/AppLayout.jsx'

const apiBase = import.meta.env.PROD
  ? '/api'
  : import.meta.env.VITE_API_BASE || 'http://localhost:5000'

const formatDateInput = (value) => {
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

function Reports() {
  const [rows, setRows] = useState([])
  const [detailRows, setDetailRows] = useState([])
  const [collectors, setCollectors] = useState([])
  const [filters, setFilters] = useState({
    mode: 'month',
    startDate: formatDateInput(new Date()),
    endDate: formatDateInput(new Date()),
    month: String(new Date().getMonth() + 1),
    year: String(new Date().getFullYear()),
    collectorId: '',
  })
  const [summary, setSummary] = useState({
    totalCollectors: 0,
    totalAmount: 0,
    totalCount: 0,
  })
  const [status, setStatus] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const role = getUserRole()

  const token = localStorage.getItem('auth_token')

  const filterQuery = useMemo(() => {
    const params = new URLSearchParams()
    if (filters.collectorId) params.append('collectorId', filters.collectorId)
    if (role === 'COLLECTOR') params.append('details', 'true')

    if (filters.mode === 'range') {
      params.append('startDate', filters.startDate)
      params.append('endDate', filters.endDate)
    } else if (filters.mode === 'month') {
      params.append('month', filters.month)
      params.append('year', filters.year)
    }

    const query = params.toString()
    return query ? `?${query}` : ''
  }, [filters, role])

  const loadCollectors = async () => {
    if (!token) return
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

  const loadReports = async () => {
    if (!token) return
    setIsLoading(true)
    setStatus('')
    try {
      const response = await fetch(`${apiBase}/reports/collections${filterQuery}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || 'রিপোর্ট লোড করা যায়নি')
      }
      setRows(data.data || [])
      setSummary(data.summary || summary)
      setDetailRows(data.details || [])
    } catch (error) {
      setStatus(error.message)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadCollectors()
  }, [])

  useEffect(() => {
    loadReports()
  }, [filterQuery])

  return (
    <AppLayout title="রিপোর্ট" subtitle="বর্তমান মাসের বিল কালেকশন রিপোর্ট">
      <div className="module-card">
        <div className="module-header">
          <div>
            <div className="module-title">কালেকশন রিপোর্ট</div>
            <div className="module-sub">ডিফল্টভাবে চলতি মাসের কালেকশন দেখায়</div>
          </div>
        </div>
        <div className="metric-row">
          <div className="metric-card">
            <div className="metric-value">{summary.totalCollectors}</div>
            <div className="metric-label">মোট কালেক্টর</div>
          </div>
          <div className="metric-card">
            <div className="metric-value">{summary.totalCount}</div>
            <div className="metric-label">মোট বিল সংগ্রহ</div>
          </div>
          <div className="metric-card">
            <div className="metric-value">{formatCurrency(summary.totalAmount)}</div>
            <div className="metric-label">মোট কালেকশন</div>
          </div>
        </div>
        <div className="filter-grid">
          <label className="filter-item">
            <span>রিপোর্ট টাইপ</span>
            <select
              value={filters.mode}
              onChange={(event) => setFilters((prev) => ({ ...prev, mode: event.target.value }))}
            >
              <option value="today">আজকের</option>
              <option value="range">তারিখ থেকে তারিখ</option>
              <option value="month">পুরো মাস</option>
            </select>
          </label>
          {filters.mode === 'range' ? (
            <>
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
            </>
          ) : null}
          {filters.mode === 'month' ? (
            <>
              <label className="filter-item">
                <span>মাস</span>
                <select
                  value={filters.month}
                  onChange={(event) => setFilters((prev) => ({ ...prev, month: event.target.value }))}
                >
                  {Array.from({ length: 12 }).map((_, index) => {
                    const value = String(index + 1)
                    return (
                      <option key={value} value={value}>
                        {value}
                      </option>
                    )
                  })}
                </select>
              </label>
              <label className="filter-item">
                <span>বছর</span>
                <input
                  type="number"
                  min="2020"
                  value={filters.year}
                  onChange={(event) => setFilters((prev) => ({ ...prev, year: event.target.value }))}
                />
              </label>
            </>
          ) : null}
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
        </div>
        {isLoading ? <div className="module-sub">লোড হচ্ছে...</div> : null}
        <table className="data-table">
          <thead>
            <tr>
              <th>কালেক্টর</th>
              <th>বিল সংখ্যা</th>
              <th>মোট কালেকশন</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.collectorId || row.collectorName}>
                <td>{row.collectorName}</td>
                <td>{row.totalCount}</td>
                <td>{formatCurrency(row.totalAmount)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {role === 'COLLECTOR' ? (
          <div className="module-card detail-card">
            <div className="module-title">দৈনিক বিস্তারিত রিপোর্ট</div>
            <div className="module-sub">বিল সংগ্রহ করা গ্রাহকের তালিকা</div>
            <table className="data-table">
              <thead>
                <tr>
                  <th>গ্রাহক</th>
                  <th>মোবাইল</th>
                  <th>তারিখ</th>
                  <th>মেথড</th>
                  <th>পরিমাণ</th>
                </tr>
              </thead>
              <tbody>
                {detailRows.map((row) => (
                  <tr key={row.id}>
                    <td>{row.customer ? `${row.customer.name} (${row.customer.customerCode})` : '—'}</td>
                    <td>{row.customer?.mobile || '—'}</td>
                    <td>{formatDateInput(row.paidAt)}</td>
                    <td>{row.method || '—'}</td>
                    <td>{formatCurrency(row.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
        {status ? <div className="status-banner error">{status}</div> : null}
      </div>
    </AppLayout>
  )
}

export default Reports
