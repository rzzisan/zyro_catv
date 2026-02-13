import AppLayout from '../components/AppLayout.jsx'

const rows = [
  { name: 'পূর্বপাড়া', collector: 'কায়ুম মিয়া' },
  { name: 'রিকাবী বাজার', collector: 'মো: জুয়েল' },
  { name: 'বিনোদপুর', collector: 'অফিস স্টাফ' },
]

function Areas() {
  return (
    <AppLayout title="এরিয়া" subtitle="এরিয়া ভিত্তিক কালেক্টর তালিকা">
      <div className="module-card">
        <div className="module-header">
          <div>
            <div className="module-title">সকল এরিয়া</div>
            <div className="module-sub">মোট {rows.length} টি</div>
          </div>
          <button className="btn primary" type="button">
            নতুন এরিয়া
          </button>
        </div>
        <table className="data-table">
          <thead>
            <tr>
              <th>এরিয়া</th>
              <th>কালেক্টর</th>
              <th>অ্যাকশন</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.name}>
                <td>{row.name}</td>
                <td>{row.collector}</td>
                <td className="table-action">•••</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </AppLayout>
  )
}

export default Areas
