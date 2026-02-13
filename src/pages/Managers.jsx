import { useEffect, useState } from 'react'
import AppLayout from '../components/AppLayout.jsx'

const apiBase = import.meta.env.PROD
  ? '/api'
  : import.meta.env.VITE_API_BASE || 'http://localhost:5000'

function Managers() {
  const [rows, setRows] = useState([])
  const [isOpen, setIsOpen] = useState(false)
  const [form, setForm] = useState({ name: '', mobile: '', password: '' })
  const [status, setStatus] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const loadManagers = async () => {
    const token = localStorage.getItem('auth_token')
    if (!token) return
    setIsLoading(true)
    setStatus('')
    try {
      const response = await fetch(`${apiBase}/users/managers`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || 'ম্যানেজার লোড করা যায়নি')
      }
      setRows(data.data || [])
    } catch (error) {
      setStatus(error.message)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadManagers()
  }, [])

  const handleSubmit = async (event) => {
    event.preventDefault()
    const token = localStorage.getItem('auth_token')
    if (!token) return
    setIsLoading(true)
    setStatus('')
    try {
      const response = await fetch(`${apiBase}/users/managers`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(form),
      })
      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || 'ম্যানেজার তৈরি করা যায়নি')
      }
      setForm({ name: '', mobile: '', password: '' })
      setIsOpen(false)
      await loadManagers()
    } catch (error) {
      setStatus(error.message)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <AppLayout title="ম্যানেজার" subtitle="ম্যানেজার তালিকা ও পারমিশন">
      <div className="module-card">
        <div className="module-header">
          <div>
            <div className="module-title">ম্যানেজার তালিকা</div>
            <div className="module-sub">মোট {rows.length} জন</div>
          </div>
          <button className="btn primary" type="button" onClick={() => setIsOpen(true)}>
            নতুন ম্যানেজার
          </button>
        </div>
        {isLoading ? <div className="module-sub">লোড হচ্ছে...</div> : null}
        <table className="data-table">
          <thead>
            <tr>
              <th>নাম</th>
              <th>মোবাইল</th>
              <th>স্ট্যাটাস</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.mobile}>
                <td>{row.name}</td>
                <td>{row.mobile}</td>
                <td>{row.isActive ? 'সক্রিয়' : 'নিষ্ক্রিয়'}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {status ? <div className="status-banner error">{status}</div> : null}
      </div>

      <div className={`modal-overlay ${isOpen ? 'is-open' : ''}`}>
        <div
          className="modal"
          role="dialog"
          aria-modal="true"
          onClick={(event) => event.stopPropagation()}
        >
          <div className="modal-header">
            <h3>নতুন ম্যানেজার</h3>
            <button className="btn outline" type="button" onClick={() => setIsOpen(false)}>
              ✕
            </button>
          </div>
          <form className="auth-form" onSubmit={handleSubmit}>
            <label className="field">
              <span>নাম</span>
              <input
                type="text"
                value={form.name}
                onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
                placeholder="ম্যানেজারের নাম"
              />
            </label>
            <label className="field">
              <span>মোবাইল নম্বর</span>
              <input
                type="text"
                value={form.mobile}
                onChange={(event) => setForm((prev) => ({ ...prev, mobile: event.target.value }))}
                placeholder="01XXXXXXXXX"
              />
            </label>
            <label className="field">
              <span>পাসওয়ার্ড</span>
              <input
                type="password"
                value={form.password}
                onChange={(event) => setForm((prev) => ({ ...prev, password: event.target.value }))}
                placeholder="কমপক্ষে ৬ অক্ষর"
              />
            </label>
            <div className="modal-actions">
              <button className="btn ghost" type="button" onClick={() => setIsOpen(false)}>
                বন্ধ করুন
              </button>
              <button className="btn primary" type="submit" disabled={isLoading}>
                {isLoading ? 'সেভ হচ্ছে...' : 'সাবমিট'}
              </button>
            </div>
          </form>
        </div>
        <button className="modal-backdrop" type="button" aria-label="Close" onClick={() => setIsOpen(false)} />
      </div>
    </AppLayout>
  )
}

export default Managers
