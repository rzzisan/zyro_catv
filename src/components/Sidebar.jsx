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

function Sidebar({ isCollapsed, isMobileOpen, onClose }) {
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
        {modules.map((item) => (
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
