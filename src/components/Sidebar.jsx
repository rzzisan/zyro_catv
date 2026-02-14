import { NavLink } from 'react-router-dom'

const modules = [
  { label: 'ড্যাশবোর্ড', to: '/dashboard' },
  { label: 'এরিয়া', to: '/areas' },
  { label: 'গ্রাহক টাইপ', to: '/customer-types' },
  { label: 'ম্যানেজার', to: '/managers' },
  { label: 'কালেক্টর', to: '/collectors' },
  { label: 'গ্রাহক', to: '/customers' },
  { label: 'বিল', to: '/billing' },
  { label: 'রিপোর্ট', to: '/reports' },
  { label: 'ডিপোজিট', to: '/deposits' },
  { label: 'খরচ হিসাব', to: '/expenses' },
  { label: 'খরচের খাত', to: '/expense-categories' },
  { label: 'কর্মচারী', to: '/employees' },
  { label: 'টিউটোরিয়াল', to: '/tutorials' },
]

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
  const role = getUserRole()
  const collectorHidden = new Set(['/areas', '/customer-types', '/collectors', '/managers'])
  const visibleModules = modules.filter((item) => {
    if (role === 'COLLECTOR' && collectorHidden.has(item.to)) {
      return false
    }
    return true
  })

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
        {visibleModules.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `nav-link ${isActive ? 'active' : ''}`
            }
            onClick={onClose}
          >
            <span className="nav-dot" />
            <span className="nav-label">{item.label}</span>
          </NavLink>
        ))}
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
