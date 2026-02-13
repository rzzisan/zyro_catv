import AppLayout from '../components/AppLayout.jsx'

const metrics = [
  { value: '৳ 2,075,268', label: 'সঞ্চয়' },
  { value: '5%', label: 'প্রগ্রেস' },
  { value: '৳ 104,575', label: 'কালেকশন' },
]

const managerStats = [
  { value: '৳ 0 সংযোগ ফি', tone: 'sun' },
  { value: '৳ 0 গ্রাহক', tone: 'ocean' },
  { value: '৳ 59,000 কালেক্টর', tone: 'mint' },
  { value: '৳ 59,000 কালেকশন', tone: 'leaf' },
  { value: '৳ 0 ডিপোজিট', tone: 'ember' },
]

const quickHits = [
  { value: '4 নতুন সংযোগ', tone: 'navy' },
  { value: '1 নতুন বক্স', tone: 'jade' },
  { value: '39 ফ্রি গ্রাহক', tone: 'gold' },
  { value: '৳ 0 খরচ', tone: 'sky' },
  { value: '৳ 0 সালারী', tone: 'brick' },
]

function Dashboard() {
  return (
    <AppLayout title="বায়ান্ন পে অ্যাডমিন" subtitle="আজকের সারসংক্ষেপ">
      <div className="balance-card reveal">ব্যালেন্স: ৳ 0</div>

      <div className="stat-grid">
        {metrics.map((metric) => (
          <div className="metric-card reveal" key={metric.label}>
            <div className="metric-value">{metric.value}</div>
            <div className="metric-label">{metric.label}</div>
          </div>
        ))}
      </div>

      <div className="section-title">ম্যানেজার</div>
      <div className="stat-grid">
        {managerStats.map((stat) => (
          <div className={`stat-pill tone-${stat.tone}`} key={stat.value}>
            {stat.value}
          </div>
        ))}
      </div>

      <div className="metric-row">
        {quickHits.map((item) => (
          <div className={`metric-card tone-${item.tone}`} key={item.value}>
            {item.value}
          </div>
        ))}
      </div>
    </AppLayout>
  )
}

export default Dashboard
