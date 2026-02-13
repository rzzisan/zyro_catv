import { useEffect, useMemo, useState } from 'react'
import AppLayout from '../components/AppLayout.jsx'

const apiBase = import.meta.env.PROD
  ? '/api'
  : import.meta.env.VITE_API_BASE || 'http://localhost:5000'

function Areas() {
  const [rows, setRows] = useState([])
  const [query, setQuery] = useState('')
  const [isOpen, setIsOpen] = useState(false)
  const [form, setForm] = useState({ name: '' })
  const [status, setStatus] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const filteredRows = useMemo(() => {
    const needle = query.trim()
    if (!needle) return rows
    return rows.filter((row) => row.name.includes(needle))
  }, [rows, query])

  const loadAreas = async () => {
    const token = localStorage.getItem('auth_token')
    if (!token) return
    setIsLoading(true)
    setStatus('')
    try {
      const response = await fetch(`${apiBase}/areas`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || 'এরিয়া লোড করা যায়নি')
      }
      setRows(data.data || [])
    } catch (error) {
      setStatus(error.message)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadAreas()
  }, [])

  const handleSubmit = async (event) => {
    event.preventDefault()
    const token = localStorage.getItem('auth_token')
    if (!token) return
    setIsLoading(true)
    setStatus('')
    try {
      const response = await fetch(`${apiBase}/areas`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(form),
      })
      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || 'এরিয়া তৈরি করা যায়নি')
      }
      setForm({ name: '' })
      setIsOpen(false)
      await loadAreas()
    } catch (error) {
      setStatus(error.message)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <AppLayout title="এরিয়া" subtitle="এরিয়া ভিত্তিক কালেক্টর তালিকা">
      <div className="module-card">
        <div className="module-header">
          <div>
            <div className="module-title">সকল এরিয়া</div>
            <div className="module-sub">মোট {filteredRows.length} টি</div>
          </div>
          <button className="btn primary" type="button" onClick={() => setIsOpen(true)}>
            নতুন এরিয়া
          </button>
        </div>
        <div className="table-header">
          <input
            className="search-box"
            type="text"
            placeholder="এরিয়া সার্চ"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
          {isLoading ? <span className="table-sub">লোড হচ্ছে...</span> : null}
        </div>
        <table className="data-table">
          <thead>
            <tr>
              <th>এরিয়া</th>
              <th>কালেক্টর</th>
              <th>অ্যাকশন</th>
            </tr>
          </thead>
          <tbody>
            {filteredRows.map((row) => (
              <tr key={row.name}>
                <td>{row.name}</td>
                <td>—</td>
                <td className="table-action">•••</td>
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
            <h3>নতুন এরিয়া</h3>
            <button className="btn outline" type="button" onClick={() => setIsOpen(false)}>
              ✕
            </button>
          </div>
          <form className="auth-form" onSubmit={handleSubmit}>
            <label className="field">
              <span>এরিয়ার নাম</span>
              <input
                type="text"
                value={form.name}
                onChange={(event) => setForm({ name: event.target.value })}
                placeholder="এরিয়ার নাম লিখুন"
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

export default Areas
