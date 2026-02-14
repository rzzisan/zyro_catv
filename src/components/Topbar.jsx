import { useNavigate } from 'react-router-dom'

function Topbar({ title, subtitle, onToggleSidebar }) {
  const navigate = useNavigate()

  const handleLogout = () => {
    localStorage.removeItem('auth_token')
    navigate('/')
  }
  return (
    <header className="topbar">
      <div className="topbar-left">
        <button
          className="menu-toggle"
          type="button"
          onClick={onToggleSidebar}
          aria-label="Toggle sidebar"
        >
          <span />
          <span />
          <span />
        </button>
        <div>
          <div className="topbar-title">{title}</div>
          <div className="topbar-sub">{subtitle}</div>
        </div>
      </div>
      <div className="topbar-user">
        <div className="avatar" aria-hidden="true" />
        <div>
          <div className="user-name">Zyrotech CATV billing Managment</div>
          <div className="user-role">Admin Panel</div>
        </div>
        <button className="logout-btn" type="button" onClick={handleLogout}>
          লগআউট
        </button>
      </div>
    </header>
  )
}

export default Topbar
