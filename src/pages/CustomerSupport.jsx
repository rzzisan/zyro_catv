import { useEffect, useMemo, useState } from 'react'
import AppLayout from '../components/AppLayout.jsx'

const apiBase = import.meta.env.PROD
  ? '/api'
  : import.meta.env.VITE_API_BASE || 'http://localhost:5000'

const priorityOptions = [
  { value: 'LOW', label: 'Low' },
  { value: 'MEDIUM', label: 'Medium' },
  { value: 'HIGH', label: 'High' },
  { value: 'CRITICAL', label: 'Critical' },
]

const statusOptions = [
  { value: '', label: 'সব স্ট্যাটাস' },
  { value: 'OPEN', label: 'OPEN' },
  { value: 'IN_PROGRESS', label: 'IN_PROGRESS' },
  { value: 'RESOLVED', label: 'RESOLVED' },
  { value: 'CLOSED', label: 'CLOSED' },
  { value: 'ESCALATED', label: 'ESCALATED' },
]

const guestFilterOptions = [
  { value: '', label: 'সব টিকেট' },
  { value: 'false', label: 'কাস্টমার টিকেট' },
  { value: 'true', label: 'গেস্ট টিকেট' },
]

const priorityClass = (p) => {
  if (p === 'LOW') return 'advance'
  if (p === 'MEDIUM') return 'free'
  if (p === 'HIGH') return 'due'
  if (p === 'CRITICAL') return 'closed'
  return 'closed'
}

const statusClass = (s) => {
  if (s === 'OPEN') return 'advance'
  if (s === 'IN_PROGRESS') return 'free'
  if (s === 'RESOLVED') return 'paid'
  if (s === 'CLOSED') return 'closed'
  if (s === 'ESCALATED') return 'due'
  return 'closed'
}

function CustomerSupport() {
  const [rows, setRows] = useState([])
  const [categories, setCategories] = useState([])
  const [status, setStatus] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isModalOpen, setIsModalOpen] = useState(false)

  const [filters, setFilters] = useState({
    status: '',
    category: '',
    guest: '',
    q: '',
  })

  const [form, setForm] = useState({
    guestTicket: false,
    search: '',
    selectedCustomerId: '',
    category: '',
    priority: 'MEDIUM',
    description: '',
    alternateMobile: '',
    guestName: '',
    guestMobile: '',
    guestAddress: '',
    guestCode: '',
    guestStbId: '',
    guestArea: '',
    guestType: '',
  })

  const [customerResults, setCustomerResults] = useState([])
  const [selectedCustomerDetails, setSelectedCustomerDetails] = useState(null)
  const [isSearchingCustomer, setIsSearchingCustomer] = useState(false)

  const activeCategories = useMemo(
    () => categories.filter((item) => item.isActive),
    [categories]
  )

  const loadCategories = async () => {
    const token = localStorage.getItem('auth_token')
    if (!token) return
    try {
      const response = await fetch(`${apiBase}/support-categories`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || 'সাপোর্ট ক্যাটাগরি লোড করা যায়নি')
      }
      setCategories(data.data || [])
    } catch (error) {
      setStatus(error.message)
    }
  }

  const loadTickets = async () => {
    const token = localStorage.getItem('auth_token')
    if (!token) return
    setIsLoading(true)
    setStatus('')
    try {
      const params = new URLSearchParams()
      if (filters.status) params.set('status', filters.status)
      if (filters.category) params.set('category', filters.category)
      if (filters.guest) params.set('guest', filters.guest)
      if (filters.q.trim()) params.set('q', filters.q.trim())

      const response = await fetch(`${apiBase}/support-tickets?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || 'সাপোর্ট টিকেট লোড করা যায়নি')
      }
      setRows(data.data || [])
    } catch (error) {
      setStatus(error.message)
    } finally {
      setIsLoading(false)
    }
  }

  const loadCustomerDetails = async (customerId) => {
    const token = localStorage.getItem('auth_token')
    if (!token || !customerId) return
    try {
      const response = await fetch(`${apiBase}/customers/${customerId}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || 'গ্রাহকের বিস্তারিত লোড করা যায়নি')
      }
      setSelectedCustomerDetails(data.data || null)
    } catch (error) {
      setStatus(error.message)
    }
  }

  useEffect(() => {
    loadCategories()
  }, [])

  useEffect(() => {
    loadTickets()
  }, [filters.status, filters.category, filters.guest])

  useEffect(() => {
    const timer = setTimeout(() => {
      loadTickets()
    }, 350)
    return () => clearTimeout(timer)
  }, [filters.q])

  useEffect(() => {
    if (form.guestTicket) {
      setCustomerResults([])
      setSelectedCustomerDetails(null)
      return
    }

    const token = localStorage.getItem('auth_token')
    if (!token) return

    const needle = form.search.trim()
    if (needle.length < 2) {
      setCustomerResults([])
      return
    }

    const timer = setTimeout(async () => {
      setIsSearchingCustomer(true)
      try {
        const response = await fetch(`${apiBase}/customers?limit=20&q=${encodeURIComponent(needle)}`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        const data = await response.json()
        if (!response.ok) {
          throw new Error(data.error || 'গ্রাহক সার্চ করা যায়নি')
        }
        setCustomerResults(data.data || [])
      } catch (error) {
        setStatus(error.message)
      } finally {
        setIsSearchingCustomer(false)
      }
    }, 300)

    return () => clearTimeout(timer)
  }, [form.search, form.guestTicket])

  const resetModal = () => {
    setForm({
      guestTicket: false,
      search: '',
      selectedCustomerId: '',
      category: activeCategories[0]?.name || '',
      priority: 'MEDIUM',
      description: '',
      alternateMobile: '',
      guestName: '',
      guestMobile: '',
      guestAddress: '',
      guestCode: '',
      guestStbId: '',
      guestArea: '',
      guestType: '',
    })
    setCustomerResults([])
    setSelectedCustomerDetails(null)
  }

  const openModal = () => {
    resetModal()
    setIsModalOpen(true)
  }

  const closeModal = () => {
    setIsModalOpen(false)
    resetModal()
  }

  const handleSelectCustomer = async (customer) => {
    setForm((prev) => ({
      ...prev,
      selectedCustomerId: customer.id,
      search: `${customer.name} (${customer.customerCode})`,
    }))
    setCustomerResults([])
    await loadCustomerDetails(customer.id)
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    const token = localStorage.getItem('auth_token')
    if (!token) return
    setIsLoading(true)
    setStatus('')

    try {
      let payload

      if (form.guestTicket) {
        payload = {
          guestTicket: true,
          customerName: form.guestName,
          customerMobile: form.guestMobile,
          customerAddress: form.guestAddress,
          customerCode: form.guestCode,
          customerStbId: form.guestStbId,
          areaName: form.guestArea,
          customerTypeName: form.guestType,
          category: form.category,
          priority: form.priority,
          description: form.description,
          alternateMobile: form.alternateMobile || null,
        }
      } else {
        payload = {
          guestTicket: false,
          customerId: form.selectedCustomerId,
          category: form.category,
          priority: form.priority,
          description: form.description,
          alternateMobile: form.alternateMobile || null,
        }
      }

      const response = await fetch(`${apiBase}/support-tickets`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      })
      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || 'টিকেট তৈরি করা যায়নি')
      }

      setStatus(`টিকেট সফলভাবে তৈরি হয়েছে: ${data.data.ticketNumber}`)
      closeModal()
      await loadTickets()
    } catch (error) {
      setStatus(error.message)
    } finally {
      setIsLoading(false)
    }
  }

  const renderCustomerDetails = () => {
    const customer = selectedCustomerDetails?.customer
    if (!customer) return null

    return (
      <div
        style={{
          border: '1px solid #e6e1d7',
          background: '#fffaf2',
          borderRadius: 12,
          padding: '12px',
          display: 'grid',
          gap: 8,
          marginBottom: 8,
        }}
      >
        <div style={{ fontWeight: 700, color: 'var(--primary-strong)' }}>নির্বাচিত গ্রাহক তথ্য</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 6, fontSize: 14 }}>
          <div><strong>কোড:</strong> {customer.customerCode}</div>
          <div><strong>নাম:</strong> {customer.name}</div>
          <div><strong>মোবাইল:</strong> {customer.mobile}</div>
          <div><strong>STB ID:</strong> {customer.stbId || '—'}</div>
          <div><strong>এরিয়া:</strong> {customer.area?.name || '—'}</div>
          <div><strong>টাইপ:</strong> {customer.customerType?.name || '—'}</div>
          <div><strong>বিলিং:</strong> {customer.billingType || '—'}</div>
          <div><strong>মাসিক বিল:</strong> {customer.monthlyFee ?? 0}</div>
          <div style={{ gridColumn: '1 / -1' }}><strong>ঠিকানা:</strong> {customer.address || '—'}</div>
        </div>
      </div>
    )
  }

  return (
    <AppLayout title="কাস্টমার সাপোর্ট" subtitle="টিকেট তৈরি, লিস্ট এবং ফিল্টার">
      <div className="module-card">
        <div className="module-header">
          <div>
            <div className="module-title">সাপোর্ট টিকেট লিস্ট</div>
            <div className="module-sub">মোট {rows.length} টি</div>
          </div>
          <button className="btn primary" type="button" onClick={openModal}>
            নতুন টিকেট ওপেন করুন
          </button>
        </div>

        <div className="filter-grid">
          <div className="filter-item search">
            <span>সার্চ</span>
            <input
              type="text"
              placeholder="টিকেট নম্বর / নাম / মোবাইল / কোড / STB"
              value={filters.q}
              onChange={(event) => setFilters((prev) => ({ ...prev, q: event.target.value }))}
            />
          </div>
          <div className="filter-item">
            <span>স্ট্যাটাস</span>
            <select
              value={filters.status}
              onChange={(event) => setFilters((prev) => ({ ...prev, status: event.target.value }))}
            >
              {statusOptions.map((item) => (
                <option key={item.value} value={item.value}>{item.label}</option>
              ))}
            </select>
          </div>
          <div className="filter-item">
            <span>ক্যাটাগরি</span>
            <select
              value={filters.category}
              onChange={(event) => setFilters((prev) => ({ ...prev, category: event.target.value }))}
            >
              <option value="">সব ক্যাটাগরি</option>
              {categories.map((item) => (
                <option key={item.id} value={item.name}>{item.name}</option>
              ))}
            </select>
          </div>
          <div className="filter-item">
            <span>টিকেট ধরণ</span>
            <select
              value={filters.guest}
              onChange={(event) => setFilters((prev) => ({ ...prev, guest: event.target.value }))}
            >
              {guestFilterOptions.map((item) => (
                <option key={item.value} value={item.value}>{item.label}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="table-scroll">
          <table className="data-table">
            <thead>
              <tr>
                <th>টিকেট</th>
                <th>ধরণ</th>
                <th>গ্রাহক</th>
                <th>মোবাইল</th>
                <th>ক্যাটাগরি</th>
                <th>Priority</th>
                <th>Status</th>
                <th>সময়</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id}>
                  <td>
                    <strong>{row.ticketNumber}</strong>
                    <div style={{ fontSize: 12, color: 'var(--muted)' }}>{row.title}</div>
                  </td>
                  <td>{row.isGuest ? 'GUEST' : 'CUSTOMER'}</td>
                  <td>
                    <div>{row.customerName || '—'}</div>
                    <div style={{ fontSize: 12, color: 'var(--muted)' }}>{row.customerCode || '—'}</div>
                  </td>
                  <td>
                    <div>{row.customerMobile || '—'}</div>
                    <div style={{ fontSize: 12, color: 'var(--muted)' }}>{row.alternateMobile || '—'}</div>
                  </td>
                  <td>{row.category}</td>
                  <td>{row.priority}</td>
                  <td>{row.status}</td>
                  <td>{new Date(row.createdAt).toLocaleString('bn-BD')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="data-cards">
          {rows.map((row) => (
            <div key={row.id} className="data-card">
              <div className="card-head">
                <div>
                  <div className="card-title">{row.ticketNumber}</div>
                  <div className="card-sub">{row.category}</div>
                </div>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                  <span className={`status-pill ${priorityClass(row.priority)}`}>{row.priority}</span>
                  <span className={`status-pill ${statusClass(row.status)}`}>{row.status}</span>
                </div>
              </div>
              <div className="card-row">
                <span>ধরণ</span>
                <span>{row.isGuest ? 'গেস্ট' : 'কাস্টমার'}</span>
              </div>
              <div className="card-row">
                <span>গ্রাহক</span>
                <div style={{ textAlign: 'right' }}>
                  <div>{row.customerName || '—'}</div>
                  {row.customerCode ? <div className="card-sub">{row.customerCode}</div> : null}
                </div>
              </div>
              <div className="card-row">
                <span>মোবাইল</span>
                <div style={{ textAlign: 'right' }}>
                  <div>{row.customerMobile || '—'}</div>
                  {row.alternateMobile ? <div className="card-sub">{row.alternateMobile}</div> : null}
                </div>
              </div>
              <div className="card-row">
                <span>সময়</span>
                <span style={{ fontSize: 13 }}>{new Date(row.createdAt).toLocaleString('bn-BD')}</span>
              </div>
            </div>
          ))}
        </div>

        {isLoading ? <div className="module-sub">লোড হচ্ছে...</div> : null}
        {status ? <div className={`status-banner ${status.includes('সফলভাবে') ? 'success' : 'error'}`}>{status}</div> : null}
      </div>

      <div className={`modal-overlay ${isModalOpen ? 'is-open' : ''}`}>
        <div className="modal" role="dialog" aria-modal="true" onClick={(event) => event.stopPropagation()}>
          <div className="modal-header">
            <h3>নতুন সাপোর্ট টিকেট</h3>
            <button className="btn outline" type="button" onClick={closeModal}>✕</button>
          </div>

          <form className="auth-form" onSubmit={handleSubmit}>
            <div className="field">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
                <span>গ্রাহক সার্চ (নাম, মোবাইল, আইডি, STB)</span>
                <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 600, whiteSpace: 'nowrap', fontSize: '0.9rem', color: 'var(--ink)' }}>
                  <input
                    type="checkbox"
                    checked={form.guestTicket}
                    onChange={(event) => setForm((prev) => ({ ...prev, guestTicket: event.target.checked, selectedCustomerId: '', search: '' }))}
                  />
                  গেস্ট টিকেট
                </label>
              </div>
              <input
                type="text"
                value={form.search}
                disabled={form.guestTicket}
                onChange={(event) => setForm((prev) => ({ ...prev, search: event.target.value, selectedCustomerId: '' }))}
                placeholder="কমপক্ষে ২ অক্ষর লিখুন"
              />
            </div>

            {!form.guestTicket && form.search.trim().length >= 2 ? (
              <div style={{ border: '1px solid #e6e1d7', borderRadius: 10, maxHeight: 180, overflowY: 'auto' }}>
                {isSearchingCustomer ? (
                  <div style={{ padding: 10, fontSize: 13, color: 'var(--muted)' }}>সার্চ হচ্ছে...</div>
                ) : customerResults.length ? (
                  customerResults.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => handleSelectCustomer(item)}
                      style={{
                        width: '100%',
                        textAlign: 'left',
                        border: 'none',
                        borderBottom: '1px solid #f1ecdf',
                        background: '#fff',
                        padding: '9px 10px',
                        cursor: 'pointer',
                      }}
                    >
                      <strong>{item.name}</strong> ({item.customerCode}) - {item.mobile} - STB: {item.stbId || '—'}
                    </button>
                  ))
                ) : (
                  <div style={{ padding: 10, fontSize: 13, color: 'var(--muted)' }}>কোন গ্রাহক পাওয়া যায়নি</div>
                )}
              </div>
            ) : null}

            {!form.guestTicket ? renderCustomerDetails() : (
              <div className="form-grid">
                <label className="field">
                  <span>গ্রাহকের নাম</span>
                  <input
                    type="text"
                    value={form.guestName}
                    onChange={(event) => setForm((prev) => ({ ...prev, guestName: event.target.value }))}
                  />
                </label>
                <label className="field">
                  <span>মোবাইল</span>
                  <input
                    type="text"
                    value={form.guestMobile}
                    onChange={(event) => setForm((prev) => ({ ...prev, guestMobile: event.target.value }))}
                    placeholder="01XXXXXXXXX"
                  />
                </label>
                <label className="field">
                  <span>গ্রাহক আইডি (ঐচ্ছিক)</span>
                  <input
                    type="text"
                    value={form.guestCode}
                    onChange={(event) => setForm((prev) => ({ ...prev, guestCode: event.target.value }))}
                  />
                </label>
                <label className="field">
                  <span>STB ID (ঐচ্ছিক)</span>
                  <input
                    type="text"
                    value={form.guestStbId}
                    onChange={(event) => setForm((prev) => ({ ...prev, guestStbId: event.target.value }))}
                  />
                </label>
                <label className="field">
                  <span>এরিয়া (ঐচ্ছিক)</span>
                  <input
                    type="text"
                    value={form.guestArea}
                    onChange={(event) => setForm((prev) => ({ ...prev, guestArea: event.target.value }))}
                  />
                </label>
                <label className="field">
                  <span>গ্রাহক টাইপ (ঐচ্ছিক)</span>
                  <input
                    type="text"
                    value={form.guestType}
                    onChange={(event) => setForm((prev) => ({ ...prev, guestType: event.target.value }))}
                  />
                </label>
                <label className="field" style={{ gridColumn: '1 / -1' }}>
                  <span>ঠিকানা</span>
                  <input
                    type="text"
                    value={form.guestAddress}
                    onChange={(event) => setForm((prev) => ({ ...prev, guestAddress: event.target.value }))}
                  />
                </label>
              </div>
            )}

            <div className="form-grid">
              <label className="field">
                <span>সমস্যার ধরন</span>
                <select
                  value={form.category}
                  onChange={(event) => setForm((prev) => ({ ...prev, category: event.target.value }))}
                >
                  <option value="">ক্যাটাগরি নির্বাচন করুন</option>
                  {activeCategories.map((item) => (
                    <option key={item.id} value={item.name}>{item.name}</option>
                  ))}
                </select>
              </label>

              <label className="field">
                <span>Priority</span>
                <select
                  value={form.priority}
                  onChange={(event) => setForm((prev) => ({ ...prev, priority: event.target.value }))}
                >
                  {priorityOptions.map((item) => (
                    <option key={item.value} value={item.value}>{item.label}</option>
                  ))}
                </select>
              </label>

              <label className="field">
                <span>বর্তমান মোবাইল</span>
                <input
                  type="text"
                  value={form.guestTicket ? form.guestMobile : selectedCustomerDetails?.customer?.mobile || ''}
                  readOnly
                />
              </label>

              <label className="field">
                <span>অতিরিক্ত মোবাইল (নতুন)</span>
                <input
                  type="text"
                  value={form.alternateMobile}
                  onChange={(event) => setForm((prev) => ({ ...prev, alternateMobile: event.target.value }))}
                  placeholder="01XXXXXXXXX"
                />
              </label>
            </div>

            <label className="field">
              <span>সমস্যার বিবরণ (সর্বোচ্চ ২৫০ অক্ষর)</span>
              <textarea
                maxLength={250}
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
              <span style={{ fontSize: 12, color: 'var(--muted)' }}>{form.description.length}/250</span>
            </label>

            <div className="modal-actions">
              <button className="btn ghost" type="button" onClick={closeModal}>বন্ধ করুন</button>
              <button className="btn primary" type="submit" disabled={isLoading}>
                {isLoading ? 'তৈরি হচ্ছে...' : 'টিকেট তৈরি করুন'}
              </button>
            </div>
          </form>
        </div>
        <button className="modal-backdrop" type="button" aria-label="Close" onClick={closeModal} />
      </div>
    </AppLayout>
  )
}

export default CustomerSupport
