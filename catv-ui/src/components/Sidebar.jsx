import { NavLink } from 'react-router-dom'

const menuItems = [
  { label: 'ড্যাশবোর্ড', to: '/dashboard' },
  { label: 'এরিয়া', to: '/area' },
  { label: 'ম্যানেজার' },
  { label: 'কালেক্টর' },
  { label: 'অপারেটর' },
  { label: 'গ্রাহক' },
  { label: 'বিল' },
  { label: 'রিপোর্ট' },
  { label: 'ডিপোজিট' },
  { label: 'খরচ হিসাব' },
  { label: 'খরচের খাত' },
  { label: 'কর্মচারী' },
  { label: 'টিউটোরিয়াল' },
]

function Sidebar() {
  return (
    <aside className="sidebar">
      <div className="brand">
        <div className="brand-mark">52</div>
        <div>
          <div className="brand-title">বায়ান্ন পে</div>
          <div className="brand-sub">অ্যাডমিন কনসোল</div>
        </div>
      </div>
      <ul className="menu">
        {menuItems.map((item) => (
          <li key={item.label}>
            {item.to ? (
              <NavLink
                to={item.to}
                className={({ isActive }) =>
                  `menu-link ${isActive ? 'active' : ''}`
                }
              >
                <span className="menu-dot" />
                {item.label}
              </NavLink>
            ) : (
              <span className="menu-link is-disabled">
                <span className="menu-dot" />
                {item.label}
              </span>
            )}
          </li>
        ))}
      </ul>
    </aside>
  )
}

export default Sidebar
