import AppLayout from '../components/AppLayout.jsx'

const rows = [
  { code: 'C-1001', name: 'রফিক ইসলাম', area: 'পূর্বপাড়া', type: 'অনালোগ' },
  { code: 'C-1002', name: 'সাইফুল করিম', area: 'রিকাবী বাজার', type: 'ডিজিটাল' },
]

function Customers() {
  return (
    <AppLayout title="গ্রাহক" subtitle="গ্রাহক তালিকা ও ফিল্টার">
      <div className="module-card">
        <div className="module-header">
          <div>
            <div className="module-title">গ্রাহক তালিকা</div>
            <div className="module-sub">মোট {rows.length} জন</div>
          </div>
          <button className="btn primary" type="button">
            নতুন গ্রাহক
          </button>
        </div>
        <table className="data-table">
          <thead>
            <tr>
              <th>গ্রাহক</th>
              <th>এরিয়া</th>
              <th>টাইপ</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.code}>
                <td>
                  <div className="cell-title">{row.name}</div>
                  <div className="cell-sub">{row.code}</div>
                </td>
                <td>{row.area}</td>
                <td>{row.type}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </AppLayout>
  )
}

export default Customers
