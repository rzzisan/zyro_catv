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

const formatCurrency = (value) => `৳${Number(value || 0).toLocaleString('bn-BD')}`

const getInitial = (name = '') => {
  const trimmed = String(name).trim()
  return trimmed ? trimmed[0] : 'ক'
}

const avatarPalette = ['#f5b55e', '#66a7e6', '#7dc8a7', '#f08ab5', '#b28ce2']

const getAvatarColor = (seed) => {
  const text = String(seed ?? '')
  let hash = 0
  for (let i = 0; i < text.length; i += 1) {
    hash = (hash * 31 + text.charCodeAt(i)) % 997
  }
  return avatarPalette[Math.abs(hash) % avatarPalette.length]
}

// Collector Report Card Component
const CollectorReportCard = ({ collector }) => {
  return (
    <div className="report-card">
      <div
        className="report-avatar"
        aria-hidden="true"
        style={{ background: getAvatarColor(collector.collectorId || collector.collectorName) }}
      >
        <span>{getInitial(collector.collectorName)}</span>
      </div>

      <div className="report-main-info">
        <h4 className="report-name">{collector.collectorName}</h4>
        <span className="report-subtitle">{collector.totalCount} টি বিল সংগ্রহ</span>
      </div>

      <div className="report-right-section">
        <div className="report-amount">{formatCurrency(collector.totalAmount)}</div>
        <div className="report-label">মোট আদায়</div>
      </div>
    </div>
  )
}

// Detail Report Card Component (REMOVED - Using Table Instead)

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

const initialSummary = {
  totalCollectors: 0,
  totalAmount: 0,
  totalCount: 0,
}

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
  const today = new Date()
  const todayAsInput = formatDateInput(today)
  const [rows, setRows] = useState([])
  const [detailRows, setDetailRows] = useState([])
  const [collectors, setCollectors] = useState([])
  const [filters, setFilters] = useState({
    filterType: 'month',
    month: String(new Date().getMonth() + 1),
    year: String(new Date().getFullYear()),
    startDate: todayAsInput,
    endDate: todayAsInput,
    collectorId: '',
  })
  const [summary, setSummary] = useState(initialSummary)
  const [status, setStatus] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const role = getUserRole()

  const token = localStorage.getItem('auth_token')

  const filterQuery = useMemo(() => {
    const params = new URLSearchParams()
    params.append('details', 'true')
    if (filters.collectorId) params.append('collectorId', filters.collectorId)

    if (filters.filterType === 'range') {
      if (filters.startDate) params.append('startDate', filters.startDate)
      if (filters.endDate) params.append('endDate', filters.endDate)
    } else {
      params.append('month', filters.month)
      params.append('year', filters.year)
    }

    const query = params.toString()
    return query ? `?${query}` : ''
  }, [filters])

  const invalidRange = useMemo(() => {
    if (filters.filterType !== 'range') return false
    if (!filters.startDate || !filters.endDate) return false
    return new Date(filters.startDate) > new Date(filters.endDate)
  }, [filters.filterType, filters.startDate, filters.endDate])

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
      setSummary(data.summary || initialSummary)
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
    if (invalidRange) {
      setRows([])
      setDetailRows([])
      setSummary(initialSummary)
      setStatus('শুরুর তারিখ শেষ তারিখের পরে হতে পারবে না')
      return
    }
    loadReports()
  }, [filterQuery, invalidRange])

  return (
    <AppLayout title="রিপোর্ট" subtitle="সকল মাসের বিল কালেকশন">
      <div className="reports-container">
        <div className="reports-header">
          <div>
            <div className="module-title">সকল মাসের কালেকশন রিপোর্ট</div>
            <div className="module-sub">মাস ও কালেক্টর অনুযায়ী বিল কালেকশন দেখুন</div>
          </div>
        </div>

        <div className="reports-summary">
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

        <div className="reports-filters">
          <label className="filter-item">
            <span>ফিল্টার ধরণ</span>
            <select
              value={filters.filterType}
              onChange={(event) =>
                setFilters((prev) => ({
                  ...prev,
                  filterType: event.target.value,
                }))
              }
            >
              <option value="month">মাস অনুযায়ী</option>
              <option value="range">তারিখ থেকে-তারিখ পর্যন্ত</option>
            </select>
          </label>

          {filters.filterType === 'month' ? (
            <>
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
            </>
          ) : (
            <>
              <label className="filter-item">
                <span>শুরুর তারিখ</span>
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
          )}

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

        <div className="reports-content">
          {isLoading && <div className="loading-message">লোড হচ্ছে...</div>}

          {!isLoading && rows.length === 0 && (
            <div className="empty-message">
              <p>কোন রিপোর্ট পাওয়া যায়নি</p>
            </div>
          )}

          {!isLoading && rows.length > 0 && (
            <div className="reports-list">
              {rows.map((row) => (
                <CollectorReportCard key={row.collectorId || row.collectorName} collector={row} />
              ))}
            </div>
          )}
        </div>

        {detailRows.length > 0 && (
          <div className="reports-details">
            <div className="reports-details-header">
              <div className="module-title">গ্রাহক তালিকা</div>
              <div className="module-sub">বকেয়া তারিখ ও কালেকশন সময়সহ বিস্তারিত তালিকা</div>
            </div>
            <table className="data-table">
              <thead>
                <tr>
                  <th>ক্রম</th>
                  <th>কালেক্টর</th>
                  <th>গ্রাহক</th>
                  <th>মোবাইল</th>
                  <th>কালেকশন সময়</th>
                  <th>আদায়</th>
                </tr>
              </thead>
              <tbody>
                {detailRows.map((row, index) => {
                  return (
                    <tr key={row.id}>
                      <td>{index + 1}</td>
                      <td>{row.collector?.name || '—'}</td>
                      <td>
                        {row.customer ? `${row.customer.name} (${row.customer.customerCode})` : '—'}
                      </td>
                      <td>{row.customer?.mobile || '—'}</td>
                      <td>{formatDateTime(row.paidAt)}</td>
                      <td>{formatCurrency(row.amount)}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

        {status && <div className="status-banner error">{status}</div>}
      </div>
    </AppLayout>
  )
}

export default ReportsAllMonths
