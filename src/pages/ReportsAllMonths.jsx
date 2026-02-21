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

const formatDateTime = (value) => {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  return date.toLocaleString('bn-BD', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

const formatCurrency = (value) => `৳ ${Number(value || 0).toLocaleString('bn-BD')}`

const monthLabels = [
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

const resolveDueDate = (periodMonth, periodYear) => {
  const month = Number(periodMonth)
  const year = Number(periodYear)
  if (!month || !year) return null
  const dueDate = new Date(year, month, 0, 23, 59, 0, 0)
  return dueDate
}

function ReportsAllMonths() {
  const [rows, setRows] = useState([])
  const [detailRows, setDetailRows] = useState([])
  const [collectors, setCollectors] = useState([])
  const [filters, setFilters] = useState({
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
    params.append('details', 'true')
    if (filters.collectorId) params.append('collectorId', filters.collectorId)
    params.append('month', filters.month)
    params.append('year', filters.year)
    const query = params.toString()
    return query ? `?${query}` : ''
  }, [filters])

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
    <AppLayout title="রিপোর্ট" subtitle="সকল মাসের বিল কালেকশন">
      <div className="module-card">
        <div className="module-header">
          <div>
            <div className="module-title">সকল মাসের কালেকশন রিপোর্ট</div>
            <div className="module-sub">মাস ও কালেক্টর অনুযায়ী বিল কালেকশন দেখুন</div>
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
            <div className="metric-label">মোট আদায়</div>
          </div>
        </div>
        <div className="filter-grid">
          <label className="filter-item">
            <span>মাস</span>
            <select
              value={filters.month}
              onChange={(event) => setFilters((prev) => ({ ...prev, month: event.target.value }))}
            >
              {monthLabels.map((label, index) => {
                const value = String(index + 1)
                return (
                  <option key={value} value={value}>
                    {label}
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
              <th>মোট আদায়</th>
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
        <div className="module-card detail-card">
          <div className="module-title">গ্রাহক তালিকা</div>
          <div className="module-sub">বকেয়া তারিখ ও কালেকশন সময়সহ বিস্তারিত তালিকা</div>
          <table className="data-table">
            <thead>
              <tr>
                <th>কালেক্টর</th>
                <th>গ্রাহক</th>
                <th>মোবাইল</th>
                <th>বকেয়া তারিখ/সময়</th>
                <th>কালেকশন সময়</th>
                <th>আদায়</th>
              </tr>
            </thead>
            <tbody>
              {detailRows.map((row) => {
                const periodMonth = row.bill?.periodMonth
                const periodYear = row.bill?.periodYear
                const dueDate = resolveDueDate(periodMonth, periodYear)
                return (
                  <tr key={row.id}>
                    <td>{row.collector?.name || '—'}</td>
                    <td>
                      {row.customer ? `${row.customer.name} (${row.customer.customerCode})` : '—'}
                    </td>
                    <td>{row.customer?.mobile || '—'}</td>
                    <td>{dueDate ? formatDateTime(dueDate) : '—'}</td>
                    <td>{formatDateTime(row.paidAt)}</td>
                    <td>{formatCurrency(row.amount)}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        {status ? <div className="status-banner error">{status}</div> : null}
      </div>
    </AppLayout>
  )
}

export default ReportsAllMonths
