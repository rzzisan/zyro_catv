import { useEffect, useMemo, useState } from 'react'
import AppLayout from '../components/AppLayout.jsx'

const apiBase = import.meta.env.PROD
  ? '/api'
  : import.meta.env.VITE_API_BASE || 'http://localhost:5000'

const emptyForm = {
  settingKey: '',
  settingValue: '',
  category: 'general',
  description: '',
  isEnvironment: false,
}

function AdminSettings() {
  const [settings, setSettings] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [status, setStatus] = useState('')
  const [search, setSearch] = useState('')
  const [isOpen, setIsOpen] = useState(false)
  const [editingKey, setEditingKey] = useState(null)
  const [formData, setFormData] = useState(emptyForm)

  const token = localStorage.getItem('auth_token')

  useEffect(() => {
    loadSettings()
  }, [])

  const loadSettings = async () => {
    if (!token) return
    setIsLoading(true)
    setStatus('')
    try {
      const response = await fetch(`${apiBase}/admin/system-settings`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || 'সেটিংস লোড করা যায়নি')
      }
      const grouped = data.data || {}
      const normalized = Object.entries(grouped).flatMap(([category, items]) =>
        (items || []).map((item) => ({ ...item, category }))
      )
      setSettings(normalized)
    } catch (error) {
      setStatus(error.message)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSave = async () => {
    if (!token) return
    const isEditing = Boolean(editingKey)
    const endpoint = isEditing
      ? `${apiBase}/admin/system-settings/${editingKey}`
      : `${apiBase}/admin/system-settings`
    const payload = isEditing
      ? {
          value: formData.settingValue,
          category: formData.category,
          description: formData.description,
          isEnvironment: formData.isEnvironment,
        }
      : {
          key: formData.settingKey,
          value: formData.settingValue,
          category: formData.category,
          description: formData.description,
          isEnvironment: formData.isEnvironment,
        }

    try {
      const response = await fetch(endpoint, {
        method: isEditing ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'সেটিংস সংরক্ষণ করা যায়নি')
      }

      setStatus(isEditing ? 'সেটিংস সফলভাবে সংরক্ষণ করা হয়েছে' : 'সেটিংস তৈরি হয়েছে')
      setEditingKey(null)
      setFormData(emptyForm)
      setIsOpen(false)
      await loadSettings()
    } catch (error) {
      setStatus(error.message)
    }
  }

  const categoryLabels = {
    general: 'সাধারণ সেটিংস',
    security: 'নিরাপত্তা সেটিংস',
    email: 'ইমেইল সেটিংস',
    sms: 'এসএমএস সেটিংস',
    api: 'এপিআই সেটিংস',
  }

  const groupedSettings = useMemo(() => {
    const query = search.trim().toLowerCase()
    const filtered = settings.filter((setting) => {
      if (!query) return true
      return (
        setting.settingKey?.toLowerCase().includes(query) ||
        setting.settingValue?.toString().toLowerCase().includes(query) ||
        setting.description?.toLowerCase().includes(query) ||
        setting.category?.toLowerCase().includes(query)
      )
    })

    return filtered.reduce((acc, setting) => {
      const group = setting.category || 'general'
      if (!acc[group]) acc[group] = []
      acc[group].push(setting)
      return acc
    }, {})
  }, [settings, search])

  const formatDateTime = (value) =>
    value
      ? new Date(value).toLocaleString('bn-BD', { dateStyle: 'medium', timeStyle: 'short' })
      : 'পাওয়া যায়নি'

  const openCreate = () => {
    setEditingKey(null)
    setFormData(emptyForm)
    setIsOpen(true)
  }

  const openEdit = (setting) => {
    setEditingKey(setting.settingKey)
    setFormData({
      settingKey: setting.settingKey || '',
      settingValue: setting.settingValue || '',
      category: setting.category || 'general',
      description: setting.description || '',
      isEnvironment: Boolean(setting.isEnvironment),
    })
    setIsOpen(true)
  }

  return (
    <AppLayout title="সিস্টেম সেটিংস" subtitle="বৈশ্বিক কনফিগারেশন">
      <div className="module-card">
        <div className="module-header">
          <div>
            <div className="module-title">সিস্টেম সেটিংস</div>
            <div className="module-sub">বৈশ্বিক সিস্টেম কনফিগারেশন পরিচালনা করুন</div>
          </div>
          <div className="action-buttons">
            <button className="btn primary" type="button" onClick={openCreate}>
              নতুন সেটিং
            </button>
          </div>
        </div>

        {status ? (
          <div className={`status-banner ${status.includes('সফল') || status.includes('তৈরি') ? 'success' : 'error'}`}>
            {status}
          </div>
        ) : null}

        <div className="filter-grid">
          <label className="filter-item search">
            <span>সার্চ</span>
            <input
              type="text"
              placeholder="কী, ভ্যালু বা ক্যাটাগরি"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </label>
        </div>

        {isLoading ? (
          <div className="module-sub">লোড হচ্ছে...</div>
        ) : (
          <div style={{ display: 'grid', gap: '1.5rem' }}>
            {Object.keys(groupedSettings).length === 0 ? (
              <div className="module-sub">কোনো সেটিং পাওয়া যায়নি</div>
            ) : (
              Object.entries(groupedSettings).map(([category, items]) => (
                <div key={category} className="panel-card">
                  <div className="panel-header">
                    <div>
                      <div className="table-title">{categoryLabels[category] || category}</div>
                      <div className="table-sub">মোট {items.length} টি সেটিং</div>
                    </div>
                  </div>

                  <div className="table-scroll">
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>কী</th>
                          <th>ভ্যালু</th>
                          <th>বর্ণনা</th>
                          <th>আপডেট</th>
                          <th>অবস্থা</th>
                          <th>অ্যাকশন</th>
                        </tr>
                      </thead>
                      <tbody>
                        {items.map((setting) => (
                          <tr key={setting.settingKey}>
                            <td>
                              <div className="cell-title">{setting.settingKey}</div>
                              <div className="cell-sub">{setting.category || 'general'}</div>
                            </td>
                            <td>{setting.settingValue || '—'}</td>
                            <td>{setting.description || '—'}</td>
                            <td>{formatDateTime(setting.updatedAt)}</td>
                            <td>
                              <span className={`status-pill ${setting.isEnvironment ? 'paid' : 'closed'}`}>
                                {setting.isEnvironment ? 'ENV' : 'CUSTOM'}
                              </span>
                            </td>
                            <td>
                              <button
                                className="btn outline small"
                                type="button"
                                onClick={() => openEdit(setting)}
                              >
                                সম্পাদনা
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      <div className={`modal-overlay ${isOpen ? 'is-open' : ''}`}>
        <div className="modal" role="dialog" aria-modal="true">
          <div className="modal-header">
            <h3>{editingKey ? 'সেটিংস আপডেট' : 'নতুন সেটিংস'}</h3>
            <button className="btn outline" type="button" onClick={() => setIsOpen(false)}>
              ✕
            </button>
          </div>
          <form
            className="auth-form"
            onSubmit={(event) => {
              event.preventDefault()
              handleSave()
            }}
          >
            <div className="form-grid">
              <label className="field">
                <span>সেটিং কী</span>
                <input
                  type="text"
                  value={formData.settingKey}
                  onChange={(event) =>
                    setFormData((prev) => ({ ...prev, settingKey: event.target.value }))
                  }
                  placeholder="SYSTEM_NAME"
                  disabled={Boolean(editingKey)}
                  required
                />
              </label>
              <label className="field">
                <span>ভ্যালু</span>
                <input
                  type="text"
                  value={formData.settingValue}
                  onChange={(event) =>
                    setFormData((prev) => ({ ...prev, settingValue: event.target.value }))
                  }
                  required
                />
              </label>
              <label className="field">
                <span>ক্যাটাগরি</span>
                <select
                  value={formData.category}
                  onChange={(event) =>
                    setFormData((prev) => ({ ...prev, category: event.target.value }))
                  }
                >
                  <option value="general">general</option>
                  <option value="security">security</option>
                  <option value="email">email</option>
                  <option value="sms">sms</option>
                  <option value="api">api</option>
                </select>
              </label>
              <label className="field">
                <span>বর্ণনা</span>
                <input
                  type="text"
                  value={formData.description}
                  onChange={(event) =>
                    setFormData((prev) => ({ ...prev, description: event.target.value }))
                  }
                  placeholder="এই সেটিংস এর বিবরণ"
                />
              </label>
              <label className="field">
                <span>এনভায়রনমেন্ট সেটিং</span>
                <select
                  value={formData.isEnvironment ? 'true' : 'false'}
                  onChange={(event) =>
                    setFormData((prev) => ({ ...prev, isEnvironment: event.target.value === 'true' }))
                  }
                >
                  <option value="false">না</option>
                  <option value="true">হ্যাঁ</option>
                </select>
              </label>
            </div>
            <div className="modal-actions">
              <button className="btn ghost" type="button" onClick={() => setIsOpen(false)}>
                বন্ধ করুন
              </button>
              <button className="btn primary" type="submit" disabled={isLoading}>
                {isLoading ? 'সেভ হচ্ছে...' : editingKey ? 'আপডেট' : 'তৈরি করুন'}
              </button>
            </div>
          </form>
        </div>
        <button
          className="modal-backdrop"
          type="button"
          aria-label="Close"
          onClick={() => setIsOpen(false)}
        />
      </div>
    </AppLayout>
  )
}

export default AdminSettings
