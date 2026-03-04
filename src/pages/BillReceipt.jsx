import { useEffect, useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import AppLayout from '../components/AppLayout'
import { usePageTitle } from '../hooks/usePageTitle.js'

const apiBase = import.meta.env.PROD
  ? '/api'
  : import.meta.env.VITE_API_BASE || 'http://localhost:5000'

const formatCurrency = (value) => `৳${Number(value || 0).toLocaleString('bn-BD')}`

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

const monthNames = [
  'জানুয়ারি',
  'ফেব্রুয়ারি',
  'মার্চ',
  'এপ্রিল',
  'মে',
  'জুন',
  'জুলাই',
  'আগস্ট',
  'সেপ্টেম্বর',
  'অক্টোবর',
  'নভেম্বর',
  'ডিসেম্বর',
]

// Menu options for three-dot menu
const MenuDialog = ({ customer, onClose, onPrintInvoice, onViewDetails, menuRef }) => {
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
          onPrintInvoice(customer)
          onClose()
        }}
        title="ইনভয়েস প্রিন্ট"
      >
        ইনভয়েস প্রিন্ট
      </button>
    </div>
  )
}

// Customer List Item Component
const CustomerListItem = ({ customer, onMenuClick }) => {
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
          <div className="contact-line">{customer.mobile || '—'}</div>
        </div>
      </div>

      <div className="customer-right-section">
        <div className="collection-info">
          <div className="collection-amount">{formatCurrency(customer.totalCollected)}</div>
          <div className="collection-label">সংগ্রহ</div>
          <div className="collection-count">{customer.paymentCount} বার</div>
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
            <MenuDialog
              customer={customer}
              onClose={() => setShowMenu(false)}
              onPrintInvoice={onMenuClick.onPrintInvoice}
              onViewDetails={onMenuClick.onViewDetails}
              menuRef={menuRef}
            />
          )}
        </div>
      </div>
    </div>
  )
}

function BillReceipt() {
  usePageTitle('বিল রিসিট')
  const navigate = useNavigate()
  const [customers, setCustomers] = useState([])
  const [searchQuery, setSearchQuery] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [meta, setMeta] = useState({ total: 0, month: 0, year: 0 })

  const token = localStorage.getItem('auth_token')

  useEffect(() => {
    fetchReceipts()
  }, [token])

  const fetchReceipts = async () => {
    if (!token) return
    setLoading(true)
    setError('')
    try {
      const res = await fetch(`${apiBase}/billing/current-month-receipts`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) throw new Error('রিসিট লোড করতে ব্যর্থ')
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

  const handlePrintInvoice = (customer) => {
    if (customer.billId) {
      window.open(`/invoice/${customer.billId}`, '_blank', 'noopener')
    } else {
      setError('ইনভয়েস পাওয়া যায়নি')
      setTimeout(() => setError(''), 3000)
    }
  }

  const handleViewDetails = (customer) => {
    navigate(`/customers/${customer.customerId || customer.id}`)
  }

  const menuHandlers = {
    onPrintInvoice: handlePrintInvoice,
    onViewDetails: handleViewDetails,
  }

  const filteredCustomers = customers.filter((customer) => {
    const search = searchQuery.toLowerCase()
    return (
      customer.name.toLowerCase().includes(search) ||
      (customer.customerCode && customer.customerCode.toLowerCase().includes(search)) ||
      (customer.mobile && customer.mobile.includes(search))
    )
  })

  const currentMonthName = meta.month > 0 ? monthNames[meta.month - 1] : ''

  return (
    <AppLayout title="বিল রিসিট">
      <div className="collector-billing-container">
        <div className="bill-receipt-header">
          <h2 className="current-month-title">
            {currentMonthName} {meta.year} - সংগৃহীত বিল
          </h2>
          <p className="header-subtitle">চলতি মাসে যে সমস্থ গ্রাহকের বিল সংগ্রহ করা হয়েছে</p>
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
          <div className="collector-info">মোট {filteredCustomers.length} জন গ্রাহক</div>
        </div>

        {/* Content Area */}
        <div className="collector-content">
          {error && (
            <div className="error-message">
              <strong>ত্রুটি:</strong> {error}
            </div>
          )}

          {loading && <div className="loading-message">লোড হচ্ছে...</div>}

          {!loading && filteredCustomers.length === 0 && (
            <div className="empty-message">
              <p>{searchQuery ? 'কোন গ্রাহক পাওয়া যায়নি' : 'চলতি মাসে কোন বিল সংগ্রহ করা হয়নি'}</p>
            </div>
          )}

          {!loading && filteredCustomers.length > 0 && (
            <div className="customer-list">
              {filteredCustomers.map((customer) => (
                <CustomerListItem
                  key={customer.customerId}
                  customer={customer}
                  onMenuClick={menuHandlers}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  )
}

export default BillReceipt
