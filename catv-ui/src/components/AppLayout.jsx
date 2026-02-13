import Sidebar from './Sidebar.jsx'
import Topbar from './Topbar.jsx'

function AppLayout({ title, subtitle, children }) {
  return (
    <div className="app-root">
      <div className="app-shell">
        <Sidebar />
        <section className="main-area">
          <Topbar title={title} subtitle={subtitle} />
          <div className="content">{children}</div>
        </section>
      </div>
    </div>
  )
}

export default AppLayout
