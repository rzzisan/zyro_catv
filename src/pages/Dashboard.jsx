import AppLayout from '../components/AppLayout.jsx'

const statCards = [
  { label: 'সঞ্চয়', value: '৳ 2,066,918' },
  { label: 'প্রগ্রেস', value: '6%' },
  { label: 'কালেকশন', value: '৳ 114,725' },
]

const managerStats = [
  { label: 'সংযোগ ফি', value: '৳ 0', tone: 'amber' },
  { label: 'গ্রাহক', value: '৳ 0', tone: 'indigo' },
  { label: 'কালেক্টর', value: '৳ 59,000', tone: 'sky' },
  { label: 'কালেকশন', value: '৳ 59,000', tone: 'green' },
  { label: 'ডিপোজিট', value: '৳ 0', tone: 'teal' },
  { label: 'ব্যালেন্স', value: '৳ 59,000', tone: 'navy' },
]

function Dashboard() {
  return (
    <AppLayout title="ড্যাশবোর্ড" subtitle="আজকের সারসংক্ষেপ">
      <section className="balance-banner">ব্যালেন্স: ৳ 0</section>

      <section className="stat-grid">
        {statCards.map((item) => (
          <article key={item.label} className="stat-card">
            <div className="stat-label">{item.label}</div>
            <div className="stat-value">{item.value}</div>
          </article>
        ))}
      </section>

      <section className="progress-card">
        <div className="progress-ring" aria-hidden="true">
          <div className="progress-inner">6%</div>
        </div>
        <div>
          <div className="progress-title">কালেকশন প্রগ্রেস</div>
          <div className="progress-sub">এই মাসের সংগ্রহ ৬% সম্পন্ন</div>
        </div>
      </section>

      <section className="section-title">ম্যানেজার</section>
      <section className="pill-grid">
        {managerStats.map((item) => (
          <article key={item.label} className={`pill-card tone-${item.tone}`}>
            <div className="pill-value">{item.value}</div>
            <div className="pill-label">{item.label}</div>
          </article>
        ))}
      </section>
    </AppLayout>
  )
}

export default Dashboard
