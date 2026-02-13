import AppLayout from '../components/AppLayout.jsx'

const rows = [
  { name: 'মেইন ম্যানেজার', mobile: '01800000000', status: 'সক্রিয়' },
  { name: 'সহকারী ম্যানেজার', mobile: '01800000001', status: 'সক্রিয়' },
]

function Managers() {
  return (
    <AppLayout title="ম্যানেজার" subtitle="ম্যানেজার তালিকা ও পারমিশন">
      <div className="module-card">
        <div className="module-header">
          <div>
            <div className="module-title">ম্যানেজার তালিকা</div>
            <div className="module-sub">মোট {rows.length} জন</div>
          </div>
          <button className="btn primary" type="button">
            নতুন ম্যানেজার
          </button>
        </div>
        <table className="data-table">
          <thead>
            <tr>
              <th>নাম</th>
              <th>মোবাইল</th>
              <th>স্ট্যাটাস</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.mobile}>
                <td>{row.name}</td>
                <td>{row.mobile}</td>
                <td>{row.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </AppLayout>
  )
}

export default Managers
