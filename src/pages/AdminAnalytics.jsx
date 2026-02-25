import { useEffect, useState } from 'react'
import AppLayout from '../components/AppLayout.jsx'

const apiBase = import.meta.env.PROD
  ? '/api'
  : import.meta.env.VITE_API_BASE || 'http://localhost:5000'

const emptyAnalytics = {
  summary: {
    totalCompanies: 0,
    totalUsers: 0,
    totalCustomers: 0,
    activeSubscriptions: 0,
    totalRevenue: 0,
    collectedRevenue: 0,
    pendingRevenue: 0,
    collectionRate: 0,
  },
  customerGrowth: {
    current: 0,
    previous: 0,
    rate: 0,
  },
  systemHealth: {
    uptimeHours: 0,
    lastBackupAt: null,
    lastBackupStatus: null,
    lastBackupName: null,
    lastActivityAt: null,
  },
  topCompanies: [],
}

function AdminAnalytics() {
  const [analytics, setAnalytics] = useState(emptyAnalytics)
  const [isLoading, setIsLoading] = useState(false)
  const [status, setStatus] = useState('')

  const token = localStorage.getItem('auth_token')

  useEffect(() => {
    loadAnalytics()
  }, [])

  const loadAnalytics = async () => {
    if (!token) return
    setIsLoading(true)
    setStatus('')
    try {
      const response = await fetch(`${apiBase}/admin/analytics/overview`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || 'বিশ্লেষণ লোড করা যায়নি')
      }
      setAnalytics({
        ...emptyAnalytics,
        ...(data.data || {}),
      })
    } catch (error) {
      setStatus(error.message)
    } finally {
      setIsLoading(false)
    }
  }

  const formatCurrency = (value) => `৳ ${Number(value || 0).toLocaleString('bn-BD')}`
  const formatDateTime = (value) =>
    value
      ? new Date(value).toLocaleString('bn-BD', { dateStyle: 'medium', timeStyle: 'short' })
      : 'পাওয়া যায়নি'

  const { summary, customerGrowth, systemHealth, topCompanies } = analytics
  const collectionRate = Number(summary.collectionRate || 0)
  const collectionAngle = Math.min(collectionRate, 100) * 3.6

  return (
    <AppLayout title="বিশ্লেষণ" subtitle="সিস্টেম পারফরম্যান্স ও মেট্রিক্স">
      <div className="module-card">
        <div className="module-header">
          <div>
            <div className="module-title">বিশ্লেষণ ও রিপোর্ট</div>
            <div className="module-sub">সিস্টেম-ব্যাপী পারফরম্যান্স এবং লাইভ মেট্রিক্স</div>
          </div>
          <div className="action-buttons">
            <button className="btn ghost" type="button" onClick={loadAnalytics}>
              রিফ্রেশ
            </button>
          </div>
        </div>

        {status ? <div className="status-banner error">{status}</div> : null}

        {isLoading ? (
          <div className="module-sub">লোড হচ্ছে...</div>
        ) : (
          <>
            <div className="section-title">মূল মেট্রিকস</div>
            <div className="stat-grid">
              <div className="metric-card">
                <div className="metric-value">{summary.totalCompanies}</div>
                <div className="metric-label">মোট কোম্পানি</div>
              </div>
              <div className="metric-card">
                <div className="metric-value">{summary.totalUsers}</div>
                <div className="metric-label">মোট ইউজার</div>
              </div>
              <div className="metric-card">
                <div className="metric-value">{summary.totalCustomers}</div>
                <div className="metric-label">মোট গ্রাহক</div>
              </div>
              <div className="metric-card">
                <div className="metric-value">{summary.activeSubscriptions}</div>
                <div className="metric-label">সক্রিয় সাবস্ক্রিপশন</div>
              </div>
            </div>

            <div className="section-title">রাজস্ব সারসংক্ষেপ</div>
            <div className="metric-row">
              <div className="balance-card">
                <div className="metric-label">মোট রাজস্ব</div>
                <div className="metric-value">{formatCurrency(summary.totalRevenue)}</div>
                <div className="module-sub">সব কোম্পানি মিলিয়ে</div>
              </div>
              <div className="balance-card">
                <div className="metric-label">সংগৃহীত রাজস্ব</div>
                <div className="metric-value">{formatCurrency(summary.collectedRevenue)}</div>
                <div className="module-sub">পরিশোধিত বিল</div>
              </div>
              <div className="balance-card">
                <div className="metric-label">পেন্ডিং রাজস্ব</div>
                <div className="metric-value">{formatCurrency(summary.pendingRevenue)}</div>
                <div className="module-sub">বকেয়া ও আংশিক</div>
              </div>
            </div>

            <div className="section-title">পারফরম্যান্স সারসংক্ষেপ</div>
            <div className="progress-card">
              <div
                className="progress-ring"
                style={{
                  background: `conic-gradient(#3aa0c8 0deg ${collectionAngle}deg, #e8eef5 ${collectionAngle}deg 360deg)`,
                }}
              >
                <div className="progress-inner">{collectionRate}%</div>
              </div>
              <div>
                <div className="progress-title">বিল সংগ্রহ হার</div>
                <div className="progress-sub">সকল কোম্পানির গড় সংগ্রহ হার</div>
              </div>
            </div>

            <div className="metric-row">
              <div className="metric-card">
                <div className="metric-value">{customerGrowth.current}</div>
                <div className="metric-label">গত ৩০ দিনের নতুন গ্রাহক</div>
              </div>
              <div className="metric-card">
                <div className="metric-value">{customerGrowth.previous}</div>
                <div className="metric-label">পূর্ববর্তী ৩০ দিন</div>
              </div>
              <div className="metric-card">
                <div className="metric-value">{customerGrowth.rate}%</div>
                <div className="metric-label">গ্রাহক বৃদ্ধি হার</div>
              </div>
            </div>

            <div className="section-title">সিস্টেম স্বাস্থ্য</div>
            <div className="metric-row">
              <div className="metric-card">
                <div className="metric-value">{systemHealth.uptimeHours} ঘন্টা</div>
                <div className="metric-label">সার্ভার আপটাইম</div>
              </div>
              <div className="metric-card">
                <div className="metric-value">
                  {systemHealth.lastBackupStatus || 'অজানা'}
                </div>
                <div className="metric-label">
                  সর্বশেষ ব্যাকআপ: {formatDateTime(systemHealth.lastBackupAt)}
                </div>
              </div>
              <div className="metric-card">
                <div className="metric-value">শেষ কার্যক্রম</div>
                <div className="metric-label">{formatDateTime(systemHealth.lastActivityAt)}</div>
              </div>
            </div>

            <div className="section-title">শীর্ষ পারফর্মিং কোম্পানি</div>
            <table className="data-table">
              <thead>
                <tr>
                  <th>কোম্পানি</th>
                  <th>গ্রাহক</th>
                  <th>মোট রাজস্ব</th>
                  <th>সংগ্রহ হার</th>
                </tr>
              </thead>
              <tbody>
                {topCompanies.length === 0 ? (
                  <tr>
                    <td colSpan="4">কোনো ডাটা পাওয়া যায়নি</td>
                  </tr>
                ) : (
                  topCompanies.map((company) => {
                    const rateClass =
                      company.collectionRate >= 90
                        ? 'paid'
                        : company.collectionRate >= 70
                          ? 'partial'
                          : 'due'
                    return (
                      <tr key={company.id}>
                        <td>
                          <div className="cell-title">{company.name}</div>
                          <div className="cell-sub">
                            সংগৃহীত: {formatCurrency(company.collectedRevenue)}
                          </div>
                        </td>
                        <td>{company.customers}</td>
                        <td>{formatCurrency(company.totalRevenue)}</td>
                        <td>
                          <span className={`status-pill ${rateClass}`}>
                            {company.collectionRate}%
                          </span>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </>
        )}
      </div>
    </AppLayout>
  )
}

export default AdminAnalytics
