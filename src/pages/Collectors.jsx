import { useEffect, useState } from 'react'
import AppLayout from '../components/AppLayout.jsx'

const apiBase = import.meta.env.PROD
  ? '/api'
  : import.meta.env.VITE_API_BASE || 'http://localhost:5000'

function Collectors() {
  const [rows, setRows] = useState([])
  const [isOpen, setIsOpen] = useState(false)
  const [editingCollector, setEditingCollector] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [form, setForm] = useState({ name: '', mobile: '', password: '' })
  const [status, setStatus] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const loadCollectors = async () => {
    const token = localStorage.getItem('auth_token')
    if (!token) return
    setIsLoading(true)
    setStatus('')
    try {
      const response = await fetch(`${apiBase}/users/collectors`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || 'কালেক্টর লোড করা যায়নি')
      }
      setRows(data.data || [])
    } catch (error) {
      setStatus(error.message)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadCollectors()
  }, [])

  const openCreate = () => {
    setEditingCollector(null)
    setForm({ name: '', mobile: '', password: '' })
    setStatus('')
    setIsOpen(true)
  }

  const openEdit = (row) => {
    setEditingCollector(row)
    setForm({ name: row.name, mobile: row.mobile, password: '' })
    setStatus('')
    setIsOpen(true)
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    const token = localStorage.getItem('auth_token')
    if (!token) return
    setIsLoading(true)
    setStatus('')
    try {
      const isEdit = Boolean(editingCollector)
      const endpoint = isEdit ? `${apiBase}/users/collectors/${editingCollector.id}` : `${apiBase}/users/collectors`
      const payload = {
        name: form.name,
        mobile: form.mobile,
        ...(form.password ? { password: form.password } : {}),
      }
      const response = await fetch(endpoint, {
        method: isEdit ? 'PATCH' : 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      })
      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || (isEdit ? 'কালেক্টর আপডেট করা যায়নি' : 'কালেক্টর তৈরি করা যায়নি'))
      }
      setForm({ name: '', mobile: '', password: '' })
      setEditingCollector(null)
      setIsOpen(false)
      await loadCollectors()
    } catch (error) {
      setStatus(error.message)
    } finally {
      setIsLoading(false)
    }
  }

  const handleDelete = async (row) => {
    const token = localStorage.getItem('auth_token')
    if (!token) return
    setIsLoading(true)
    setStatus('')
    try {
      const response = await fetch(`${apiBase}/users/collectors/${row.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || 'কালেক্টর ডিলিট করা যায়নি')
      }
      await loadCollectors()
    } catch (error) {
      setStatus(error.message)
    } finally {
      setIsLoading(false)
    }
  }

  const openDelete = (row) => {
    setDeleteTarget(row)
  }

  const closeDelete = () => {
    setDeleteTarget(null)
  }

  const confirmDelete = async () => {
    if (!deleteTarget) return
    await handleDelete(deleteTarget)
    setDeleteTarget(null)
  }

  return (
    <AppLayout title="কালেক্টর" subtitle="কালেক্টর তালিকা">
      <div className="module-card">
        <div className="module-header">
          <div>
            <div className="module-title">কালেক্টর তালিকা</div>
            <div className="module-sub">মোট {rows.length} জন</div>
          </div>
          <button className="btn primary" type="button" onClick={openCreate}>
            নতুন কালেক্টর
          </button>
        </div>
        {isLoading ? <div className="module-sub">লোড হচ্ছে...</div> : null}
        <table className="data-table">
          <thead>
            <tr>
              <th>নাম</th>
              <th>মোবাইল</th>
              <th>এরিয়া</th>
              <th>অ্যাকশন</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id}>
                <td>{row.name}</td>
                <td>{row.mobile}</td>
                <td>—</td>
                <td>
                  <div className="action-stack">
                    <button className="btn ghost" type="button" onClick={() => openEdit(row)}>
                      এডিট
                    </button>
                    <button className="btn outline" type="button" onClick={() => openDelete(row)}>
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
            <h3>{editingCollector ? 'কালেক্টর এডিট করুন' : 'নতুন কালেক্টর'}</h3>
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
                placeholder="কালেক্টরের নাম"
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
                placeholder={editingCollector ? 'নতুন পাসওয়ার্ড (ঐচ্ছিক)' : 'কমপক্ষে ৬ অক্ষর'}
              />
            </label>
            <div className="modal-actions">
              <button className="btn ghost" type="button" onClick={() => setIsOpen(false)}>
                বন্ধ করুন
              </button>
              <button className="btn primary" type="submit" disabled={isLoading}>
                {isLoading ? 'সেভ হচ্ছে...' : editingCollector ? 'আপডেট' : 'সাবমিট'}
              </button>
            </div>
          </form>
        </div>
        <button className="modal-backdrop" type="button" aria-label="Close" onClick={() => setIsOpen(false)} />
      </div>

      <div className={`modal-overlay ${deleteTarget ? 'is-open' : ''}`}>
        <div
          className="modal"
          role="dialog"
          aria-modal="true"
          onClick={(event) => event.stopPropagation()}
        >
          <div className="modal-header">
            <h3>কালেক্টর ডিলিট</h3>
            <button className="btn outline" type="button" onClick={closeDelete}>
              ✕
            </button>
          </div>
          <div className="module-sub">
            আপনি কি নিশ্চিত? {deleteTarget?.name} ডিলিট হয়ে যাবে।
          </div>
          <div className="modal-actions">
            <button className="btn ghost" type="button" onClick={closeDelete}>
              না, থাক
            </button>
            <button className="btn outline" type="button" onClick={confirmDelete} disabled={isLoading}>
              {isLoading ? 'ডিলিট হচ্ছে...' : 'হ্যাঁ, ডিলিট'}
            </button>
          </div>
        </div>
        <button className="modal-backdrop" type="button" aria-label="Close" onClick={closeDelete} />
      </div>
    </AppLayout>
  )
}

export default Collectors
