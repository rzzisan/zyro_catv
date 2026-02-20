import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'

function Topbar({ title, subtitle, onToggleSidebar }) {
  const navigate = useNavigate()
  const [userName, setUserName] = useState('')
  const [userRole, setUserRole] = useState('')

  useEffect(() => {
    const name = localStorage.getItem('user_name') || ''
    const role = localStorage.getItem('user_role') || ''
    setUserName(name)
    setUserRole(role)
  }, [])

  const getRoleDisplay = (role) => {
    const roleMap = {
      ADMIN: 'Admin Panel',
      MANAGER: 'Manager',
      COLLECTOR: 'Collector',
    }
    return roleMap[role] || role
  }

  const handleLogout = () => {
    localStorage.removeItem('auth_token')
    localStorage.removeItem('user_name')
    localStorage.removeItem('user_role')
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
          <div className="user-name">{userName || 'User'}</div>
          <div className="user-role">{getRoleDisplay(userRole)}</div>
        </div>
        <button className="logout-btn" type="button" onClick={handleLogout}>
          লগআউট
        </button>
      </div>
    </header>
  )
}

export default Topbar
