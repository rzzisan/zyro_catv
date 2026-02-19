import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import AppLayout from '../components/AppLayout.jsx'

const apiBase = import.meta.env.PROD
  ? '/api'
  : import.meta.env.VITE_API_BASE || 'http://localhost:5000'

const statusOptions = [
  { value: 'DUE', label: 'বকেয়া', icon: '⚠️' },
  { value: 'PARTIAL', label: 'আংশিক পরিশোধ', icon: '⏳' },
  { value: 'PAID', label: 'পরিশোধ', icon: '✓' },
  { value: 'ADVANCE', label: 'অগ্রিম', icon: '⬆️' },
]

const formatCurrency = (value) => `৳${Number(value || 0).toLocaleString('bn-BD')}`

// Menu options for three-dot menu
const MenuDialog = ({ customer, onClose, onBillCollect, onBillReport, onCall }) => {
  return (
    <div className="menu-dialog-overlay" onClick={onClose}>
      <div className="menu-dialog" onClick={(e) => e.stopPropagation()}>
        <button
          className="menu-item"
          onClick={() => {
            alert(`গ্রাহক প্রোফাইল: ${customer.name} (${customer.id})`)
            onClose()
          }}
          title="গ্রাহক প্রোফাইল"
        >
          👤 প্রোফাইল
        </button>
        <button
          className="menu-item"
          onClick={() => {
            onBillCollect(customer)
            onClose()
          }}
          title="বিল সংগ্রহ"
        >
          💵 বিল সংগ্রহ
        </button>
        <button
          className="menu-item"
          onClick={() => {
            onBillReport(customer)
            onClose()
          }}
          title="বিল রিপোর্ট"
        >
          📋 বিল রিপোর্ট
        </button>
        <button
          className="menu-item"
          onClick={() => {
            onCall(customer)
            onClose()
          }}
          title="কল করুন"
        >
          📞 কল
        </button>
        <button
          className="menu-item"
          onClick={() => {
            alert(`নোট: ${customer.name}`)
            onClose()
          }}
          title="নোট"
        >
          📝 নোট
        </button>
        <button
          className="menu-item"
          onClick={() => {
            alert(`বার্তা: ${customer.name}`)
            onClose()
          }}
          title="বার্তা"
        >
          💬 বার্তা
        </button>
      </div>
    </div>
  )
}

// Customer Card Component
const CustomerCard = ({ customer, onMenuClick }) => {
  const [showMenu, setShowMenu] = useState(false)

  return (
    <div className="collector-customer-card">
      <div className="customer-info">
        <div className="customer-header">
          <div>
            <h4 className="customer-name">{customer.name}</h4>
            <p className="customer-id">আইডি: {customer.id}</p>
          </div>
          <button
            className="menu-button"
            onClick={() => setShowMenu(!showMenu)}
            title="অপশন"
          >
            ⋮
          </button>
        </div>

        <div className="customer-details">
          <div className="detail-row">
            <span className="detail-label">📍 ঠিকানা:</span>
            <span className="detail-value">{customer.address || '—'}</span>
          </div>
          <div className="detail-row">
            <span className="detail-label">📱 ফোন:</span>
            <span className="detail-value">{customer.phone || '—'}</span>
          </div>
        </div>

        <div className="customer-due">
          <span className="due-label">মোট বকেয়া:</span>
          <span className="due-amount">{formatCurrency(customer.totalDue)}</span>
        </div>
      </div>

      {showMenu && (
        <MenuDialog
          customer={customer}
          onClose={() => setShowMenu(false)}
          onBillCollect={onMenuClick.onBillCollect}
          onBillReport={onMenuClick.onBillReport}
          onCall={onMenuClick.onCall}
        />
      )}
    </div>
  )
}

function CollectorBilling() {
  const navigate = useNavigate()
  const [areas, setAreas] = useState([])
  const [customers, setCustomers] = useState([])
  const [selectedArea, setSelectedArea] = useState('')
  const [selectedStatus, setSelectedStatus] = useState('DUE')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Fetch areas on mount
  useEffect(() => {
    const fetchAreas = async () => {
      try {
        const res = await fetch(`${apiBase}/areas`)
        if (!res.ok) throw new Error('Failed to fetch areas')
        const data = await res.json()
        setAreas(data.data || [])
        if (data.data && data.data.length > 0) {
          setSelectedArea(data.data[0].id)
        }
      } catch (err) {
        setError(err.message)
      }
    }
    fetchAreas()
  }, [])

  // Fetch customers when area or status changes
  useEffect(() => {
    if (!selectedArea) return

    const fetchCustomers = async () => {
      setLoading(true)
      setError('')
      try {
        const params = new URLSearchParams({
          areaId: selectedArea,
          status: selectedStatus,
          perPage: 1000,
        })
        const res = await fetch(`${apiBase}/billing?${params}`)
        if (!res.ok) throw new Error('Failed to fetch customers')
        const data = await res.json()
        setCustomers(data.data || [])
      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }

    fetchCustomers()
  }, [selectedArea, selectedStatus])

  const handleBillCollect = (customer) => {
    // Get the latest bill for this customer and navigate to invoice
    const latestBill = customer.bills && customer.bills.length > 0 ? customer.bills[0] : null
    if (latestBill) {
      navigate(`/invoice/${latestBill.id}`)
    } else {
      alert(`${customer.name} এর জন্য কোন বিল পাওয়া যায়নি`)
    }
  }

  const handleBillReport = (customer) => {
    // TODO: Implement bill report page
    alert(`${customer.name} এর সকল বিল রিপোর্ট শীঘ্রই আসবে`)
  }

  const handleCall = (customer) => {
    if (customer.phone) {
      window.location.href = `tel:${customer.phone}`
    } else {
      alert(`${customer.name} এর ফোন নাম্বার পাওয়া যায়নি`)
    }
  }

  const menuHandlers = {
    onBillCollect: handleBillCollect,
    onBillReport: handleBillReport,
    onCall: handleCall,
  }

  const currentStatus = statusOptions.find((s) => s.value === selectedStatus)

  return (
    <AppLayout title="কালেক্টর বিলিং">
      <div className="collector-billing-container">
        {/* Area Selector */}
        <div className="area-selector-section">
          <label htmlFor="area-select" className="area-label">
            এরিয়া নির্বাচন করুন:
          </label>
          <select
            id="area-select"
            value={selectedArea}
            onChange={(e) => setSelectedArea(e.target.value)}
            className="area-select"
          >
            <option value="">— এরিয়া বেছে নিন —</option>
            {areas.map((area) => (
              <option key={area.id} value={area.id}>
                {area.name}
              </option>
            ))}
          </select>
        </div>

        {/* Status Tabs */}
        <div className="status-tabs">
          {statusOptions.map((option) => (
            <button
              key={option.value}
              className={`tab ${selectedStatus === option.value ? 'active' : ''}`}
              onClick={() => setSelectedStatus(option.value)}
            >
              <span className="tab-icon">{option.icon}</span>
              <span className="tab-label">{option.label}</span>
              {customers.length > 0 && (
                <span className="tab-count">({customers.length})</span>
              )}
            </button>
          ))}
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
            <div className="customer-grid">
              {customers.map((customer) => (
                <CustomerCard
                  key={customer.id}
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

export default CollectorBilling
