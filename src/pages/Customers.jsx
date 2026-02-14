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
  const [isImportOpen, setIsImportOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [importFile, setImportFile] = useState(null)
  const [allowMissingMobile, setAllowMissingMobile] = useState(false)
  const [importStatus, setImportStatus] = useState('')
  const [importSummary, setImportSummary] = useState(null)
  const [importErrors, setImportErrors] = useState([])
  const [isImporting, setIsImporting] = useState(false)
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

  const resetForm = () => {
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
  }

  const resetImport = () => {
    setImportFile(null)
    setAllowMissingMobile(false)
    setImportStatus('')
    setImportSummary(null)
    setImportErrors([])
  }

  const formatDateValue = (value) => {
    if (!value) return ''
    const date = new Date(value)
    if (Number.isNaN(date.getTime())) return ''
    return date.toISOString().slice(0, 10)
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    if (!token) return
    setIsLoading(true)
    setStatus('')
    try {
      const isEdit = Boolean(editing)
      const payload = {
        ...form,
        monthlyFee: form.monthlyFee ? Number(form.monthlyFee) : undefined,
        dueBalance: form.dueBalance ? Number(form.dueBalance) : undefined,
      }

      const url = isEdit ? `${apiBase}/customers/${editing.id}` : `${apiBase}/customers`
      const response = await fetch(url, {
        method: isEdit ? 'PATCH' : 'POST',
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
      resetForm()
      setEditing(null)
      setIsOpen(false)
      await loadCustomers()
    } catch (error) {
      setStatus(error.message)
    } finally {
      setIsLoading(false)
    }
  }

  const handleEdit = (row) => {
    setEditing(row)
    setForm({
      areaId: row.areaId || '',
      customerTypeId: row.customerTypeId || '',
      customerCode: row.customerCode || '',
      name: row.name || '',
      mobile: row.mobile || '',
      address: row.address || '',
      billingType: row.billingType || 'ACTIVE',
      monthlyFee: row.monthlyFee ?? '',
      dueBalance: row.dueBalance ?? '',
      connectionDate: formatDateValue(row.connectionDate),
    })
    setIsOpen(true)
  }

  const handleDelete = async (row) => {
    if (!token) return
    const ok = window.confirm(`"${row.name}" ডিলিট করবেন?`)
    if (!ok) return
    setIsLoading(true)
    setStatus('')
    try {
      const response = await fetch(`${apiBase}/customers/${row.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || 'ডিলিট করা যায়নি')
      }
      await loadCustomers()
    } catch (error) {
      setStatus(error.message)
    } finally {
      setIsLoading(false)
    }
  }

  const handleImport = async (event) => {
    event.preventDefault()
    if (!token) return
    if (!importFile) {
      setImportStatus('একটি এক্সেল ফাইল নির্বাচন করুন')
      return
    }
    setIsImporting(true)
    setImportStatus('')
    setImportSummary(null)
    setImportErrors([])
    try {
      const formData = new FormData()
      formData.append('file', importFile)
      formData.append('allowMissingMobile', allowMissingMobile ? 'true' : 'false')
      const response = await fetch(`${apiBase}/customers/import`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      })
      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || 'ইমপোর্ট ব্যর্থ হয়েছে')
      }
      setImportSummary(data.summary || null)
      setImportErrors(data.errors || [])
      setImportStatus('ইমপোর্ট সম্পন্ন')
      await loadCustomers()
    } catch (error) {
      setImportStatus(error.message)
    } finally {
      setIsImporting(false)
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
          <div className="action-buttons">
            <button
              className="btn ghost"
              type="button"
              onClick={() => {
                resetImport()
                setIsImportOpen(true)
              }}
            >
              বাল্ক ইমপোর্ট
            </button>
            <button
              className="btn primary"
              type="button"
              onClick={() => {
                setEditing(null)
                resetForm()
                setIsOpen(true)
              }}
            >
              নতুন গ্রাহক
            </button>
          </div>
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
              <th>অ্যাকশন</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id}>
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
            <h3>{editing ? 'গ্রাহক এডিট' : 'নতুন গ্রাহক'}</h3>
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
                {isLoading ? 'সেভ হচ্ছে...' : editing ? 'আপডেট' : 'সাবমিট'}
              </button>
            </div>
          </form>
        </div>
        <button className="modal-backdrop" type="button" aria-label="Close" onClick={() => setIsOpen(false)} />
      </div>

      <div className={`modal-overlay ${isImportOpen ? 'is-open' : ''}`}>
        <div
          className="modal"
          role="dialog"
          aria-modal="true"
          onClick={(event) => event.stopPropagation()}
        >
          <div className="modal-header">
            <h3>গ্রাহক বাল্ক ইমপোর্ট</h3>
            <button
              className="btn outline"
              type="button"
              onClick={() => {
                setIsImportOpen(false)
                resetImport()
              }}
            >
              ✕
            </button>
          </div>
          <form className="auth-form" onSubmit={handleImport}>
            <label className="field">
              <span>এক্সেল ফাইল</span>
              <input
                type="file"
                accept=".xlsx,.xls"
                onChange={(event) => setImportFile(event.target.files?.[0] || null)}
              />
            </label>
            <div className="field">
              <span>কলাম (উদাহরণ)</span>
              <div className="module-sub">
                customerCode, name, mobile, address, area, customerType, billingType, monthlyFee, dueBalance
              </div>
            </div>
            <div className="field">
              <span>টেমপ্লেট</span>
              <a
                className="btn outline small"
                href="/templates/customer-import-template.xlsx"
                download
              >
                টেমপ্লেট ডাউনলোড
              </a>
            </div>
            <label className="field">
              <span>মোবাইল ফাঁকা থাকলেও ইমপোর্ট</span>
              <input
                type="checkbox"
                checked={allowMissingMobile}
                onChange={(event) => setAllowMissingMobile(event.target.checked)}
              />
            </label>
            {importSummary ? (
              <div className="status-banner success">
                মোট {importSummary.total} | যুক্ত {importSummary.created} | স্কিপ {importSummary.skipped} | ব্যর্থ {importSummary.failed}
              </div>
            ) : null}
            {importErrors.length ? (
              <div className="status-banner error">
                {importErrors.map((item) => `Row ${item.row}: ${item.reason}`).join(' | ')}
              </div>
            ) : null}
            {importStatus && !importErrors.length ? (
              <div className="status-banner success">{importStatus}</div>
            ) : null}
            <div className="modal-actions">
              <button
                className="btn ghost"
                type="button"
                onClick={() => {
                  setIsImportOpen(false)
                  resetImport()
                }}
              >
                বন্ধ করুন
              </button>
              <button className="btn primary" type="submit" disabled={isImporting}>
                {isImporting ? 'ইমপোর্ট হচ্ছে...' : 'ইমপোর্ট শুরু'}
              </button>
            </div>
          </form>
        </div>
        <button
          className="modal-backdrop"
          type="button"
          aria-label="Close"
          onClick={() => {
            setIsImportOpen(false)
            resetImport()
          }}
        />
      </div>
    </AppLayout>
  )
}

export default Customers
