import { useEffect, useState } from 'react'
import AppLayout from '../components/AppLayout.jsx'

const apiBase = import.meta.env.PROD
  ? '/api'
  : import.meta.env.VITE_API_BASE || 'http://localhost:5000'

function AdminUsers() {
  const [users, setUsers] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [status, setStatus] = useState('')
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [filterRole, setFilterRole] = useState('')

  const token = localStorage.getItem('auth_token')
  const limit = 15

  useEffect(() => {
    loadUsers()
  }, [page, filterRole])

  const loadUsers = async () => {
    if (!token) return
    setIsLoading(true)
    setStatus('')
    try {
      const query = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        ...(filterRole && { role: filterRole }),
      })

      const response = await fetch(`${apiBase}/admin/users?${query}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || 'ইউজার লোড করা যায়নি')
      }
      setUsers(data.data || [])
      setTotal(data.pagination?.total || 0)
    } catch (error) {
      setStatus(error.message)
    } finally {
      setIsLoading(false)
    }
  }

  const handleToggleActive = async (userId, isActive) => {
    if (!token) return
    try {
      const response = await fetch(`${apiBase}/admin/users/${userId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ isActive: !isActive }),
      })
      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || 'আপডেট করা যায়নি')
      }
      setStatus(`ইউজার ${!isActive ? 'সক্রিয়' : 'নিষ্ক্রিয়'} করা হয়েছে`)
      await loadUsers()
    } catch (error) {
      setStatus(error.message)
    }
  }

  const pages = Math.ceil(total / limit)

  return (
    <AppLayout title="ইউজার" subtitle="ইউজার ব্যবস্থাপনা">
      <div className="module-card">
        <div className="module-header">
          <div>
            <div className="module-title">ইউজার তালিকা</div>
            <div className="module-sub">মোট {total} জন</div>
          </div>
        </div>

        {status && (
          <div className={`status-banner ${status.includes('সফল') || status.includes('করা হয়েছে') ? 'success' : 'error'}`}>
            {status}
          </div>
        )}

        <div className="filter-grid">
          <label className="filter-item">
            <span>ভূমিকা</span>
            <select
              value={filterRole}
              onChange={(e) => {
                setFilterRole(e.target.value)
                setPage(1)
              }}
            >
              <option value="">সব ভূমিকা</option>
              <option value="SUPER_ADMIN">সুপার এডমিন</option>
              <option value="ADMIN">এডমিন</option>
              <option value="MANAGER">ম্যানেজার</option>
              <option value="COLLECTOR">কালেক্টর</option>
            </select>
          </label>
        </div>

        <table className="data-table">
          <thead>
            <tr>
              <th>নাম</th>
              <th>মোবাইল</th>
              <th>ইমেইল</th>
              <th>ভূমিকা</th>
              <th>কোম্পানি</th>
              <th>শেষ লগইন</th>
              <th>ক্রিয়া</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan="7" style={{ textAlign: 'center' }}>লোড হচ্ছে...</td>
              </tr>
            ) : users.length === 0 ? (
              <tr>
                <td colSpan="7" style={{ textAlign: 'center' }}>কোনো ইউজার পাওয়া যায়নি</td>
              </tr>
            ) : (
              users.map((user) => {
                const roleColors = {
                  'SUPER_ADMIN': 'danger',
                  'ADMIN': 'warning',
                  'MANAGER': 'info',
                  'COLLECTOR': 'success',
                }
                return (
                  <tr key={user.id}>
                    <td className="cell-title">{user.name}</td>
                    <td>{user.mobile}</td>
                    <td>{user.email || '—'}</td>
                    <td>
                      <span className={`status-pill ${roleColors[user.role] || 'default'}`}>
                        {user.role === 'SUPER_ADMIN' && 'সুপার এডমিন'}
                        {user.role === 'ADMIN' && 'এডমিন'}
                        {user.role === 'MANAGER' && 'ম্যানেজার'}
                        {user.role === 'COLLECTOR' && 'কালেক্টর'}
                      </span>
                    </td>
                    <td>{user.company?.name || '—'}</td>
                    <td>{user.lastLogin ? new Date(user.lastLogin).toLocaleDateString('bn-BD') : 'কখনো নয়'}</td>
                    <td>
                      <button
                        onClick={() => handleToggleActive(user.id, user.isActive)}
                        className={`btn ${user.isActive ? 'outline' : 'ghost'} small`}
                      >
                        {user.isActive ? 'নিষ্ক্রিয়' : 'সক্রিয়'}
                      </button>
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

export default AdminUsers
