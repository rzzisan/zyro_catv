import { useEffect, useState } from 'react'
import AppLayout from '../components/AppLayout.jsx'

const apiBase = import.meta.env.PROD
  ? '/api'
  : import.meta.env.VITE_API_BASE || 'http://localhost:5000'

function AdminCompanies() {
  const [companies, setCompanies] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [status, setStatus] = useState('')
  const [isOpen, setIsOpen] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    packageId: '',
    helplineNumber: '',
    address: '',
    slogan: '',
  })
  const [packages, setPackages] = useState([])
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)

  const token = localStorage.getItem('auth_token')
  const limit = 10

  // লোড করা: কোম্পানি
  useEffect(() => {
    loadCompanies()
  }, [page])

  // লোড করা: প্যাকেজ
  useEffect(() => {
    const loadPackages = async () => {
      if (!token) return
      try {
        const response = await fetch(`${apiBase}/billing/packages`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        const data = await response.json()
        if (response.ok) {
          setPackages(data.data || [])
        }
      } catch (error) {
        console.error('প্যাকেজ লোড ব্যর্থ:', error)
      }
    }
    loadPackages()
  }, [token])

  const loadCompanies = async () => {
    if (!token) return
    setIsLoading(true)
    setStatus('')
    try {
      const response = await fetch(
        `${apiBase}/admin/companies?page=${page}&limit=${limit}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      )
      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || 'কোম্পানি লোড করা যায়নি')
      }
      setCompanies(data.data || [])
      setTotal(data.pagination?.total || 0)
    } catch (error) {
      setStatus(error.message)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!token) return

    setIsLoading(true)
    setStatus('')

    try {
      const response = await fetch(`${apiBase}/admin/companies`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'কোম্পানি তৈরি করা যায়নি')
      }

      setStatus('কোম্পানি সফলভাবে তৈরি হয়েছে')
      setIsOpen(false)
      setFormData({ name: '', packageId: '', helplineNumber: '', address: '', slogan: '' })
      setPage(1)
      await loadCompanies()
    } catch (error) {
      setStatus(error.message)
    } finally {
      setIsLoading(false)
    }
  }

  const pages = Math.ceil(total / limit)

  return (
    <AppLayout title="কোম্পানি" subtitle="কোম্পানি ব্যবস্থাপনা">
      <div className="module-card">
        <div className="module-header">
          <div>
            <div className="module-title">কোম্পানি তালিকা</div>
            <div className="module-sub">মোট {total} টি</div>
          </div>
          <div className="action-buttons">
            <button className="btn primary" onClick={() => setIsOpen(true)}>
              নতুন কোম্পানি
            </button>
          </div>
        </div>

        {status && (
          <div className={`status-banner ${status.includes('সফল') ? 'success' : 'error'}`}>
            {status}
          </div>
        )}

        <table className="data-table">
          <thead>
            <tr>
              <th>কোম্পানি নাম</th>
              <th>প্যাকেজ</th>
              <th>স্ট্যাটাস</th>
              <th>ইউজার</th>
              <th>গ্রাহক</th>
              <th>অ্যাকশন</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan="6" style={{ textAlign: 'center' }}>লোড হচ্ছে...</td>
              </tr>
            ) : companies.length === 0 ? (
              <tr>
                <td colSpan="6" style={{ textAlign: 'center' }}>কোনো কোম্পানি পাওয়া যায়নি</td>
              </tr>
            ) : (
              companies.map((company) => (
                <tr key={company.id}>
                  <td className="cell-title">{company.name}</td>
                  <td>{company.packageName || '—'}</td>
                  <td>
                    <span className={`status-pill ${company.status === 'ACTIVE' ? 'active' : 'inactive'}`}>
                      {company.status === 'ACTIVE' ? 'সক্রিয়' : 'নিষ্ক্রিয়'}
                    </span>
                  </td>
                  <td>{company.userCount}</td>
                  <td>{company.customerCount}</td>
                  <td>
                    <div className="action-buttons">
                      <button className="btn ghost small">এডিট</button>
                    </div>
                  </td>
                </tr>
              ))
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

      <div className={`modal-overlay ${isOpen ? 'is-open' : ''}`}>
        <div className="modal" onClick={(e) => e.stopPropagation()}>
          <div className="modal-header">
            <h3>নতুন কোম্পানি তৈরি করুন</h3>
            <button className="btn outline" onClick={() => setIsOpen(false)}>✕</button>
          </div>
          <form className="auth-form" onSubmit={handleSubmit}>
            <label className="field">
              <span>কোম্পানির নাম *</span>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="যেমন: সিলভার নেট"
              />
            </label>

            <label className="field">
              <span>প্যাকেজ নির্বাচন করুন *</span>
              <select
                required
                value={formData.packageId}
                onChange={(e) => setFormData({ ...formData, packageId: e.target.value })}
              >
                <option value="">-- প্যাকেজ বেছে নিন --</option>
                {packages.map((pkg) => (
                  <option key={pkg.id} value={pkg.id}>
                    {pkg.name} (৳{pkg.price})
                  </option>
                ))}
              </select>
            </label>

            <label className="field">
              <span>হেল্পলাইন নম্বর</span>
              <input
                type="tel"
                value={formData.helplineNumber}
                onChange={(e) => setFormData({ ...formData, helplineNumber: e.target.value })}
                placeholder="যেমন: 01700000000"
              />
            </label>

            <label className="field">
              <span>ঠিকানা</span>
              <input
                type="text"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                placeholder="কোম্পানির ঠিকানা"
              />
            </label>

            <label className="field">
              <span>স্লোগান</span>
              <input
                type="text"
                value={formData.slogan}
                onChange={(e) => setFormData({ ...formData, slogan: e.target.value })}
                placeholder="কোম্পানির স্লোগান"
              />
            </label>

            <div className="modal-actions">
              <button className="btn ghost" type="button" onClick={() => setIsOpen(false)}>
                বাতিল
              </button>
              <button className="btn primary" type="submit" disabled={isLoading}>
                {isLoading ? 'তৈরি করছে...' : 'তৈরি করুন'}
              </button>
            </div>
          </form>
        </div>
        <button className="modal-backdrop" onClick={() => setIsOpen(false)} />
      </div>
    </AppLayout>
  )
}

export default AdminCompanies
