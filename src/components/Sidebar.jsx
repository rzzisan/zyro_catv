import { NavLink, useLocation } from 'react-router-dom'
import { useEffect, useState } from 'react'

const modules = [
  { label: 'ড্যাশবোর্ড', to: '/dashboard', icon: 'dashboard' },
  { label: 'এরিয়া', to: '/areas', icon: 'area' },
  { label: 'গ্রাহক টাইপ', to: '/customer-types', icon: 'tag' },
  { label: 'ম্যানেজার', to: '/managers', icon: 'shield' },
  { label: 'কালেক্টর', to: '/collectors', icon: 'user-check' },
  { label: 'গ্রাহক', to: '/customers', icon: 'user' },
  { label: 'বিল', to: '/billing', icon: 'receipt' },  { label: 'কালেক্টর বিলিং', to: '/collector-billing', icon: 'banknote' },  { label: '__REPORT_GROUP__' },
  { label: 'ডিপোজিট', to: '/deposits', icon: 'banknote' },
  { label: 'কোম্পানি সেটিং', to: '/company-settings', icon: 'gear' },
  { label: 'খরচ হিসাব', to: '/expenses', icon: 'wallet' },
  { label: 'খরচের খাত', to: '/expense-categories', icon: 'list' },
  { label: 'কর্মচারী', to: '/employees', icon: 'users' },
  { label: 'টিউটোরিয়াল', to: '/tutorials', icon: 'play' },
]

const reportModules = [
  { label: 'বর্তমান মাস', to: '/reports/current-month', icon: 'calendar' },
  { label: 'সকল মাস', to: '/reports/all-months', icon: 'calendar-range' },
  { label: 'বকেয়া', to: '/reports/due', icon: 'alert' },
  { label: 'পূর্বের সামারি', to: '/reports/previous-summary', icon: 'history' },
  { label: 'পেমেন্ট মেসেজ', to: '/reports/payment-message', icon: 'message' },
  { label: 'মেসেজ লগ', to: '/reports/message-log', icon: 'log' },
]

const Icon = ({ name }) => {
  switch (name) {
    case 'dashboard':
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true" className="nav-icon">
          <rect x="3" y="3" width="8" height="8" rx="2" />
          <rect x="13" y="3" width="8" height="5" rx="2" />
          <rect x="13" y="10" width="8" height="11" rx="2" />
          <rect x="3" y="13" width="8" height="8" rx="2" />
        </svg>
      )
    case 'area':
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true" className="nav-icon">
          <path d="M12 21s6-6 6-11a6 6 0 1 0-12 0c0 5 6 11 6 11z" />
          <circle cx="12" cy="10" r="2.5" />
        </svg>
      )
    case 'tag':
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true" className="nav-icon">
          <path d="M3 7a2 2 0 0 1 2-2h7l9 9-7 7-9-9V7z" />
          <circle cx="7.5" cy="9.5" r="1.5" />
        </svg>
      )
    case 'shield':
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true" className="nav-icon">
          <path d="M12 3l7 3v6c0 5-3.5 8-7 9-3.5-1-7-4-7-9V6l7-3z" />
        </svg>
      )
    case 'user-check':
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true" className="nav-icon">
          <circle cx="9" cy="8" r="4" />
          <path d="M3 20a6 6 0 0 1 12 0" />
          <path d="M16 9l2 2 4-4" />
        </svg>
      )
    case 'user':
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true" className="nav-icon">
          <circle cx="12" cy="8" r="4" />
          <path d="M4 20a8 8 0 0 1 16 0" />
        </svg>
      )
    case 'receipt':
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true" className="nav-icon">
          <path d="M6 3h12v18l-3-2-3 2-3-2-3 2V3z" />
          <path d="M8 8h8" />
          <path d="M8 12h8" />
          <path d="M8 16h5" />
        </svg>
      )
    case 'banknote':
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true" className="nav-icon">
          <rect x="3" y="6" width="18" height="12" rx="2" />
          <circle cx="12" cy="12" r="3" />
          <path d="M6 9h0" />
          <path d="M18 15h0" />
        </svg>
      )
    case 'gear':
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true" className="nav-icon">
          <circle cx="12" cy="12" r="3" />
          <path d="M12 2v2" />
          <path d="M12 20v2" />
          <path d="M4.9 4.9l1.4 1.4" />
          <path d="M17.7 17.7l1.4 1.4" />
          <path d="M2 12h2" />
          <path d="M20 12h2" />
          <path d="M4.9 19.1l1.4-1.4" />
          <path d="M17.7 6.3l1.4-1.4" />
        </svg>
      )
    case 'wallet':
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true" className="nav-icon">
          <rect x="3" y="6" width="18" height="12" rx="2" />
          <path d="M17 10h4v4h-4z" />
        </svg>
      )
    case 'list':
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true" className="nav-icon">
          <path d="M8 6h13" />
          <path d="M8 12h13" />
          <path d="M8 18h13" />
          <circle cx="4" cy="6" r="1" />
          <circle cx="4" cy="12" r="1" />
          <circle cx="4" cy="18" r="1" />
        </svg>
      )
    case 'users':
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true" className="nav-icon">
          <circle cx="8" cy="9" r="3" />
          <circle cx="16" cy="9" r="3" />
          <path d="M2 20a6 6 0 0 1 12 0" />
          <path d="M10 20a6 6 0 0 1 12 0" />
        </svg>
      )
    case 'play':
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true" className="nav-icon">
          <circle cx="12" cy="12" r="9" />
          <path d="M10 8l6 4-6 4z" />
        </svg>
      )
    case 'calendar':
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true" className="nav-icon">
          <rect x="3" y="5" width="18" height="16" rx="2" />
          <path d="M3 10h18" />
          <path d="M8 3v4" />
          <path d="M16 3v4" />
        </svg>
      )
    case 'calendar-range':
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true" className="nav-icon">
          <rect x="3" y="5" width="18" height="16" rx="2" />
          <path d="M3 10h18" />
          <path d="M8 3v4" />
          <path d="M16 3v4" />
          <path d="M7 14h4" />
          <path d="M13 14h4" />
        </svg>
      )
    case 'alert':
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true" className="nav-icon">
          <path d="M12 3l9 16H3l9-16z" />
          <path d="M12 9v4" />
          <path d="M12 17h0" />
        </svg>
      )
    case 'history':
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true" className="nav-icon">
          <circle cx="12" cy="12" r="8" />
          <path d="M12 8v5l3 2" />
          <path d="M4 12H2l2-2" />
        </svg>
      )
    case 'message':
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true" className="nav-icon">
          <path d="M4 5h16v10H7l-3 3V5z" />
        </svg>
      )
    case 'log':
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true" className="nav-icon">
          <rect x="4" y="4" width="16" height="16" rx="2" />
          <path d="M8 8h8" />
          <path d="M8 12h8" />
          <path d="M8 16h5" />
        </svg>
      )
    case 'report':
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true" className="nav-icon">
          <path d="M4 19V5" />
          <path d="M9 19V9" />
          <path d="M14 19V12" />
          <path d="M19 19V7" />
        </svg>
      )
    default:
      return null
  }
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

function Sidebar({ isCollapsed, isMobileOpen, onClose }) {
  const location = useLocation()
  const role = getUserRole()
  const collectorHidden = new Set(['/areas', '/customer-types', '/collectors', '/managers'])
  const [isReportOpen, setIsReportOpen] = useState(false)
  const isReportActive = location.pathname.startsWith('/reports')
  const visibleModules = modules.filter((item) => {
    if (role === 'COLLECTOR' && collectorHidden.has(item.to)) {
      return false
    }
    if (item.to === '/company-settings' && role !== 'ADMIN') {
      return false
    }
    return true
  })
  const visibleReports = reportModules

  useEffect(() => {
    if (isReportActive) {
      setIsReportOpen(true)
    }
  }, [isReportActive])

  return (
    <>
      <aside
        className={`sidebar ${isCollapsed ? 'is-collapsed' : ''} ${
          isMobileOpen ? 'is-open' : ''
        }`}
      >
        <div className="sidebar-brand">
        <div className="brand-mark">ZY</div>
        <div>
          <div className="brand-title">Zyrotech CATV</div>
          <div className="brand-sub">billing Managment</div>
        </div>
        <button className="sidebar-close" type="button" onClick={onClose}>
          ✕
        </button>
      </div>
      <nav className="sidebar-nav">
        {visibleModules.map((item) => {
          if (item.label === '__REPORT_GROUP__') {
            return (
              <div
                key="reports"
                className={`sidebar-group ${isReportOpen || isReportActive ? 'is-open' : ''}`}
              >
                <button
                  className="sidebar-group-title"
                  type="button"
                  title="রিপোর্ট"
                  onClick={() => setIsReportOpen((prev) => !prev)}
                >
                  <Icon name="report" />
                  রিপোর্ট
                </button>
                <div className="sidebar-sub">
                  {visibleReports.map((reportItem) => (
                    <NavLink
                      key={reportItem.to}
                      to={reportItem.to}
                      className={({ isActive }) =>
                        `nav-link ${isActive ? 'active' : ''}`
                      }
                      title={reportItem.label}
                      onClick={onClose}
                    >
                      {reportItem.icon ? <Icon name={reportItem.icon} /> : null}
                      <span className="nav-label">{reportItem.label}</span>
                    </NavLink>
                  ))}
                </div>
              </div>
            )
          }
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `nav-link ${isActive ? 'active' : ''}`
              }
              title={item.label}
              onClick={onClose}
            >
              {item.icon ? <Icon name={item.icon} /> : null}
              <span className="nav-label">{item.label}</span>
            </NavLink>
          )
        })}
      </nav>
      </aside>
      <button
        className={`sidebar-overlay ${isMobileOpen ? 'is-visible' : ''}`}
        type="button"
        aria-label="Close sidebar"
        onClick={onClose}
      />
    </>
  )
}

export default Sidebar
