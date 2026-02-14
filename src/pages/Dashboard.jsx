import { useEffect, useMemo, useState } from 'react'
import AppLayout from '../components/AppLayout.jsx'

const apiBase = import.meta.env.PROD
  ? '/api'
  : import.meta.env.VITE_API_BASE || 'http://localhost:5000'

const statCards = [
  { label: 'সঞ্চয়', value: '৳ 2,066,918' },
  { label: 'প্রগ্রেস', value: '6%' },
  { label: 'কালেকশন', value: '৳ 114,725' },
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
  const [depositForm, setDepositForm] = useState({
    amount: '',
    depositedAt: formatDateInput(new Date()),
  })
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

  useEffect(() => {
    loadSummary()
  }, [])

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
      <section className="balance-banner">ব্যালেন্স: ৳ 0</section>

      <section className="stat-grid">
        {statCards.map((item) => (
          <article key={item.label} className="stat-card">
            <div className="stat-label">{item.label}</div>
            <div className="stat-value">{item.value}</div>
          </article>
        ))}
      </section>

      <section className="progress-card">
        <div className="progress-ring" aria-hidden="true">
          <div className="progress-inner">6%</div>
        </div>
        <div>
          <div className="progress-title">কালেকশন প্রগ্রেস</div>
          <div className="progress-sub">এই মাসের সংগ্রহ ৬% সম্পন্ন</div>
        </div>
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
    </AppLayout>
  )
}

export default Dashboard
