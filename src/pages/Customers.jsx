import { useEffect, useMemo, useState } from 'react'
import AppLayout from '../components/AppLayout.jsx'

const apiBase = import.meta.env.PROD
  ? '/api'
  : import.meta.env.VITE_API_BASE || 'http://localhost:5000'

const billingOptions = [
  { value: 'ACTIVE', label: 'একটিভ' },
  { value: 'FREE', label: 'ফ্রি' },
  { value: 'CLOSED', label: 'বন্ধ' },
]

const billingLabel = (value) => {
  const match = billingOptions.find((option) => option.value === value)
  return match ? match.label : value
}

function Customers() {
  const [rows, setRows] = useState([])
  const [areas, setAreas] = useState([])
  const [types, setTypes] = useState([])
  const [filters, setFilters] = useState({
    areaId: '',
    customerTypeId: '',
    billingType: '',
    q: '',
  })
  const [isOpen, setIsOpen] = useState(false)
  const [form, setForm] = useState({
    areaId: '',
    customerTypeId: '',
    customerCode: '',
    name: '',
    mobile: '',
    address: '',
    billingType: 'ACTIVE',
    monthlyFee: '',
    dueBalance: '',
    connectionDate: '',
  })
  const [status, setStatus] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const token = localStorage.getItem('auth_token')

  const filterQuery = useMemo(() => {
    const params = new URLSearchParams()
    if (filters.areaId) params.append('areaId', filters.areaId)
    if (filters.customerTypeId) params.append('customerTypeId', filters.customerTypeId)
    if (filters.billingType) params.append('billingType', filters.billingType)
    if (filters.q) params.append('q', filters.q)
    const query = params.toString()
    return query ? `?${query}` : ''
  }, [filters])

  const loadFilters = async () => {
    if (!token) return
    try {
      const [areasRes, typesRes] = await Promise.all([
        fetch(`${apiBase}/areas`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${apiBase}/customer-types`, { headers: { Authorization: `Bearer ${token}` } }),
      ])

      const areasData = await areasRes.json()
      const typesData = await typesRes.json()
      if (areasRes.ok) setAreas(areasData.data || [])
      if (typesRes.ok) setTypes(typesData.data || [])
    } catch (error) {
      setStatus('ফিল্টার লোড করা যায়নি')
    }
  }

  const loadCustomers = async () => {
    if (!token) return
    setIsLoading(true)
    setStatus('')
    try {
      const response = await fetch(`${apiBase}/customers${filterQuery}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || 'গ্রাহক লোড করা যায়নি')
      }
      setRows(data.data || [])
    } catch (error) {
      setStatus(error.message)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadFilters()
  }, [])

  useEffect(() => {
    loadCustomers()
  }, [filterQuery])

  const handleFormChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    if (!token) return
    setIsLoading(true)
    setStatus('')
    try {
      const payload = {
        ...form,
        monthlyFee: form.monthlyFee ? Number(form.monthlyFee) : undefined,
        dueBalance: form.dueBalance ? Number(form.dueBalance) : undefined,
      }

      const response = await fetch(`${apiBase}/customers`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      })
      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || 'গ্রাহক তৈরি করা যায়নি')
      }
      setForm({
        areaId: '',
        customerTypeId: '',
        customerCode: '',
        name: '',
        mobile: '',
        address: '',
        billingType: 'ACTIVE',
        monthlyFee: '',
        dueBalance: '',
        connectionDate: '',
      })
      setIsOpen(false)
      await loadCustomers()
    } catch (error) {
      setStatus(error.message)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <AppLayout title="গ্রাহক" subtitle="গ্রাহক তালিকা ও ফিল্টার">
      <div className="module-card">
        <div className="module-header">
          <div>
            <div className="module-title">গ্রাহক তালিকা</div>
            <div className="module-sub">মোট {rows.length} জন</div>
          </div>
          <button className="btn primary" type="button" onClick={() => setIsOpen(true)}>
            নতুন গ্রাহক
          </button>
        </div>
        <div className="filter-grid">
          <label className="filter-item">
            <span>এরিয়া</span>
            <select
              value={filters.areaId}
              onChange={(event) => setFilters((prev) => ({ ...prev, areaId: event.target.value }))}
            >
              <option value="">সব</option>
              {areas.map((area) => (
                <option key={area.id} value={area.id}>
                  {area.name}
                </option>
              ))}
            </select>
          </label>
          <label className="filter-item">
            <span>গ্রাহক টাইপ</span>
            <select
              value={filters.customerTypeId}
              onChange={(event) =>
                setFilters((prev) => ({ ...prev, customerTypeId: event.target.value }))
              }
            >
              <option value="">সব</option>
              {types.map((type) => (
                <option key={type.id} value={type.id}>
                  {type.name}
                </option>
              ))}
            </select>
          </label>
          <label className="filter-item">
            <span>বিলিং টাইপ</span>
            <select
              value={filters.billingType}
              onChange={(event) =>
                setFilters((prev) => ({ ...prev, billingType: event.target.value }))
              }
            >
              <option value="">সব</option>
              {billingOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <label className="filter-item search">
            <span>সার্চ</span>
            <input
              type="text"
              placeholder="নাম, মোবাইল, আইডি"
              value={filters.q}
              onChange={(event) => setFilters((prev) => ({ ...prev, q: event.target.value }))}
            />
          </label>
        </div>
        {isLoading ? <div className="module-sub">লোড হচ্ছে...</div> : null}
        <table className="data-table">
          <thead>
            <tr>
              <th>গ্রাহক</th>
              <th>এরিয়া</th>
              <th>টাইপ</th>
              <th>বিলিং</th>
              <th>মাসিক</th>
              <th>বকেয়া</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.code}>
                <td>
                  <div className="cell-title">{row.name}</div>
                  <div className="cell-sub">{row.customerCode}</div>
                  <div className="cell-sub">{row.mobile}</div>
                </td>
                <td>{row.area?.name || '—'}</td>
                <td>{row.customerType?.name || '—'}</td>
                <td>
                  <span className={`status-pill ${row.billingType.toLowerCase()}`}>
                    {billingLabel(row.billingType)}
                  </span>
                </td>
                <td>৳ {row.monthlyFee ?? 0}</td>
                <td>৳ {row.dueBalance ?? 0}</td>
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
            <h3>নতুন গ্রাহক</h3>
            <button className="btn outline" type="button" onClick={() => setIsOpen(false)}>
              ✕
            </button>
          </div>
          <form className="auth-form" onSubmit={handleSubmit}>
            <div className="form-grid">
              <label className="field">
                <span>এরিয়া</span>
                <select
                  value={form.areaId}
                  onChange={(event) => handleFormChange('areaId', event.target.value)}
                >
                  <option value="">এরিয়া নির্বাচন</option>
                  {areas.map((area) => (
                    <option key={area.id} value={area.id}>
                      {area.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field">
                <span>গ্রাহক টাইপ</span>
                <select
                  value={form.customerTypeId}
                  onChange={(event) => handleFormChange('customerTypeId', event.target.value)}
                >
                  <option value="">টাইপ নির্বাচন</option>
                  {types.map((type) => (
                    <option key={type.id} value={type.id}>
                      {type.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field">
                <span>গ্রাহক আইডি</span>
                <input
                  type="text"
                  value={form.customerCode}
                  onChange={(event) => handleFormChange('customerCode', event.target.value)}
                  placeholder="C-1005"
                />
              </label>
              <label className="field">
                <span>নাম</span>
                <input
                  type="text"
                  value={form.name}
                  onChange={(event) => handleFormChange('name', event.target.value)}
                  placeholder="গ্রাহকের নাম"
                />
              </label>
              <label className="field">
                <span>মোবাইল নম্বর</span>
                <input
                  type="text"
                  value={form.mobile}
                  onChange={(event) => handleFormChange('mobile', event.target.value)}
                  placeholder="01XXXXXXXXX"
                />
              </label>
              <label className="field">
                <span>ঠিকানা</span>
                <input
                  type="text"
                  value={form.address}
                  onChange={(event) => handleFormChange('address', event.target.value)}
                  placeholder="ঠিকানা"
                />
              </label>
              <label className="field">
                <span>বিলিং টাইপ</span>
                <select
                  value={form.billingType}
                  onChange={(event) => handleFormChange('billingType', event.target.value)}
                >
                  {billingOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field">
                <span>মাসিক বিল</span>
                <input
                  type="number"
                  min="0"
                  value={form.monthlyFee}
                  onChange={(event) => handleFormChange('monthlyFee', event.target.value)}
                  placeholder="মাসিক বিল"
                  disabled={form.billingType !== 'ACTIVE'}
                />
              </label>
              <label className="field">
                <span>বকেয়া বিল</span>
                <input
                  type="number"
                  min="0"
                  value={form.dueBalance}
                  onChange={(event) => handleFormChange('dueBalance', event.target.value)}
                  placeholder="বকেয়া বিল"
                />
              </label>
              <label className="field">
                <span>সংযোগ তারিখ</span>
                <input
                  type="date"
                  value={form.connectionDate}
                  onChange={(event) => handleFormChange('connectionDate', event.target.value)}
                />
              </label>
            </div>
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

export default Customers
