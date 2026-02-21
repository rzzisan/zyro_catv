import { useEffect, useMemo, useState } from 'react'
import AppLayout from '../components/AppLayout.jsx'

const apiBase = import.meta.env.PROD
  ? '/api'
  : import.meta.env.VITE_API_BASE || 'http://localhost:5000'

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

function ReportsPreviousSummary() {
  const [formFilters, setFormFilters] = useState({
    month: String(new Date().getMonth() + 1),
    year: String(new Date().getFullYear()),
  })
  const [appliedFilters, setAppliedFilters] = useState(formFilters)
  const [rows, setRows] = useState([])
  const [summary, setSummary] = useState({
    totalCollectors: 0,
    totalAmount: 0,
    totalCount: 0,
  })
  const [status, setStatus] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const token = localStorage.getItem('auth_token')

  const filterQuery = useMemo(() => {
    const params = new URLSearchParams()
    params.append('month', appliedFilters.month)
    params.append('year', appliedFilters.year)
    const query = params.toString()
    return query ? `?${query}` : ''
  }, [appliedFilters])

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
    } catch (error) {
      setStatus(error.message)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadReports()
  }, [filterQuery])

  const handleSubmit = (event) => {
    event.preventDefault()
    setAppliedFilters(formFilters)
  }

  return (
    <AppLayout title="রিপোর্ট" subtitle="পূর্বের সামারি">
      <div className="module-card">
        <div className="module-header">
          <div>
            <div className="module-title">মাসভিত্তিক কালেকশন সামারি</div>
            <div className="module-sub">নির্দিষ্ট মাসের মোট আদায় ও কালেক্টরভিত্তিক তালিকা</div>
          </div>
        </div>
        <form className="filter-grid" onSubmit={handleSubmit}>
          <label className="filter-item">
            <span>মাস</span>
            <select
              value={formFilters.month}
              onChange={(event) => setFormFilters((prev) => ({ ...prev, month: event.target.value }))}
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
              value={formFilters.year}
              onChange={(event) => setFormFilters((prev) => ({ ...prev, year: event.target.value }))}
            />
          </label>
          <div className="filter-item">
            <span>&nbsp;</span>
            <button className="primary-btn" type="submit">
              সাবমিট
            </button>
          </div>
        </form>
        <div className="metric-row">
          <div className="metric-card">
            <div className="metric-value">{summary.totalCount}</div>
            <div className="metric-label">মোট বিল সংগ্রহ</div>
          </div>
          <div className="metric-card">
            <div className="metric-value">{formatCurrency(summary.totalAmount)}</div>
            <div className="metric-label">মোট আদায়</div>
          </div>
          <div className="metric-card">
            <div className="metric-value">{summary.totalCollectors}</div>
            <div className="metric-label">মোট কালেক্টর</div>
          </div>
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
        {status ? <div className="status-banner error">{status}</div> : null}
      </div>
    </AppLayout>
  )
}

export default ReportsPreviousSummary
