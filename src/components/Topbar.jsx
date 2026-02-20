import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'

function Topbar({ title, subtitle, onToggleSidebar }) {
  const navigate = useNavigate()
  const [userName, setUserName] = useState('')
  const [userRole, setUserRole] = useState('')

  useEffect(() => {
    const syncUser = () => {
      const name = localStorage.getItem('user_name') || ''
      const role = localStorage.getItem('user_role') || ''
      setUserName(name)
      setUserRole(role)
    }

    syncUser()
    window.addEventListener('storage', syncUser)
    window.addEventListener('user-profile-updated', syncUser)

    return () => {
      window.removeEventListener('storage', syncUser)
      window.removeEventListener('user-profile-updated', syncUser)
    }
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
        <button
          className="user-profile-btn"
          type="button"
          onClick={() => navigate('/profile')}
          aria-label="Open user profile"
        >
          <div className="user-name">{userName || 'User'}</div>
          <div className="user-role">{getRoleDisplay(userRole)}</div>
        </button>
        <button className="logout-btn" type="button" onClick={handleLogout}>
          লগআউট
        </button>
      </div>
    </header>
  )
}

export default Topbar
