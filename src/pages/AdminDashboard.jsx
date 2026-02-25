import { useEffect, useState } from 'react'
import AppLayout from '../components/AppLayout.jsx'

const apiBase = import.meta.env.PROD
  ? '/api'
  : import.meta.env.VITE_API_BASE || 'http://localhost:5000'

function AdminDashboard() {
  const [summary, setSummary] = useState({
    totalCompanies: 0,
    totalUsers: 0,
    totalCustomers: 0,
    activeSubscriptions: 0,
    totalRevenue: 0,
    collectedRevenue: 0,
    pendingRevenue: 0,
    collectionRate: 0,
  })
  const [isLoading, setIsLoading] = useState(false)
  const [status, setStatus] = useState('')

  const token = localStorage.getItem('auth_token')

  useEffect(() => {
    const loadSummary = async () => {
      if (!token) return
      setIsLoading(true)
      setStatus('')
      try {
        const response = await fetch(`${apiBase}/admin/dashboard/summary`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        const data = await response.json()
        if (!response.ok) {
          throw new Error(data.error || 'সংক্ষিপ্ত তথ্য লোড করা যায়নি')
        }
        setSummary(data.data || {})
      } catch (error) {
        setStatus(error.message)
      } finally {
        setIsLoading(false)
      }
    }

    loadSummary()
  }, [token])

  const StatCard = ({ label, value, bgColor = 'bg-blue-50' }) => (
    <div className={`${bgColor} p-6 rounded-lg border`}>
      <p className="text-sm text-gray-600 mb-2">{label}</p>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
    </div>
  )

  return (
    <AppLayout title="প্রশাসনিক ড্যাশবোর্ড" subtitle="সিস্টেম নিয়ন্ত্রণ ও নজরদারি">
      <div className="module-card">
        <div className="module-header">
          <div>
            <div className="module-title">সিস্টেম সংক্ষিপ্ত তথ্য</div>
            <div className="module-sub">সম্পূর্ণ ওভারভিউ এবং মেট্রিক্স</div>
          </div>
        </div>

        {status && (
          <div className="status-banner error">{status}</div>
        )}

        {isLoading ? (
          <div className="module-sub">লোড হচ্ছে...</div>
        ) : (
          <>
            {/* Stats Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
              <StatCard label="মোট কোম্পানি" value={summary.totalCompanies} bgColor="bg-blue-50" />
              <StatCard label="মোট ইউজার" value={summary.totalUsers} bgColor="bg-green-50" />
              <StatCard label="মোট গ্রাহক" value={summary.totalCustomers} bgColor="bg-purple-50" />
              <StatCard label="সক্রিয় সাবস্ক্রিপশন" value={summary.activeSubscriptions} bgColor="bg-orange-50" />
            </div>

            {/* Revenue Section */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
              <div className="bg-white p-6 rounded-lg border">
                <h3 className="text-sm font-semibold text-gray-600 mb-4">মোট রাজস্ব</h3>
                <p className="text-3xl font-bold text-gray-900">
                  ৳ {(summary.totalRevenue || 0).toLocaleString('bn-BD')}
                </p>
                <p className="text-xs text-gray-500 mt-2">সব কোম্পানি মিলিয়ে</p>
              </div>

              <div className="bg-white p-6 rounded-lg border">
                <h3 className="text-sm font-semibold text-gray-600 mb-4">সংগৃহীত রাজস্ব</h3>
                <p className="text-3xl font-bold text-green-600">
                  ৳ {(summary.collectedRevenue || 0).toLocaleString('bn-BD')}
                </p>
                <div className="mt-2 w-full bg-gray-200 rounded h-2">
                  <div
                    className="bg-green-600 h-2 rounded"
                    style={{
                      width: `${((summary.collectedRevenue / summary.totalRevenue) * 100) || 0}%`,
                    }}
                  />
                </div>
              </div>

              <div className="bg-white p-6 rounded-lg border">
                <h3 className="text-sm font-semibold text-gray-600 mb-4">পেন্ডিং রাজস্ব</h3>
                <p className="text-3xl font-bold text-orange-600">
                  ৳ {(summary.pendingRevenue || 0).toLocaleString('bn-BD')}
                </p>
                <p className="text-sm text-gray-500 mt-2">
                  সংগ্রহ হার: <span className="font-semibold">{summary.collectionRate}%</span>
                </p>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-white p-6 rounded-lg border">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">দ্রুত ক্রিয়াকলাপ</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '1rem' }}>
                <a href="/admin/companies" className="text-center p-4 bg-blue-50 rounded-lg hover:bg-blue-100 transition">
                  <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>🏢</div>
                  <p className="text-sm font-semibold text-gray-900">কোম্পানি</p>
                </a>
                <a href="/admin/users" className="text-center p-4 bg-green-50 rounded-lg hover:bg-green-100 transition">
                  <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>👥</div>
                  <p className="text-sm font-semibold text-gray-900">ইউজার</p>
                </a>
                <a href="/admin/activity-logs" className="text-center p-4 bg-purple-50 rounded-lg hover:bg-purple-100 transition">
                  <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>📝</div>
                  <p className="text-sm font-semibold text-gray-900">কার্যক্রম</p>
                </a>
                <a href="/admin/settings" className="text-center p-4 bg-orange-50 rounded-lg hover:bg-orange-100 transition">
                  <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>⚙️</div>
                  <p className="text-sm font-semibold text-gray-900">সেটিংস</p>
                </a>
              </div>
            </div>
          </>
        )}
      </div>
    </AppLayout>
  )
}

export default AdminDashboard
