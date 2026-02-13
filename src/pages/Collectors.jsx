import AppLayout from '../components/AppLayout.jsx'

const rows = [
  { name: 'ফিল্ড কালেক্টর', mobile: '01900000000', area: 'পূর্বপাড়া' },
  { name: 'জোন কালেক্টর', mobile: '01900000001', area: 'রিকাবী বাজার' },
]

function Collectors() {
  return (
    <AppLayout title="কালেক্টর" subtitle="কালেক্টর তালিকা">
      <div className="module-card">
        <div className="module-header">
          <div>
            <div className="module-title">কালেক্টর তালিকা</div>
            <div className="module-sub">মোট {rows.length} জন</div>
          </div>
          <button className="btn primary" type="button">
            নতুন কালেক্টর
          </button>
        </div>
        <table className="data-table">
          <thead>
            <tr>
              <th>নাম</th>
              <th>মোবাইল</th>
              <th>এরিয়া</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.mobile}>
                <td>{row.name}</td>
                <td>{row.mobile}</td>
                <td>{row.area}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </AppLayout>
  )
}

export default Collectors
