function Topbar({ title, subtitle, onToggleSidebar }) {
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
      </div>
    </header>
  )
}

export default Topbar
