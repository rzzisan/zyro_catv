import { useEffect, useState } from 'react'
import AppLayout from '../components/AppLayout.jsx'

const apiBase = import.meta.env.PROD
  ? '/api'
  : import.meta.env.VITE_API_BASE || 'http://localhost:5000'

function AdminAuditTrail() {
  const [trail, setTrail] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [status, setStatus] = useState('')
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [filterTable, setFilterTable] = useState('')

  const token = localStorage.getItem('auth_token')
  const limit = 20

  useEffect(() => {
    loadTrail()
  }, [page, filterTable])

  const loadTrail = async () => {
    if (!token) return
    setIsLoading(true)
    setStatus('')
    try {
      const query = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        ...(filterTable && { tableName: filterTable }),
      })

      const response = await fetch(`${apiBase}/admin/audit-trail?${query}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || 'অডিট ট্রেইল লোড করা যায়নি')
      }
      setTrail(data.data || [])
      setTotal(data.pagination?.total || 0)
    } catch (error) {
      setStatus(error.message)
    } finally {
      setIsLoading(false)
    }
  }

  const pages = Math.ceil(total / limit)

  return (
    <AppLayout title="পরিবর্তনের ইতিহাস" subtitle="ডেটা মডিফিকেশন ট্রেইল">
      <div className="module-card">
        <div className="module-header">
          <div>
            <div className="module-title">অডিট ট্রেইল</div>
            <div className="module-sub">মোট {total} টি পরিবর্তন</div>
          </div>
        </div>

        {status && (
          <div className="status-banner error">{status}</div>
        )}

        <div className="filter-grid">
          <label className="filter-item">
            <span>টেবিল</span>
            <select
              value={filterTable}
              onChange={(e) => {
                setFilterTable(e.target.value)
                setPage(1)
              }}
            >
              <option value="">সব টেবিল</option>
              <option value="Company">কোম্পানি</option>
              <option value="User">ইউজার</option>
              <option value="Customer">গ্রাহক</option>
              <option value="Bill">বিল</option>
              <option value="Payment">পেমেন্ট</option>
              <option value="Area">এরিয়া</option>
              <option value="Deposit">ডিপোজিট</option>
            </select>
          </label>
        </div>

        <table className="data-table">
          <thead>
            <tr>
              <th>টেবিল</th>
              <th>রেকর্ড ID</th>
              <th>ক্রিয়া</th>
              <th>পরিবর্তন</th>
              <th>সময়</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan="5" style={{ textAlign: 'center' }}>লোড হচ্ছে...</td>
              </tr>
            ) : trail.length === 0 ? (
              <tr>
                <td colSpan="5" style={{ textAlign: 'center' }}>কোনো পরিবর্তন পাওয়া যায়নি</td>
              </tr>
            ) : (
              trail.map((item) => {
                const actionColors = {
                  'CREATE': 'success',
                  'UPDATE': 'info',
                  'DELETE': 'danger',
                }
                return (
                  <tr key={item.id}>
                    <td className="cell-title">{item.tableName}</td>
                    <td className="cell-sub">{item.recordId.slice(0, 8)}...</td>
                    <td>
                      <span className={`status-pill ${actionColors[item.action] || 'default'}`}>
                        {item.action === 'CREATE' && 'তৈরি'}
                        {item.action === 'UPDATE' && 'আপডেট'}
                        {item.action === 'DELETE' && 'মুছা'}
                      </span>
                    </td>
                    <td>
                      {item.newValues && Object.keys(item.newValues).length > 0
                        ? `${Object.keys(item.newValues).length} ফিল্ড`
                        : '—'}
                    </td>
                    <td className="cell-sub">
                      {new Date(item.changedAt).toLocaleDateString('bn-BD')} <br />
                      {new Date(item.changedAt).toLocaleTimeString('bn-BD')}
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>

        <div className="pagination-bar">
          <div className="pagination-info">
            পেজ {page} / {pages}
          </div>
          <div className="page-buttons">
            <button
              className="btn ghost small"
              disabled={page <= 1}
              onClick={() => setPage(p => Math.max(1, p - 1))}
            >
              আগের
            </button>
            <button
              className="btn ghost small"
              disabled={page >= pages}
              onClick={() => setPage(p => Math.min(pages, p + 1))}
            >
              পরের
            </button>
          </div>
        </div>
      </div>
    </AppLayout>
  )
}

export default AdminAuditTrail
