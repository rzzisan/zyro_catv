import { useEffect, useState } from 'react'
import AppLayout from '../components/AppLayout.jsx'

const apiBase = import.meta.env.PROD
  ? '/api'
  : import.meta.env.VITE_API_BASE || 'http://localhost:5000'

function AdminSupportTickets() {
  const [tickets, setTickets] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [status, setStatus] = useState('')
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [filterStatus, setFilterStatus] = useState('')

  const token = localStorage.getItem('auth_token')
  const limit = 15

  useEffect(() => {
    loadTickets()
  }, [page, filterStatus])

  const loadTickets = async () => {
    if (!token) return
    setIsLoading(true)
    setStatus('')
    try {
      const query = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        ...(filterStatus && { status: filterStatus }),
      })

      const response = await fetch(`${apiBase}/admin/support-tickets?${query}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || 'টিকেট লোড করা যায়নি')
      }
      setTickets(data.data || [])
      setTotal(data.pagination?.total || 0)
    } catch (error) {
      setStatus(error.message)
    } finally {
      setIsLoading(false)
    }
  }

  const pages = Math.ceil(total / limit)

  return (
    <AppLayout title="সাপোর্ট টিকেট" subtitle="গ্রাহক সমস্যা ব্যবস্থাপনা">
      <div className="module-card">
        <div className="module-header">
          <div>
            <div className="module-title">সাপোর্ট টিকেট</div>
            <div className="module-sub">মোট {total} টি</div>
          </div>
        </div>

        {status && (
          <div className="status-banner error">{status}</div>
        )}

        <div className="filter-grid">
          <label className="filter-item">
            <span>অবস্থা</span>
            <select
              value={filterStatus}
              onChange={(e) => {
                setFilterStatus(e.target.value)
                setPage(1)
              }}
            >
              <option value="">সব অবস্থা</option>
              <option value="OPEN">খোলা</option>
              <option value="IN_PROGRESS">চলমান</option>
              <option value="RESOLVED">সমাধান</option>
              <option value="CLOSED">বন্ধ</option>
            </select>
          </label>
        </div>

        <table className="data-table">
          <thead>
            <tr>
              <th>টিকেট নম্বর</th>
              <th>শিরোনাম</th>
              <th>অগ্রাধিকার</th>
              <th>অবস্থা</th>
              <th>কোম্পানি</th>
              <th>তৈরি</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan="6" style={{ textAlign: 'center' }}>লোড হচ্ছে...</td>
              </tr>
            ) : tickets.length === 0 ? (
              <tr>
                <td colSpan="6" style={{ textAlign: 'center' }}>কোনো টিকেট পাওয়া যায়নি</td>
              </tr>
            ) : (
              tickets.map((ticket) => {
                const priorityColors = {
                  'LOW': 'default',
                  'MEDIUM': 'info',
                  'HIGH': 'warning',
                  'CRITICAL': 'danger',
                }
                const statusColors = {
                  'OPEN': 'info',
                  'IN_PROGRESS': 'warning',
                  'RESOLVED': 'success',
                  'CLOSED': 'default',
                  'ESCALATED': 'danger',
                }
                return (
                  <tr key={ticket.id}>
                    <td className="cell-sub">{ticket.ticketNumber}</td>
                    <td className="cell-title">{ticket.title}</td>
                    <td>
                      <span className={`status-pill ${priorityColors[ticket.priority]}`}>
                        {ticket.priority === 'LOW' && 'কম'}
                        {ticket.priority === 'MEDIUM' && 'মাঝারি'}
                        {ticket.priority === 'HIGH' && 'বেশি'}
                        {ticket.priority === 'CRITICAL' && 'জরুরি'}
                      </span>
                    </td>
                    <td>
                      <span className={`status-pill ${statusColors[ticket.status]}`}>
                        {ticket.status === 'OPEN' && 'খোলা'}
                        {ticket.status === 'IN_PROGRESS' && 'চলমান'}
                        {ticket.status === 'RESOLVED' && 'সমাধান'}
                        {ticket.status === 'CLOSED' && 'বন্ধ'}
                        {ticket.status === 'ESCALATED' && 'বৃদ্ধি'}
                      </span>
                    </td>
                    <td>{ticket.company?.name || '—'}</td>
                    <td>{new Date(ticket.createdAt).toLocaleDateString('bn-BD')}</td>
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

export default AdminSupportTickets
