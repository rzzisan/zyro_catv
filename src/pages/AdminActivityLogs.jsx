import { useEffect, useState } from 'react'
import AppLayout from '../components/AppLayout.jsx'

const apiBase = import.meta.env.PROD
  ? '/api'
  : import.meta.env.VITE_API_BASE || 'http://localhost:5000'

function AdminActivityLogs() {
  const [logs, setLogs] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [status, setStatus] = useState('')
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [filterAction, setFilterAction] = useState('')

  const token = localStorage.getItem('auth_token')
  const limit = 20

  useEffect(() => {
    loadLogs()
  }, [page, filterAction])

  const loadLogs = async () => {
    if (!token) return
    setIsLoading(true)
    setStatus('')
    try {
      const query = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        ...(filterAction && { action: filterAction }),
      })

      const response = await fetch(`${apiBase}/admin/activity-logs?${query}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || 'লগ লোড করা যায়নি')
      }
      setLogs(data.data || [])
      setTotal(data.pagination?.total || 0)
    } catch (error) {
      setStatus(error.message)
    } finally {
      setIsLoading(false)
    }
  }

  const pages = Math.ceil(total / limit)

  return (
    <AppLayout title="কার্যক্রম লগ" subtitle="সিস্টেম কার্যক্রম রেকর্ড">
      <div className="module-card">
        <div className="module-header">
          <div>
            <div className="module-title">কার্যক্রম লগ</div>
            <div className="module-sub">মোট {total} টি রেকর্ড</div>
          </div>
        </div>

        {status && (
          <div className="status-banner error">{status}</div>
        )}

        <div className="filter-grid">
          <label className="filter-item">
            <span>ক্রিয়াকলাপ</span>
            <select
              value={filterAction}
              onChange={(e) => {
                setFilterAction(e.target.value)
                setPage(1)
              }}
            >
              <option value="">সব ক্রিয়াকলাপ</option>
              <option value="CREATE">তৈরি</option>
              <option value="UPDATE">আপডেট</option>
              <option value="DELETE">মুছা</option>
              <option value="LOGIN">লগইন</option>
              <option value="LOGOUT">লগআউট</option>
              <option value="EXPORT">এক্সপোর্ট</option>
              <option value="IMPORT">ইমপোর্ট</option>
              <option value="APPROVE">অনুমোদন</option>
              <option value="REJECT">বর্জন</option>
            </select>
          </label>
        </div>

        <table className="data-table">
          <thead>
            <tr>
              <th>সময়</th>
              <th>ক্রিয়াকলাপ</th>
              <th>সত্ত্বা</th>
              <th>অবস্থা</th>
              <th>IP অ্যাড্রেস</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan="5" style={{ textAlign: 'center' }}>লোড হচ্ছে...</td>
              </tr>
            ) : logs.length === 0 ? (
              <tr>
                <td colSpan="5" style={{ textAlign: 'center' }}>কোনো লগ পাওয়া যায়নি</td>
              </tr>
            ) : (
              logs.map((log) => {
                const actionColors = {
                  'CREATE': 'success',
                  'UPDATE': 'info',
                  'DELETE': 'danger',
                  'LOGIN': 'warning',
                  'LOGOUT': 'default',
                  'EXPORT': 'warning',
                  'IMPORT': 'warning',
                  'APPROVE': 'success',
                  'REJECT': 'danger',
                }
                return (
                  <tr key={log.id}>
                    <td>
                      <div className="cell-sub">{new Date(log.createdAt).toLocaleDateString('bn-BD')}</div>
                      <div className="cell-sub">{new Date(log.createdAt).toLocaleTimeString('bn-BD')}</div>
                    </td>
                    <td>
                      <span className={`status-pill ${actionColors[log.action] || 'default'}`}>
                        {log.action}
                      </span>
                    </td>
                    <td>{log.entityType}</td>
                    <td>
                      <span className={`status-pill ${log.status === 'SUCCESS' ? 'success' : log.status === 'FAILED' ? 'danger' : 'warning'}`}>
                        {log.status === 'SUCCESS' && 'সফল'}
                        {log.status === 'FAILED' && 'ব্যর্থ'}
                        {log.status === 'PENDING' && 'পেন্ডিং'}
                      </span>
                    </td>
                    <td>{log.ipAddress || '—'}</td>
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

export default AdminActivityLogs
