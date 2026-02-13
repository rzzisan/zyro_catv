import { useState } from 'react'
import Sidebar from './Sidebar.jsx'
import Topbar from './Topbar.jsx'

function AppLayout({ title, subtitle, children }) {
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [isMobileOpen, setIsMobileOpen] = useState(false)

  const handleToggleSidebar = () => {
    if (window.matchMedia('(max-width: 980px)').matches) {
      setIsMobileOpen((prev) => !prev)
    } else {
      setIsCollapsed((prev) => !prev)
    }
  }

  const handleCloseSidebar = () => setIsMobileOpen(false)

  return (
    <div className={`app-shell ${isCollapsed ? 'is-collapsed' : ''}`}>
      <Sidebar
        isCollapsed={isCollapsed}
        isMobileOpen={isMobileOpen}
        onClose={handleCloseSidebar}
      />
      <div className="app-main">
        <Topbar
          title={title}
          subtitle={subtitle}
          onToggleSidebar={handleToggleSidebar}
        />
        <main className="app-content">{children}</main>
      </div>
    </div>
  )
}

export default AppLayout
