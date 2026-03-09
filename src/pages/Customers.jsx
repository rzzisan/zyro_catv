import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
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

const getInitial = (name = '') => {
  const trimmed = String(name).trim()
  return trimmed ? trimmed[0] : 'গ'
}

const avatarPalette = ['#f5b55e', '#66a7e6', '#7dc8a7', '#f08ab5', '#b28ce2']

const getAvatarColor = (seed) => {
  const text = String(seed ?? '')
  let hash = 0
  for (let i = 0; i < text.length; i += 1) {
    hash = (hash * 31 + text.charCodeAt(i)) % 997
  }
  return avatarPalette[Math.abs(hash) % avatarPalette.length]
}

const getUserRole = () => {
  const token = localStorage.getItem('auth_token')
  if (!token) return null
  const parts = token.split('.')
  if (parts.length !== 3) return null
  try {
    const payload = JSON.parse(atob(parts[1]))
    return payload?.role || null
  } catch (error) {
    return null
  }
}

// Customer Menu Dialog
const CustomerMenuDialog = ({ customer, onClose, onViewDetails, onEdit, onDelete, menuRef }) => {
  return (
    <div className="menu-popover" ref={menuRef}>
      <button
        className="menu-item"
        onClick={() => {
          onViewDetails(customer)
          onClose()
        }}
        title="বিস্তারিত দেখুন"
      >
        ডিটেইলস
      </button>
      <button
        className="menu-item"
        onClick={() => {
          onEdit(customer)
          onClose()
        }}
        title="গ্রাহক এডিট"
      >
        এডিট
      </button>
      <button
        className="menu-item"
        onClick={() => {
          onDelete(customer)
          onClose()
        }}
        title="গ্রাহক ডিলিট"
      >
        ডিলিট
      </button>
    </div>
  )
}

// Customer Row Component
const CustomerListRow = ({ customer, onMenuClick, isSelected, role, onToggleSelect }) => {
  const [showMenu, setShowMenu] = useState(false)
  const menuRef = useRef(null)
  const buttonRef = useRef(null)

  useEffect(() => {
    if (!showMenu) return undefined
    const handleClickOutside = (event) => {
      if (
        menuRef.current &&
        !menuRef.current.contains(event.target) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target)
      ) {
        setShowMenu(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [showMenu])

  return (
    <div className={`customer-row ${showMenu ? 'menu-open' : ''}`}>
      {role === 'ADMIN' && (
        <div className="customer-checkbox">
          <input
            type="checkbox"
            checked={isSelected}
            onChange={() => onToggleSelect(customer.id)}
            style={{ cursor: 'pointer' }}
          />
        </div>
      )}
      <div
        className="customer-avatar"
        aria-hidden="true"
        style={{ background: getAvatarColor(customer.id || customer.customerCode) }}
      >
        <span>{getInitial(customer.name)}</span>
      </div>

      <div className="customer-main-info">
        <h4 className="customer-name">{customer.name}</h4>
        <span className="customer-id">{customer.customerCode}</span>
        <div className="customer-contact-info">
          <div className="contact-line">{customer.area?.name || '—'}</div>
          <div className="contact-line">{customer.mobile || '—'}</div>
        </div>
      </div>

      <div className="customer-right-section">
        <div className="customer-values">
          <div className="value-item">
            <span className="value-label">টাইপ</span>
            <span className="value-text">{customer.customerType?.name || '—'}</span>
          </div>
          <div className="value-item">
            <span className="value-label">বিলিং</span>
            <span className={`status-pill ${(customer.billingType || 'ACTIVE').toLowerCase()}`}>
              {billingLabel(customer.billingType || 'ACTIVE')}
            </span>
          </div>
        </div>
        <div className="customer-amounts">
          <div className="amount-item">
            <span className="amount-label">মাসিক</span>
            <span className="amount-value">৳ {customer.monthlyFee ?? 0}</span>
          </div>
          <div className="amount-item">
            <span className="amount-label">বকেয়া</span>
            <span className="amount-value due">৳ {customer.dueBalance ?? 0}</span>
          </div>
        </div>
        <div className="menu-anchor">
          <button
            ref={buttonRef}
            className="menu-button"
            onClick={() => setShowMenu((prev) => !prev)}
            title="অপশন"
          >
            ⋮
          </button>
          {showMenu && (
            <CustomerMenuDialog
              customer={customer}
              onClose={() => setShowMenu(false)}
              onViewDetails={onMenuClick.onViewDetails}
              onEdit={onMenuClick.onEdit}
              onDelete={onMenuClick.onDelete}
              menuRef={menuRef}
            />
          )}
        </div>
      </div>
    </div>
  )
}

function Customers() {
  const navigate = useNavigate()
  const [rows, setRows] = useState([])
  const [areas, setAreas] = useState([])
  const [types, setTypes] = useState([])
  const [filters, setFilters] = useState({
    areaId: '',
    customerTypeId: '',
    billingType: '',
    q: '',
  })
  const [page, setPage] = useState(1)
  const [perPage, setPerPage] = useState(50)
  const [meta, setMeta] = useState({ total: 0, page: 1, perPage: 50, totalPages: 1 })
  const [isOpen, setIsOpen] = useState(false)
  const [isImportOpen, setIsImportOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [importFile, setImportFile] = useState(null)
  const [allowMissingMobile, setAllowMissingMobile] = useState(false)
  const [importStatus, setImportStatus] = useState('')
  const [importSummary, setImportSummary] = useState(null)
  const [importErrors, setImportErrors] = useState([])
  const [importSkipped, setImportSkipped] = useState([])
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
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [selectedCustomers, setSelectedCustomers] = useState(new Set())

  const token = localStorage.getItem('auth_token')
  const role = getUserRole()

  const filterQuery = useMemo(() => {
    const params = new URLSearchParams()
    if (filters.areaId) params.append('areaId', filters.areaId)
    if (filters.customerTypeId) params.append('customerTypeId', filters.customerTypeId)
    if (filters.billingType) params.append('billingType', filters.billingType)
    if (filters.q) params.append('q', filters.q)
    if (perPage === 'all') {
      params.append('limit', 'all')
    } else {
      params.append('limit', String(perPage))
      params.append('page', String(page))
    }
    const query = params.toString()
    return query ? `?${query}` : ''
  }, [filters, page, perPage])

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
      setStatus('ফিল্টার লোড করা যায়নি')
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
        throw new Error(data.error || 'গ্রাহক লোড করা যায়নি')
      }
      setRows(data.data || [])
      if (data.meta) {
        setMeta(data.meta)
      }
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

  useEffect(() => {
    setPage(1)
  }, [filters, perPage])

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
    setImportSkipped([])
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
        throw new Error(data.error || 'গ্রাহক তৈরি করা যায়নি')
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
        throw new Error(data.error || 'ডিলিট করা যায়নি')
      }
      await loadCustomers()
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

  const handleSelectOne = (customerId) => {
    setSelectedCustomers((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(customerId)) {
        newSet.delete(customerId)
      } else {
        newSet.add(customerId)
      }
      return newSet
    })
  }

  const handleSelectAll = () => {
    if (selectedCustomers.size === rows.length) {
      setSelectedCustomers(new Set())
    } else {
      setSelectedCustomers(new Set(rows.map((row) => row.id)))
    }
  }

  const handleBulkDelete = async () => {
    if (!token || role !== 'ADMIN' || selectedCustomers.size === 0) return
    const count = selectedCustomers.size
    const ok = window.confirm(`${count}টি গ্রাহক ডিলিট করবেন? এই কাজটি পূর্বাবস্থায় ফেরানো যাবে না।`)
    if (!ok) return

    setIsLoading(true)
    setStatus('')
    let deleted = 0
    let failed = 0

    for (const customerId of selectedCustomers) {
      try {
        const response = await fetch(`${apiBase}/customers/${customerId}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` },
        })
        if (response.ok) {
          deleted += 1
        } else {
          failed += 1
        }
      } catch (error) {
        failed += 1
      }
    }

    setSelectedCustomers(new Set())
    setStatus(`${deleted}টি গ্রাহক ডিলিট হয়েছে${failed > 0 ? `, ${failed}টি ব্যর্থ হয়েছে` : ''}`)
    await loadCustomers()
    setIsLoading(false)
  }

  const confirmDelete = async () => {
    if (!deleteTarget) return
    await handleDelete(deleteTarget)
    setDeleteTarget(null)
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
    setImportSkipped([])
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
        throw new Error(data.error || 'ইমপোর্ট ব্যর্থ হয়েছে')
      }
      setImportSummary(data.summary || null)
      setImportErrors(data.errors || [])
      setImportSkipped(data.skippedRecords || [])
      setImportStatus('ইমপোর্ট সম্পন্ন')
      await loadCustomers()
    } catch (error) {
      setImportStatus(error.message)
    } finally {
      setIsImporting(false)
    }
  }

  const menuHandlers = {
    onViewDetails: (row) => navigate(`/customers/${row.id}`),
    onEdit: handleEdit,
    onDelete: openDelete,
  }

  return (
    <AppLayout title="গ্রাহক" subtitle="গ্রাহক তালিকা ও ফিল্টার">
      <div className="customers-container">
        <div className="customers-header">
          <div>
            <div className="module-title">গ্রাহক তালিকা</div>
            <div className="module-sub">মোট {meta.total} জন</div>
          </div>
          <div className="action-buttons">
            {role === 'ADMIN' && selectedCustomers.size > 0 && (
              <button
                className="btn danger"
                type="button"
                onClick={handleBulkDelete}
                disabled={isLoading}
                style={{ marginRight: '8px' }}
              >
                বাল্ক ডিলিট ({selectedCustomers.size})
              </button>
            )}
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
            <span>এরিয়া</span>
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
        <div className="table-top-controls">
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
            {role === 'ADMIN' && selectedCustomers.size > 0 && (
              <button
                className="btn outline small"
                type="button"
                onClick={handleBulkDelete}
                disabled={isLoading}
              >
                ডিলিট ({selectedCustomers.size})
              </button>
            )}
          </div>
          <label className="pagination-select">
            <span>দেখাও</span>
            <select
              value={perPage}
              onChange={(event) => {
                const value = event.target.value
                setPerPage(value === 'all' ? 'all' : Number(value))
              }}
            >
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
              <option value={200}>200</option>
              <option value="all">সকল</option>
            </select>
          </label>
        </div>
        <div className="customers-list">
          {rows.map((row) => (
            <CustomerListRow
              key={row.id}
              customer={row}
              onMenuClick={menuHandlers}
              isSelected={selectedCustomers.has(row.id)}
              role={role}
              onToggleSelect={handleSelectOne}
            />
          ))}
        </div>
        <div className="pagination-bar">
          <div className="pagination-info">
            পেজ {meta.page} / {meta.totalPages}
          </div>
          <div className="page-buttons">
            <button
              className="btn ghost small"
              type="button"
              disabled={perPage === 'all' || meta.page <= 1}
              onClick={() => setPage((prev) => Math.max(1, prev - 1))}
            >
              আগের
            </button>
            <button
              className="btn ghost small"
              type="button"
              disabled={perPage === 'all' || meta.page >= meta.totalPages}
              onClick={() => setPage((prev) => Math.min(meta.totalPages, prev + 1))}
            >
              পরের
            </button>
          </div>
        </div>
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
                <span>এরিয়া</span>
                <select
                  value={form.areaId}
                  onChange={(event) => handleFormChange('areaId', event.target.value)}
                >
                  <option value="">এরিয়া নির্বাচন</option>
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
                <span>বকেয়া বিল</span>
                <input
                  type="number"
                  min="0"
                  value={form.dueBalance}
                  onChange={(event) => handleFormChange('dueBalance', event.target.value)}
                  placeholder="বকেয়া বিল"
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
                <strong>ত্রুটি:</strong> {importErrors.map((item) => `Row ${item.row}: ${item.reason}`).join(' | ')}
              </div>
            ) : null}
            {importSkipped.length ? (
              <div className="import-skipped-section">
                <h4 className="skipped-title">স্কিপ করা গ্রাহক ({importSkipped.length})</h4>
                <div className="skipped-list">
                  {importSkipped.map((item, idx) => (
                    <div key={idx} className="skipped-item">
                      <div className="skipped-header">
                        <span className="skipped-row">Row {item.row}</span>
                        <span className="skipped-code">{item.customerCode}</span>
                      </div>
                      <div className="skipped-details">
                        <span className="skipped-name">{item.name}</span>
                        <span className="skipped-mobile">{item.mobile}</span>
                      </div>
                      <div className="skipped-meta">
                        <span>{item.area} • {item.customerType}</span>
                      </div>
                      <div className="skipped-reason">
                        <strong>কারণ:</strong> {item.reason === 'Duplicate customer code' ? 'গ্রাহক কোড ডুপ্লিকেট' : item.reason === 'Duplicate mobile number' ? 'মোবাইল নাম্বার ডুপ্লিকেট' : item.reason}
                      </div>
                    </div>
                  ))}
                </div>
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

      <div className={`modal-overlay ${deleteTarget ? 'is-open' : ''}`}>
        <div
          className="modal"
          role="dialog"
          aria-modal="true"
          onClick={(event) => event.stopPropagation()}
        >
          <div className="modal-header">
            <h3>গ্রাহক ডিলিট</h3>
            <button className="btn outline" type="button" onClick={closeDelete}>
              ✕
            </button>
          </div>
          <div className="module-sub">
            আপনি কি নিশ্চিত? {deleteTarget?.name} ডিলিট করবেন?
            <br />
            <em style={{ fontSize: '0.9em', marginTop: '8px', display: 'block', color: '#666' }}>
              নোট: বিল ও পেমেন্ট রেকর্ড থেকে যাবে।
            </em>
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

export default Customers
