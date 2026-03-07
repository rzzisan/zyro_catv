import { useEffect, useMemo, useRef, useState } from 'react'
import AppLayout from '../components/AppLayout.jsx'

const apiBase = import.meta.env.PROD
  ? '/api'
  : import.meta.env.VITE_API_BASE || 'http://localhost:5000'

const formatDateInput = (value) => {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return date.toISOString().slice(0, 10)
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
        <div className="report-label">মোট কালেকশন</div>
      </div>
    </div>
  )
}

// Detail Report Card Component
const DetailReportCard = ({ detail }) => {
  return (
    <div className="detail-card">
      <div className="detail-main">
        <div className="detail-customer">
          <span className="detail-name">
            {detail.customer ? `${detail.customer.name} (${detail.customer.customerCode})` : '—'}
          </span>
          <span className="detail-mobile">{detail.customer?.mobile || '—'}</span>
        </div>
      </div>
      <div className="detail-info">
        <div className="detail-item">
          <span className="detail-label">তারিখ</span>
          <span className="detail-value">{formatDateInput(detail.paidAt)}</span>
        </div>
        <div className="detail-item">
          <span className="detail-label">মেথড</span>
          <span className="detail-value">{detail.method || '—'}</span>
        </div>
        <div className="detail-item">
          <span className="detail-label">পরিমাণ</span>
          <span className="detail-value amount">{formatCurrency(detail.amount)}</span>
        </div>
      </div>
    </div>
  )
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
      <div className="reports-container">
        <div className="reports-header">
          <div>
            <div className="module-title">কালেকশন রিপোর্ট</div>
            <div className="module-sub">ডিফল্টভাবে চলতি মাসের কালেকশন দেখায়</div>
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
            <div className="metric-label">মোট কালেকশন</div>
          </div>
        </div>

        <div className="reports-filters">
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
        {role === 'COLLECTOR' && detailRows.length > 0 && (
          <div className="reports-details">
            <div className="reports-details-header">
              <div className="module-title">দৈনিক বিস্তারিত রিপোর্ট</div>
              <div className="module-sub">বিল সংগ্রহ করা গ্রাহকের তালিকা</div>
            </div>
            <div className="details-list">
              {detailRows.map((row) => (
                <DetailReportCard key={row.id} detail={row} />
              ))}
            </div>
          </div>
        )}

        {status && <div className="status-banner error">{status}</div>}
      </div>
    </AppLayout>
  )
}

export default Reports
