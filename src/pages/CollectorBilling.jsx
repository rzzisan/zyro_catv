import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import AppLayout from '../components/AppLayout.jsx'

const apiBase = import.meta.env.PROD
  ? '/api'
  : import.meta.env.VITE_API_BASE || 'http://localhost:5000'

const statusOptions = [
  { value: 'DUE', label: 'বকেয়া' },
  { value: 'PARTIAL', label: 'আংশিক' },
  { value: 'PAID', label: 'পরিশোধ' },
  { value: 'ADVANCE', label: 'অগ্রিম' },
]

const methodOptions = [
  { value: 'CASH', label: 'ক্যাশ' },
  { value: 'BKASH', label: 'বিকাশ' },
  { value: 'NAGAD', label: 'নগদ' },
  { value: 'BANK', label: 'ব্যাংক' },
]

const formatCurrency = (value) => `৳${Number(value || 0).toLocaleString('bn-BD')}`

const formatDateTimeValue = (value) => {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  const pad = (part) => String(part).padStart(2, '0')
  const year = date.getFullYear()
  const month = pad(date.getMonth() + 1)
  const day = pad(date.getDate())
  const hours = pad(date.getHours())
  const minutes = pad(date.getMinutes())
  return `${year}-${month}-${day}T${hours}:${minutes}`
}

const formatMonthAllocations = (items = []) => {
  if (!items.length) return '—'
  return items
    .map((item) => `${item.label || `${item.month}/${item.year}`} (${formatCurrency(item.amount)})`)
    .join(', ')
}

const formatDateTime = (value) => {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  return date.toLocaleString('bn-BD', {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
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

// Menu options for three-dot menu
const MenuDialog = ({ customer, onClose, onBillCollect, onBillReport, onCall, onViewDetails, menuRef }) => {
  return (
    <div className="menu-popover" ref={menuRef}>
      <button
        className="menu-item"
        onClick={() => {
          onViewDetails(customer)
          onClose()
        }}
        title="গ্রাহক প্রোফাইল"
      >
        প্রোফাইল
      </button>
      <button
        className="menu-item"
        onClick={() => {
          onBillCollect(customer)
          onClose()
        }}
        title="বিল সংগ্রহ"
      >
        বিল সংগ্রহ
      </button>
      <button
        className="menu-item"
        onClick={() => {
          onBillReport(customer)
          onClose()
        }}
        title="বিল রিপোর্ট"
      >
        বিল রিপোর্ট
      </button>
      <button
        className="menu-item"
        onClick={() => {
          onCall(customer)
          onClose()
        }}
        title="কল করুন"
      >
        কল
      </button>
    </div>
  )
}

// Customer List Item Component
const CustomerListItem = ({ customer, onMenuClick, selectedStatus }) => {
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
    <>
      <div className={`collector-customer-row ${showMenu ? 'menu-open' : ''}`}>
        <div
          className="customer-avatar"
          aria-hidden="true"
          style={{ background: getAvatarColor(customer.customerId || customer.customerCode) }}
        >
          <span>{getInitial(customer.name)}</span>
        </div>

        <div className="customer-main-info">
          <h4 className="customer-name">{customer.name}</h4>
          <span className="customer-id">{customer.customerCode || customer.id}</span>
          <div className="customer-contact-info">
            <div className="contact-line">{customer.address || customer.area?.name || '—'}</div>
            <div className="contact-line">{customer.mobile || customer.phone || '—'}</div>
          </div>
        </div>

        <div className="customer-right-section">
          <div className="due-amount">{formatCurrency(customer.totalDue)}</div>
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
              <MenuDialog
                customer={customer}
                onClose={() => setShowMenu(false)}
                onBillCollect={onMenuClick.onBillCollect}
                onBillReport={onMenuClick.onBillReport}
                onCall={onMenuClick.onCall}
                onViewDetails={onMenuClick.onViewDetails}
                menuRef={menuRef}
              />
            )}
          </div>
        </div>
      </div>
    </>
  )
}

function CollectorBilling() {
  const navigate = useNavigate()
  const [areas, setAreas] = useState([])
  const [customers, setCustomers] = useState([])
  const [selectedArea, setSelectedArea] = useState('')
  const [selectedStatus, setSelectedStatus] = useState('DUE')
  const [searchQuery, setSearchQuery] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [collecting, setCollecting] = useState(null)
  const [historyFor, setHistoryFor] = useState(null)
  const [historyRows, setHistoryRows] = useState([])
  const [historyLoading, setHistoryLoading] = useState(false)
  const [historyStatus, setHistoryStatus] = useState('')
  const [collectForm, setCollectForm] = useState({
    amount: '',
    paidAt: formatDateTimeValue(new Date()),
    method: 'CASH',
  })
  const [page, setPage] = useState(1)
  const [perPage, setPerPage] = useState(50)
  const [meta, setMeta] = useState({ total: 0, page: 1, perPage: 50, totalPages: 1 })

  const token = localStorage.getItem('auth_token')
  const role = getUserRole()

  // Fetch areas on mount
  useEffect(() => {
    const fetchAreas = async () => {
      if (!token) {
        setError('অথেন্টিকেশন প্রয়োজন')
        return
      }
      try {
        const res = await fetch(`${apiBase}/areas`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        if (!res.ok) throw new Error('Failed to fetch areas')
        const data = await res.json()
        setAreas(data.data || [])
        setSelectedArea('')
      } catch (err) {
        setError(err.message)
      }
    }
    fetchAreas()
  }, [token])

  const fetchCustomers = async () => {
    if (!token) return
    setLoading(true)
    setError('')
    try {
      const params = new URLSearchParams()
      if (selectedArea) params.append('areaId', selectedArea)
      params.append('status', selectedStatus)
      if (perPage === 'all') {
        params.append('limit', 'all')
      } else {
        params.append('limit', String(perPage))
        params.append('page', String(page))
      }
      if (searchQuery.trim()) params.append('q', searchQuery.trim())
      const res = await fetch(`${apiBase}/billing?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) throw new Error('Failed to fetch customers')
      const data = await res.json()
      setCustomers(data.data || [])
      if (data.meta) {
        setMeta(data.meta)
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  // Fetch customers when filters or pagination changes
  useEffect(() => {
    fetchCustomers()
  }, [selectedArea, selectedStatus, searchQuery, page, perPage, token])

  // Reset to page 1 when filters change
  useEffect(() => {
    setPage(1)
  }, [selectedArea, selectedStatus, searchQuery, perPage])

  const openCollectModal = (row) => {
    const maxAmount = row.totalDue > 0 ? row.totalDue : row.amount
    const defaultAmount = row.dueCurrent > 0 ? Math.min(row.dueCurrent, maxAmount) : 0
    
    setCollecting(row)
    setCollectForm({
      amount: defaultAmount ? String(Math.floor(defaultAmount)) : '',
      paidAt: formatDateTimeValue(new Date()),
      method: 'CASH',
    })
  }

  const handleCollectSubmit = async (event) => {
    event.preventDefault()
    if (!token || !collecting) return
    
    const amount = Number(collectForm.amount)
    if (!Number.isInteger(amount) || amount <= 0) {
      setError('পরিমাণ অবশ্যই ১ এর চেয়ে বেশি পূর্ণ সংখ্যা হতে হবে')
      return
    }
    if (amount > 9999999) {
      setError('পরিমাণ খুব বেশি')
      return
    }
    
    setLoading(true)
    setError('')
    const billIdToOpen = collecting.billId
    
    try {
      const idempotencyKey = `${collecting.billId}-${Date.now()}-${Math.random()}`
      
      const response = await fetch(`${apiBase}/billing/collect`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
          'Idempotency-Key': idempotencyKey,
        },
        body: JSON.stringify({
          billId: collecting.billId,
          amount: Math.floor(amount),
          paidAt: collectForm.paidAt ? new Date(collectForm.paidAt).toISOString() : new Date().toISOString(),
          method: collectForm.method,
          idempotencyKey,
        }),
      })
      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || 'কালেকশন ব্যর্থ হয়েছে')
      }
      
      setCollecting(null)
      setCollectForm({
        amount: '',
        paidAt: formatDateTimeValue(new Date()),
        method: 'CASH',
      })
      
      await fetchCustomers()
      window.open(`/invoice/${billIdToOpen}`, '_blank', 'noopener')
      setError('পেমেন্ট সফলভাবে গৃহীত হয়েছে')
      setTimeout(() => setError(''), 3000)
    } catch (error) {
      setError(error.message)
    } finally {
      setLoading(false)
    }
  }

  const loadHistory = async (customerId) => {
    if (!token || !customerId) return
    setHistoryLoading(true)
    setHistoryStatus('')
    try {
      const response = await fetch(`${apiBase}/billing/history/${customerId}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || 'হিস্টোরি লোড করা যায়নি')
      }
      setHistoryRows(data.data || [])
    } catch (error) {
      setHistoryStatus(error.message)
    } finally {
      setHistoryLoading(false)
    }
  }

  const openHistoryModal = (row) => {
    setHistoryFor(row)
    loadHistory(row.customerId)
  }

  const closeHistoryModal = () => {
    setHistoryFor(null)
    setHistoryRows([])
    setHistoryStatus('')
  }

  const handleDeletePayment = async (paymentId) => {
    if (!token || role !== 'ADMIN') return
    const confirmed = window.confirm('আপনি কি এই কালেকশন ডিলিট করতে চান?')
    if (!confirmed) return
    setHistoryLoading(true)
    setHistoryStatus('')
    try {
      const response = await fetch(`${apiBase}/billing/payments/${paymentId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || 'ডিলিট ব্যর্থ হয়েছে')
      }
      if (historyFor) {
        await loadHistory(historyFor.customerId)
      }
      await fetchCustomers()
    } catch (error) {
      setHistoryStatus(error.message)
    } finally {
      setHistoryLoading(false)
    }
  }

  const handleBillCollect = (row) => {
    openCollectModal(row)
  }

  const handleBillReport = (row) => {
    openHistoryModal(row)
  }

  const handleCall = (row) => {
    if (row.mobile || row.phone) {
      window.location.href = `tel:${row.mobile || row.phone}`
    } else {
      alert(`${row.name} এর ফোন নাম্বার পাওয়া যায়নি`)
    }
  }

  const handleViewDetails = (row) => {
    navigate(`/customers/${row.customerId || row.id}`)
  }

  const menuHandlers = {
    onBillCollect: handleBillCollect,
    onBillReport: handleBillReport,
    onCall: handleCall,
    onViewDetails: handleViewDetails,
  }

  const currentStatus = statusOptions.find((s) => s.value === selectedStatus)

  return (
    <AppLayout title="কালেক্টর বিলিং">
      <div className="collector-billing-container">
        <div className="area-selector-section">
          <span className="area-label">সকল এরিয়া</span>
          <select
            id="area-select"
            value={selectedArea}
            onChange={(e) => setSelectedArea(e.target.value)}
            className="area-select"
          >
            <option value="">সব এরিয়া</option>
            {areas.map((area) => (
              <option key={area.id} value={area.id}>
                {area.name}
              </option>
            ))}
          </select>
        </div>

        <div className="status-tabs">
          {statusOptions.map((option) => (
            <button
              key={option.value}
              className={`tab ${selectedStatus === option.value ? 'active' : ''}`}
              onClick={() => setSelectedStatus(option.value)}
            >
              <span className="tab-label">{option.label}</span>
              <span className="tab-count">
                {selectedStatus === option.value ? `(${customers.length})` : ''}
              </span>
            </button>
          ))}
        </div>

        <div className="collector-search">
          <input
            type="text"
            placeholder="নাম, মোবাইল, আইডি"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
          />
        </div>

        <div className="collector-controls">
          <div className="collector-info">
            মোট {meta.total} জন গ্রাহক
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
              <option value={50}>50</option>
              <option value={100}>100</option>
              <option value="all">সব</option>
            </select>
          </label>
        </div>

        {/* Content Area */}
        <div className="collector-content">
          {error && (
            <div className="error-message">
              <strong>ত্রুটি:</strong> {error}
            </div>
          )}

          {loading && (
            <div className="loading-message">লোড হচ্ছে...</div>
          )}

          {!loading && customers.length === 0 && (
            <div className="empty-message">
              <p>
                {currentStatus && `${currentStatus.label} কোন গ্রাহক প্রাপ্য নয়`}
              </p>
            </div>
          )}

          {!loading && customers.length > 0 && (
            <div className="customer-list">
              {customers.map((customer) => (
                <CustomerListItem
                  key={customer.billId || customer.id}
                  customer={customer}
                  onMenuClick={menuHandlers}
                  selectedStatus={selectedStatus}
                />
              ))}
            </div>
          )}
        </div>

        {/* Pagination */}
        {!loading && customers.length > 0 && perPage !== 'all' && meta.totalPages > 1 && (
          <div className="pagination-wrapper">
            <button
              className="pagination-btn"
              disabled={page <= 1}
              onClick={() => setPage((prev) => Math.max(1, prev - 1))}
            >
              ‹ পূর্ববর্তী
            </button>
            <div className="pagination-info">
              পৃষ্ঠা {page} / {meta.totalPages}
            </div>
            <button
              className="pagination-btn"
              disabled={page >= meta.totalPages}
              onClick={() => setPage((prev) => Math.min(meta.totalPages, prev + 1))}
            >
              পরবর্তী ›
            </button>
          </div>
        )}
      </div>

      <div className={`modal-overlay ${collecting ? 'is-open' : ''}`}>
        <div
          className="modal"
          role="dialog"
          aria-modal="true"
          onClick={(event) => event.stopPropagation()}
        >
          <div className="modal-header">
            <h3>বিল কালেকশন</h3>
            <button className="btn outline" type="button" onClick={() => setCollecting(null)}>
              ✕
            </button>
          </div>
          {collecting ? (
            <form className="auth-form" onSubmit={handleCollectSubmit}>
              <div className="form-grid">
                <label className="field">
                  <span>গ্রাহক</span>
                  <input
                    type="text"
                    value={`${collecting.name} (${collecting.customerCode || collecting.id || '-'})`}
                    disabled
                  />
                </label>
                <label className="field">
                  <span>বর্তমান বকেয়া</span>
                  <input type="text" value={formatCurrency(collecting.totalDue)} disabled />
                </label>
                <label className="field">
                  <span>পরিশোধের পরিমাণ</span>
                  <input
                    type="number"
                    min="1"
                    value={collectForm.amount}
                    onChange={(event) =>
                      setCollectForm((prev) => ({ ...prev, amount: event.target.value }))
                    }
                    placeholder="পরিমাণ"
                  />
                </label>
                <label className="field">
                  <span>তারিখ ও সময়</span>
                  <input
                    type="datetime-local"
                    value={collectForm.paidAt}
                    onChange={(event) =>
                      setCollectForm((prev) => ({ ...prev, paidAt: event.target.value }))
                    }
                  />
                </label>
                <label className="field">
                  <span>মেথড</span>
                  <select
                    value={collectForm.method}
                    onChange={(event) =>
                      setCollectForm((prev) => ({ ...prev, method: event.target.value }))
                    }
                  >
                    {methodOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <div className="modal-actions">
                <button className="btn ghost" type="button" onClick={() => setCollecting(null)}>
                  বাতিল
                </button>
                <button className="btn primary" type="submit" disabled={loading}>
                  {loading ? 'সেভ হচ্ছে...' : 'সেভ'}
                </button>
              </div>
            </form>
          ) : null}
        </div>
        <button
          className="modal-backdrop"
          type="button"
          aria-label="Close"
          onClick={() => setCollecting(null)}
        />
      </div>

      <div className={`modal-overlay ${historyFor ? 'is-open' : ''}`}>
        <div
          className="modal"
          role="dialog"
          aria-modal="true"
          onClick={(event) => event.stopPropagation()}
        >
          <div className="modal-header">
            <h3>বিল হিস্টোরি</h3>
            <button className="btn outline" type="button" onClick={closeHistoryModal}>
              ✕
            </button>
          </div>
          {historyFor ? (
            <div>
              <div className="module-sub">
                {historyFor.name} ({historyFor.customerCode || historyFor.id})
              </div>
              {historyLoading ? <div className="module-sub">লোড হচ্ছে...</div> : null}
              {!historyLoading && !historyRows.length ? (
                <div className="module-sub">কোনো হিস্টোরি পাওয়া যায়নি</div>
              ) : null}
              {historyRows.length ? (
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>তারিখ</th>
                      <th>মাস সমন্বয়</th>
                      <th>কালেক্টর</th>
                      <th>মেথড</th>
                      <th>পরিমাণ</th>
                      <th>অ্যাকশন</th>
                    </tr>
                  </thead>
                  <tbody>
                    {historyRows.map((item) => (
                      <tr key={item.paymentId}>
                        <td>{formatDateTime(item.paidAt)}</td>
                        <td>{formatMonthAllocations(item.months)}</td>
                        <td>{item.collector?.name || '—'}</td>
                        <td>{item.method || '—'}</td>
                        <td>{formatCurrency(item.amount)}</td>
                        <td>
                          {role === 'ADMIN' ? (
                            <button
                              className="btn outline small"
                              type="button"
                              disabled={historyLoading}
                              onClick={() => handleDeletePayment(item.paymentId)}
                            >
                              ডিলিট
                            </button>
                          ) : (
                            <span className="cell-sub">—</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : null}
              {historyStatus ? <div className="status-banner error">{historyStatus}</div> : null}
            </div>
          ) : null}
        </div>
        <button
          className="modal-backdrop"
          type="button"
          aria-label="Close"
          onClick={closeHistoryModal}
        />
      </div>
    </AppLayout>
  )
}

export default CollectorBilling

