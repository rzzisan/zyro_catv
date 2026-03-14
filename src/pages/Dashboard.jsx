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

  useEffect(() => {
    loadSummary()
    loadDashboardStats()
    loadCollectionSummary()
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

  const managerStats = useMemo(
    () => [
      { label: 'পেন্ডিং ডিপোজিট', value: formatCurrency(summary.pendingAmount), tone: 'teal' },
      { label: 'ডিপোজিট সংখ্যা', value: String(summary.pendingCount || 0), tone: 'sky' },
    ],
    [summary.pendingAmount, summary.pendingCount]
  )

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
          <article key={item.key} className={`visual-stat-card tone-${item.tone}`}>
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

      <section className="section-title">ডিপোজিট</section>
      <section className="pill-grid">
        {managerStats.map((item) => (
          <article key={item.label} className={`pill-card tone-${item.tone}`}>
            <div className="pill-value">{item.value}</div>
            <div className="pill-label">{item.label}</div>
          </article>
        ))}
      </section>

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
