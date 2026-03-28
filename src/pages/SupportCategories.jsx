import { useEffect, useMemo, useState } from 'react'
import AppLayout from '../components/AppLayout.jsx'

const apiBase = import.meta.env.PROD
  ? '/api'
  : import.meta.env.VITE_API_BASE || 'http://localhost:5000'

function SupportCategories() {
  const [rows, setRows] = useState([])
  const [query, setQuery] = useState('')
  const [isOpen, setIsOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState({ name: '', description: '', isActive: true })
  const [status, setStatus] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const filteredRows = useMemo(() => {
    const needle = query.trim().toLowerCase()
    if (!needle) return rows
    return rows.filter(
      (row) =>
        row.name.toLowerCase().includes(needle)
        || String(row.description || '').toLowerCase().includes(needle)
    )
  }, [rows, query])

  const loadCategories = async () => {
    const token = localStorage.getItem('auth_token')
    if (!token) return
    setIsLoading(true)
    setStatus('')
    try {
      const response = await fetch(`${apiBase}/support-categories`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'সাপোর্ট ক্যাটাগরি লোড করা যায়নি')
      setRows(data.data || [])
    } catch (error) {
      setStatus(error.message)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadCategories()
  }, [])

  const closeModal = () => {
    setIsOpen(false)
    setEditing(null)
    setForm({ name: '', description: '', isActive: true })
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    const token = localStorage.getItem('auth_token')
    if (!token) return
    setIsLoading(true)
    setStatus('')

    try {
      const isEdit = Boolean(editing)
      const url = isEdit
        ? `${apiBase}/support-categories/${editing.id}`
        : `${apiBase}/support-categories`
      const method = isEdit ? 'PATCH' : 'POST'

      const payload = {
        name: form.name,
        description: form.description,
        isActive: form.isActive,
      }

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'সেভ করা যায়নি')

      closeModal()
      await loadCategories()
    } catch (error) {
      setStatus(error.message)
    } finally {
      setIsLoading(false)
    }
  }

  const handleEdit = (row) => {
    setEditing(row)
    setForm({
      name: row.name,
      description: row.description || '',
      isActive: row.isActive,
    })
    setIsOpen(true)
  }

  const handleDelete = async (row) => {
    const token = localStorage.getItem('auth_token')
    if (!token) return

    const ok = window.confirm(`"${row.name}" ক্যাটাগরি ডিলিট করবেন?`)
    if (!ok) return

    setIsLoading(true)
    setStatus('')
    try {
      const response = await fetch(`${apiBase}/support-categories/${row.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'ডিলিট করা যায়নি')
      await loadCategories()
    } catch (error) {
      setStatus(error.message)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <AppLayout title="সাপোর্ট ক্যাটাগরী" subtitle="অ্যাডমিন এখানে সাপোর্ট ক্যাটাগরি ম্যানেজ করবে">
      <div className="module-card">
        <div className="module-header">
          <div>
            <div className="module-title">সাপোর্ট ক্যাটাগরি তালিকা</div>
            <div className="module-sub">মোট {filteredRows.length} টি</div>
          </div>
          <button
            className="btn primary"
            type="button"
            onClick={() => {
              setEditing(null)
              setForm({ name: '', description: '', isActive: true })
              setIsOpen(true)
            }}
          >
            নতুন ক্যাটাগরি
          </button>
        </div>

        <div className="table-header">
          <input
            className="search-box"
            type="text"
            placeholder="ক্যাটাগরি সার্চ"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
          {isLoading ? <span className="table-sub">লোড হচ্ছে...</span> : null}
        </div>

        <table className="data-table">
          <thead>
            <tr>
              <th>নাম</th>
              <th>বিবরণ</th>
              <th>স্ট্যাটাস</th>
              <th>অ্যাকশন</th>
            </tr>
          </thead>
          <tbody>
            {filteredRows.map((row) => (
              <tr key={row.id}>
                <td>{row.name}</td>
                <td>{row.description || '—'}</td>
                <td>{row.isActive ? 'ACTIVE' : 'INACTIVE'}</td>
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
        <div className="modal" role="dialog" aria-modal="true" onClick={(event) => event.stopPropagation()}>
          <div className="modal-header">
            <h3>{editing ? 'সাপোর্ট ক্যাটাগরি এডিট' : 'নতুন সাপোর্ট ক্যাটাগরি'}</h3>
            <button className="btn outline" type="button" onClick={closeModal}>
              ✕
            </button>
          </div>

          <form className="auth-form" onSubmit={handleSubmit}>
            <label className="field">
              <span>ক্যাটাগরি নাম</span>
              <input
                type="text"
                value={form.name}
                onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
                placeholder="Billing / Technical / App Issue"
              />
            </label>

            <label className="field">
              <span>বিবরণ</span>
              <textarea
                value={form.description}
                onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))}
                rows={4}
                style={{
                  border: '1px solid #e6e1d7',
                  borderRadius: 12,
                  padding: '0.7rem 0.9rem',
                  background: '#fffaf2',
                  fontSize: '0.95rem',
                  color: 'var(--ink)',
                  resize: 'vertical',
                }}
              />
            </label>

            <label className="field" style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <span>Active</span>
              <input
                type="checkbox"
                checked={form.isActive}
                onChange={(event) => setForm((prev) => ({ ...prev, isActive: event.target.checked }))}
              />
            </label>

            <div className="modal-actions">
              <button className="btn ghost" type="button" onClick={closeModal}>বন্ধ করুন</button>
              <button className="btn primary" type="submit" disabled={isLoading}>
                {isLoading ? 'সেভ হচ্ছে...' : 'সাবমিট'}
              </button>
            </div>
          </form>
        </div>
        <button className="modal-backdrop" type="button" aria-label="Close" onClick={closeModal} />
      </div>
    </AppLayout>
  )
}

export default SupportCategories
