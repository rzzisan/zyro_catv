import { useEffect, useMemo, useState } from 'react'
import AppLayout from '../components/AppLayout.jsx'

const apiBase = import.meta.env.PROD
  ? '/api'
  : import.meta.env.VITE_API_BASE || 'http://localhost:5000'

function CustomerTypes() {
  const [rows, setRows] = useState([])
  const [query, setQuery] = useState('')
  const [isOpen, setIsOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState({ name: '' })
  const [status, setStatus] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const filteredRows = useMemo(() => {
    const needle = query.trim()
    if (!needle) return rows
    return rows.filter((row) => row.name.includes(needle))
  }, [rows, query])

  const loadTypes = async () => {
    const token = localStorage.getItem('auth_token')
    if (!token) return
    setIsLoading(true)
    setStatus('')
    try {
      const response = await fetch(`${apiBase}/customer-types`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || 'গ্রাহক টাইপ লোড করা যায়নি')
      }
      setRows(data.data || [])
    } catch (error) {
      setStatus(error.message)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadTypes()
  }, [])

  const handleSubmit = async (event) => {
    event.preventDefault()
    const token = localStorage.getItem('auth_token')
    if (!token) return
    setIsLoading(true)
    setStatus('')
    try {
      const isEdit = Boolean(editing)
      const url = isEdit
        ? `${apiBase}/customer-types/${editing.id}`
        : `${apiBase}/customer-types`
      const response = await fetch(url, {
        method: isEdit ? 'PATCH' : 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(form),
      })
      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || 'গ্রাহক টাইপ তৈরি করা যায়নি')
      }
      setForm({ name: '' })
      setEditing(null)
      setIsOpen(false)
      await loadTypes()
    } catch (error) {
      setStatus(error.message)
    } finally {
      setIsLoading(false)
    }
  }

  const handleEdit = (row) => {
    setEditing(row)
    setForm({ name: row.name })
    setIsOpen(true)
  }

  const handleDelete = async (row) => {
    const token = localStorage.getItem('auth_token')
    if (!token) return
    const ok = window.confirm(`"${row.name}" ডিলিট করবেন?`)
    if (!ok) return
    setIsLoading(true)
    setStatus('')
    try {
      const response = await fetch(`${apiBase}/customer-types/${row.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || 'ডিলিট করা যায়নি')
      }
      await loadTypes()
    } catch (error) {
      setStatus(error.message)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <AppLayout title="গ্রাহক টাইপ" subtitle="ডিজিটাল, অনালোগ সহ টাইপ তৈরি">
      <div className="module-card">
        <div className="module-header">
          <div>
            <div className="module-title">গ্রাহক টাইপ তালিকা</div>
            <div className="module-sub">মোট {filteredRows.length} টি</div>
          </div>
          <button
            className="btn primary"
            type="button"
            onClick={() => {
              setEditing(null)
              setForm({ name: '' })
              setIsOpen(true)
            }}
          >
            নতুন টাইপ
          </button>
        </div>

        <div className="table-header">
          <input
            className="search-box"
            type="text"
            placeholder="টাইপ সার্চ"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
          {isLoading ? <span className="table-sub">লোড হচ্ছে...</span> : null}
        </div>

        <table className="data-table">
          <thead>
            <tr>
              <th>টাইপ</th>
              <th>অ্যাকশন</th>
            </tr>
          </thead>
          <tbody>
            {filteredRows.map((row) => (
              <tr key={row.id}>
                <td>{row.name}</td>
                <td>
                  <div className="action-buttons">
                    <button className="btn ghost small" type="button" onClick={() => handleEdit(row)}>
                      এডিট
                    </button>
                    <button className="btn outline small" type="button" onClick={() => handleDelete(row)}>
                      ডিলিট
                    </button>
                  </div>
                </td>
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
            <h3>{editing ? 'গ্রাহক টাইপ এডিট' : 'নতুন গ্রাহক টাইপ'}</h3>
            <button className="btn outline" type="button" onClick={() => setIsOpen(false)}>
              ✕
            </button>
          </div>
          <form className="auth-form" onSubmit={handleSubmit}>
            <label className="field">
              <span>টাইপ নাম</span>
              <input
                type="text"
                value={form.name}
                onChange={(event) => setForm({ name: event.target.value })}
                placeholder="ডিজিটাল / অনালোগ"
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

export default CustomerTypes
