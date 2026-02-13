function Topbar({ title, subtitle }) {
  return (
    <div className="topbar">
      <div>
        <div className="topbar-title">{title}</div>
        <div className="topbar-subtitle">{subtitle}</div>
      </div>
      <div className="topbar-user">
        <div className="avatar" aria-hidden="true" />
        <div>
          <div className="user-name">নাসিম সাইফুল</div>
          <div className="user-role">সিস্টেম অ্যাডমিন</div>
        </div>
      </div>
    </div>
  )
}

export default Topbar
