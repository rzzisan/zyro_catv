import { useEffect, useMemo, useState } from 'react'
import AppLayout from '../components/AppLayout.jsx'

const apiBase = import.meta.env.PROD
  ? '/api'
  : import.meta.env.VITE_API_BASE || 'http://localhost:5000'

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

const formatCurrency = (value) => `৳ ${Number(value || 0).toLocaleString('bn-BD')}`

const formatDateInput = (value) => {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return date.toISOString().slice(0, 10)
}

const collectorChartPalette = ['#1598f5', '#20bfc1', '#f3b42d', '#f78d1f', '#8b74ff', '#ef476f']
const monthlyBarPalette = ['#48b8a9', '#ff3b6d', '#ff9f2a', '#38bdf8', '#8b5cf6', '#22c55e']

function Dashboard() {
  const role = getUserRole()
  const [depositTab, setDepositTab] = useState('deposit')
  const [summary, setSummary] = useState({
    collectedTotal: 0,
    approvedTotal: 0,
    pendingTotal: 0,
    balance: 0,
    todayAmount: 0,
    todayCount: 0,
    pendingAmount: 0,
    pendingCount: 0,
  })
  const [stats, setStats] = useState({
    savings: 0,
    progress: 0,
    collectionProgress: 0,
    monthCollection: 0,
    totalDue: 0,
    monthDue: 0,
  })
  const [depositForm, setDepositForm] = useState({
    amount: '',
    depositedAt: formatDateInput(new Date()),
  })
  const [collectionSummary, setCollectionSummary] = useState([])
  const [collectionTotals, setCollectionTotals] = useState({})
  const [monthlyPerformance, setMonthlyPerformance] = useState([])
  const [status, setStatus] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const token = localStorage.getItem('auth_token')

  const loadSummary = async () => {
    if (!token) return
    setIsLoading(true)
    setStatus('')
    try {
      const response = await fetch(`${apiBase}/deposits/summary`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || 'ড্যাশবোর্ড লোড করা যায়নি')
      }
      setSummary((prev) => ({ ...prev, ...(data.data || {}) }))
    } catch (error) {
      setStatus(error.message)
    } finally {
      setIsLoading(false)
    }
  }

  const loadDashboardStats = async () => {
    if (!token || !['ADMIN', 'MANAGER'].includes(role)) return
    try {
      const response = await fetch(`${apiBase}/reports/dashboard-stats`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || 'স্ট্যাটিস্টিক্স লোড করা যায়নি')
      }
      setStats((prev) => ({ ...prev, ...(data.data || {}) }))
    } catch (error) {
      console.error('Dashboard stats error:', error)
      setStatus(error.message)
    }
  }

  const loadCollectionSummary = async () => {
    if (!token || !['ADMIN', 'MANAGER'].includes(role)) return
    try {
      const response = await fetch(`${apiBase}/reports/collection-summary`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || 'কালেকশন সামারি লোড করা যায়নি')
      }
      setCollectionSummary(data.data || [])
      setCollectionTotals(data.totals || {})
    } catch (error) {
      console.error('Collection summary error:', error)
    }
  }

  const loadMonthlyPerformance = async () => {
    if (!token || !['ADMIN', 'MANAGER'].includes(role)) return
    try {
      const response = await fetch(`${apiBase}/reports/monthly-performance`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || 'মাসভিত্তিক পারফরম্যান্স লোড করা যায়নি')
      }
      setMonthlyPerformance(data.data || [])
    } catch (error) {
      console.error('Monthly performance error:', error)
    }
  }

  useEffect(() => {
    loadSummary()
    loadDashboardStats()
    loadCollectionSummary()
    loadMonthlyPerformance()
  }, [token, role])

  const handleDepositSubmit = async (event) => {
    event.preventDefault()
    if (!token) return
    setIsLoading(true)
    setStatus('')
    try {
      const response = await fetch(`${apiBase}/deposits`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          amount: Number(depositForm.amount),
          depositedAt: depositForm.depositedAt,
        }),
      })
      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || 'ডিপোজিট ব্যর্থ হয়েছে')
      }
      setDepositForm({ amount: '', depositedAt: formatDateInput(new Date()) })
      await loadSummary()
    } catch (error) {
      setStatus(error.message)
    } finally {
      setIsLoading(false)
    }
  }

  const dashboardVisualCards = useMemo(() => {
    const totalDue = Number(stats.totalDue || 0)
    const monthDue = Number(stats.monthDue || 0)
    const monthCollection = Number(stats.monthCollection || 0)
    const progress = Number(stats.collectionProgress ?? stats.progress ?? 0)
    const safeProgress = Math.max(0, Math.min(100, progress))
    const maxAmount = Math.max(totalDue, monthDue, monthCollection, 1)

    return [
      {
        key: 'totalDue',
        tone: 'rose',
        label: 'সর্ব মোট বকেয়া',
        value: formatCurrency(totalDue),
        sub: 'সকল গ্রাহকের বর্তমান বকেয়া',
        level: Math.max(6, Math.round((totalDue / maxAmount) * 100)),
        isProgress: false,
      },
      {
        key: 'monthDue',
        tone: 'amber',
        label: 'চলতি মাসের বকেয়া',
        value: formatCurrency(monthDue),
        sub: 'চলতি মাসের DUE + PARTIAL বিল',
        level: Math.max(6, Math.round((monthDue / maxAmount) * 100)),
        isProgress: false,
      },
      {
        key: 'monthCollection',
        tone: 'teal',
        label: 'চলতি মাসের কালেকশন',
        value: formatCurrency(monthCollection),
        sub: 'চলতি মাসে মোট সংগ্রহ',
        level: Math.max(6, Math.round((monthCollection / maxAmount) * 100)),
        isProgress: false,
      },
      {
        key: 'collectionProgress',
        tone: 'sky',
        label: 'কালেকশন প্রগ্রেস',
        value: `${safeProgress.toFixed(2)}%`,
        sub: 'চলতি মাসের বকেয়ার বিপরীতে সংগ্রহ',
        level: Math.round(safeProgress),
        isProgress: true,
      },
    ]
  }, [stats])

  const collectorChart = useMemo(() => {
    const collectorRows = collectionSummary
      .filter((item) => item.role === 'COLLECTOR' && Number(item.thisMonth?.amount || 0) > 0)
      .sort((a, b) => Number(b.thisMonth?.amount || 0) - Number(a.thisMonth?.amount || 0))

    if (!collectorRows.length) {
      return {
        hasData: false,
        total: 0,
        segments: [],
        gradient: 'conic-gradient(#dbe5f1 0 100%)',
      }
    }

    const maxSlices = 6
    const slicedRows = collectorRows.slice(0, maxSlices)
    const restRows = collectorRows.slice(maxSlices)
    const otherAmount = restRows.reduce((sum, item) => sum + Number(item.thisMonth?.amount || 0), 0)

    const sourceRows = otherAmount > 0
      ? [
          ...slicedRows,
          { id: 'others', name: 'অন্যান্য', thisMonth: { amount: otherAmount } },
        ]
      : slicedRows

    const total = sourceRows.reduce((sum, item) => sum + Number(item.thisMonth?.amount || 0), 0)
    let currentPercent = 0

    const segments = sourceRows.map((item, index) => {
      const amount = Number(item.thisMonth?.amount || 0)
      const rawPercent = total > 0 ? (amount / total) * 100 : 0
      const start = currentPercent
      currentPercent += rawPercent
      const end = Math.min(100, currentPercent)
      return {
        id: item.id,
        name: item.name,
        amount,
        percent: rawPercent,
        color: collectorChartPalette[index % collectorChartPalette.length],
        start,
        end,
      }
    })

    if (segments.length) {
      segments[segments.length - 1].end = 100
    }

    const gradientStops = segments
      .map((item) => `${item.color} ${item.start.toFixed(2)}% ${item.end.toFixed(2)}%`)
      .join(', ')

    return {
      hasData: total > 0,
      total,
      segments,
      gradient: gradientStops ? `conic-gradient(${gradientStops})` : 'conic-gradient(#dbe5f1 0 100%)',
    }
  }, [collectionSummary])

  const monthlyPerformanceChart = useMemo(() => {
    const rows = monthlyPerformance.length
      ? monthlyPerformance
      : [
          { label: 'Apr', count: 0 },
          { label: 'May', count: 0 },
          { label: 'Jun', count: 0 },
          { label: 'Jul', count: 0 },
          { label: 'Aug', count: 0 },
          { label: 'Sep', count: 0 },
          { label: 'Oct', count: 0 },
          { label: 'Nov', count: 0 },
          { label: 'Dec', count: 0 },
          { label: 'Jan', count: 0 },
          { label: 'Feb', count: 0 },
          { label: 'Mar', count: 0 },
        ]

    const maxCount = Math.max(...rows.map((item) => Number(item.count || 0)), 1)
    const ticks = Array.from({ length: 6 }, (_, index) => Math.ceil((maxCount * index) / 5))

    const data = rows.map((item, index) => {
      const count = Number(item.count || 0)
      const height = count > 0 ? Math.max(8, Math.round((count / maxCount) * 100)) : 0
      return {
        ...item,
        count,
        height,
        color: monthlyBarPalette[index % monthlyBarPalette.length],
      }
    })

    return {
      data,
      maxCount,
      ticks,
    }
  }, [monthlyPerformance])

  const topBalanceLabel = role === 'MANAGER'
    ? 'কালেক্টরদের অনুমোদিত ডিপোজিট'
    : role === 'ADMIN'
      ? 'চলতি মাসে মোট কালেকশন'
      : 'ব্যালেন্স'

  const topBalanceValue = role === 'COLLECTOR'
    ? summary.balance
    : summary.topBalance

  if (role === 'COLLECTOR') {
    return (
      <AppLayout title="ড্যাশবোর্ড" subtitle="কালেক্টর সারসংক্ষেপ">
        <section className="balance-banner">ব্যালেন্স: {formatCurrency(summary.balance)}</section>

        <div className="tab-switch">
          <button
            className={`tab-button ${depositTab === 'deposit' ? 'active' : ''}`}
            type="button"
            onClick={() => setDepositTab('deposit')}
          >
            ডিপোজিট
          </button>
          <button
            className={`tab-button ${depositTab === 'today' ? 'active' : ''}`}
            type="button"
            onClick={() => setDepositTab('today')}
          >
            আজকের কালেকশন
          </button>
        </div>

        {depositTab === 'deposit' ? (
          <section className="module-card">
            <div className="module-title">ডিপোজিট</div>
            <div className="module-sub">পেন্ডিং ডিপোজিট: {formatCurrency(summary.pendingTotal)}</div>
            <form className="auth-form" onSubmit={handleDepositSubmit}>
              <label className="field">
                <span>ডিপোজিট এমাউন্ট</span>
                <input
                  type="number"
                  min="1"
                  value={depositForm.amount}
                  onChange={(event) => setDepositForm((prev) => ({ ...prev, amount: event.target.value }))}
                  placeholder="টাকা লিখুন"
                />
              </label>
              <label className="field">
                <span>তারিখ</span>
                <input
                  type="date"
                  value={depositForm.depositedAt}
                  onChange={(event) => setDepositForm((prev) => ({ ...prev, depositedAt: event.target.value }))}
                />
              </label>
              <div className="modal-actions">
                <button className="btn primary" type="submit" disabled={isLoading}>
                  {isLoading ? 'সেভ হচ্ছে...' : 'ডিপোজিট'}
                </button>
              </div>
            </form>
          </section>
        ) : (
          <section className="module-card">
            <div className="module-title">আজকের কালেকশন</div>
            <div className="metric-row">
              <div className="metric-card">
                <div className="metric-value">{summary.todayCount}</div>
                <div className="metric-label">বিল সংগ্রহ</div>
              </div>
              <div className="metric-card">
                <div className="metric-value">{formatCurrency(summary.todayAmount)}</div>
                <div className="metric-label">মোট কালেকশন</div>
              </div>
            </div>
          </section>
        )}

        {status ? <div className="status-banner error">{status}</div> : null}
      </AppLayout>
    )
  }

  return (
    <AppLayout title="ড্যাশবোর্ড" subtitle="আজকের সারসংক্ষেপ">
      <section className="balance-banner">{topBalanceLabel}: {formatCurrency(topBalanceValue)}</section>

      <section className="dashboard-visual-grid">
        {dashboardVisualCards.map((item) => (
          <article key={item.key} className={`visual-stat-card visual-tone-${item.tone}`}>
            <div className="visual-stat-top">
              <div className="visual-stat-label">{item.label}</div>
              <div className="visual-stat-value">{item.value}</div>
              <div className="visual-stat-sub">{item.sub}</div>
            </div>

            {item.isProgress ? (
              <div className="visual-progress-wrap">
                <div
                  className="visual-progress-ring"
                  aria-hidden="true"
                  style={{ '--progress-value': `${item.level}%` }}
                >
                  <span>{item.level}%</span>
                </div>
              </div>
            ) : (
              <div className="visual-bars" aria-hidden="true">
                <span style={{ '--bar-h': `${Math.max(16, item.level * 0.45)}%` }} />
                <span style={{ '--bar-h': `${Math.max(22, item.level * 0.68)}%` }} />
                <span style={{ '--bar-h': `${Math.max(28, item.level * 0.85)}%` }} />
                <span style={{ '--bar-h': `${Math.max(18, item.level * 0.56)}%` }} />
                <span style={{ '--bar-h': `${Math.max(26, item.level * 0.78)}%` }} />
                <span style={{ '--bar-h': `${Math.max(34, item.level)}%` }} />
              </div>
            )}
          </article>
        ))}
      </section>

      {['ADMIN', 'MANAGER'].includes(role) && (
        <div className="dashboard-dual-charts">
          <section className="collector-chart-card">
            <div className="collector-chart-header">
              <div className="module-title">কালেক্টর ওয়াইস চলতি মাসের বিল কালেকশন</div>
              <div className="module-sub">মোট কালেকশনের মধ্যে কে কত শতাংশ সংগ্রহ করেছে</div>
            </div>

            {collectorChart.hasData ? (
              <div className="collector-chart-layout">
                <div className="collector-donut-shell" aria-hidden="true">
                  <div className="collector-donut" style={{ '--collector-chart': collectorChart.gradient }}>
                    <div className="collector-donut-hole">
                      <strong>{formatCurrency(collectorChart.total)}</strong>
                      <span>মোট কালেকশন</span>
                    </div>
                  </div>
                </div>

                <div className="collector-legend">
                  {collectorChart.segments.map((item) => (
                    <div key={item.id} className="collector-legend-item">
                      <div className="collector-legend-main">
                        <span className="collector-color-dot" style={{ backgroundColor: item.color }} />
                        <span className="collector-name">{item.name}</span>
                      </div>
                      <div className="collector-legend-meta">
                        <span>{item.percent.toFixed(1)}%</span>
                        <span>{formatCurrency(item.amount)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="collector-chart-empty">চলতি মাসে কালেক্টরভিত্তিক কোনো কালেকশন ডেটা পাওয়া যায়নি</div>
            )}
          </section>

          <section className="performance-chart-card">
            <div className="module-title">Company Performance (Collected Clients)</div>
            <div className="module-sub">প্রতিমাসে কতজন গ্রাহকের বিল কালেক্ট হয়েছে</div>

            <div className="performance-chart-wrap">
              <div className="performance-y-axis">
                {[...monthlyPerformanceChart.ticks].reverse().map((tick) => (
                  <span key={tick}>{tick.toLocaleString('bn-BD')}</span>
                ))}
              </div>

              <div className="performance-plot">
                {monthlyPerformanceChart.data.map((item) => (
                  <div key={`${item.year || ''}-${item.month || ''}-${item.label}`} className="performance-col">
                    <div className="performance-bar-track">
                      <div
                        className="performance-bar"
                        style={{ '--bar-h': `${item.height}%`, '--bar-color': item.color }}
                      >
                        {item.count > 0 ? <span>{item.count.toLocaleString('bn-BD')}</span> : null}
                      </div>
                    </div>
                    <div className="performance-month">{item.label}</div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        </div>
      )}

      {['ADMIN', 'MANAGER'].includes(role) && (
        <section className="module-card">
          <div className="module-header">
            <div>
              <div className="module-title">কালেকশন সারসংক্ষেপ</div>
              <div className="module-sub">সকল কালেক্টর, ম্যানেজার এবং অ্যাডমিনের দৈনিক ও মাসিক কালেকশন</div>
            </div>
          </div>

          <div style={{ overflowX: 'auto', marginTop: '1rem' }}>
            <table style={{
              width: '100%',
              borderCollapse: 'collapse',
              fontSize: '0.875rem',
            }}>
              <thead>
                <tr style={{
                  backgroundColor: '#f3f4f6',
                  borderBottom: '1px solid #e5e7eb',
                }}>
                  <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: '700' }}>নাম</th>
                  <th style={{ padding: '0.75rem', textAlign: 'right', fontWeight: '700' }}>আজ (বিল/টাকা)</th>
                  <th style={{ padding: '0.75rem', textAlign: 'right', fontWeight: '700' }}>কালেকশন (বিল/টাকা)</th>
                  <th style={{ padding: '0.75rem', textAlign: 'right', fontWeight: '700' }}>ডিপোজিট</th>
                  <th style={{ padding: '0.75rem', textAlign: 'right', fontWeight: '700' }}>ব্যালেন্স</th>
                </tr>
              </thead>
              <tbody>
                {collectionSummary.length > 0 ? (
                  <>
                    {collectionSummary.map((item) => (
                      <tr key={item.id} style={{
                        borderBottom: '1px solid #e5e7eb',
                        '&:hover': { backgroundColor: '#f9fafb' },
                      }}>
                        <td style={{ padding: '0.75rem', textAlign: 'left' }}>
                          <div style={{ fontWeight: '500' }}>{item.name}</div>
                          <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>{item.role}</div>
                        </td>
                        <td style={{ padding: '0.75rem', textAlign: 'right' }}>
                          <div>{item.today.count}</div>
                          <div style={{ color: '#059669', fontWeight: '500' }}>
                            ৳ {(item.today.amount || 0).toLocaleString('bn-BD')}
                          </div>
                        </td>
                        <td style={{ padding: '0.75rem', textAlign: 'right' }}>
                          <div>{item.thisMonth.count}</div>
                          <div style={{ color: '#2563eb', fontWeight: '500' }}>
                            ৳ {(item.thisMonth.amount || 0).toLocaleString('bn-BD')}
                          </div>
                        </td>
                        <td style={{ padding: '0.75rem', textAlign: 'right' }}>
                          <div style={{ color: '#7c3aed', fontWeight: '500' }}>
                            ৳ {(item.deposit || 0).toLocaleString('bn-BD')}
                          </div>
                        </td>
                        <td style={{ padding: '0.75rem', textAlign: 'right' }}>
                          <div style={{
                            fontWeight: '500',
                            color: item.balance >= 0 ? '#059669' : '#dc2626',
                          }}>
                            ৳ {(item.balance || 0).toLocaleString('bn-BD')}
                          </div>
                        </td>
                      </tr>
                    ))}
                    <tr style={{
                      backgroundColor: '#f3f4f6',
                      fontWeight: '700',
                      borderTop: '2px solid #d1d5db',
                    }}>
                      <td style={{ padding: '0.75rem', textAlign: 'left' }}>মোট</td>
                      <td style={{ padding: '0.75rem', textAlign: 'right' }}>
                        <div>{collectionTotals.todayCount || 0}</div>
                        <div style={{ color: '#059669' }}>
                          ৳ {(collectionTotals.todayAmount || 0).toLocaleString('bn-BD')}
                        </div>
                      </td>
                      <td style={{ padding: '0.75rem', textAlign: 'right' }}>
                        <div>{collectionTotals.monthCount || 0}</div>
                        <div style={{ color: '#2563eb' }}>
                          ৳ {(collectionTotals.monthAmount || 0).toLocaleString('bn-BD')}
                        </div>
                      </td>
                      <td style={{ padding: '0.75rem', textAlign: 'right' }}>
                        <div style={{ color: '#7c3aed' }}>
                          ৳ {(collectionTotals.totalDeposit || 0).toLocaleString('bn-BD')}
                        </div>
                      </td>
                      <td style={{ padding: '0.75rem', textAlign: 'right' }}>
                        <div style={{ color: collectionTotals.totalBalance >= 0 ? '#059669' : '#dc2626' }}>
                          ৳ {(collectionTotals.totalBalance || 0).toLocaleString('bn-BD')}
                        </div>
                      </td>
                    </tr>
                  </>
                ) : (
                  <tr>
                    <td colSpan="5" style={{ padding: '1rem', textAlign: 'center', color: '#6b7280' }}>
                      কোন ডেটা পাওয়া যায়নি
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </AppLayout>
  )
}

export default Dashboard
