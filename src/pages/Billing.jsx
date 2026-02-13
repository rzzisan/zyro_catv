import AppLayout from '../components/AppLayout.jsx'

const rows = [
  { id: 'B-2401', name: 'রফিক ইসলাম', amount: '৳ 350', status: 'বকেয়া' },
  { id: 'B-2402', name: 'সাইফুল করিম', amount: '৳ 500', status: 'পরিশোধ' },
]

function Billing() {
  return (
    <AppLayout title="বিল" subtitle="বিলিং ও কালেকশন তালিকা">
      <div className="module-card">
        <div className="module-header">
          <div>
            <div className="module-title">বিল তালিকা</div>
            <div className="module-sub">মোট {rows.length} টি</div>
          </div>
          <button className="btn primary" type="button">
            কালেকশন
          </button>
        </div>
        <table className="data-table">
          <thead>
            <tr>
              <th>গ্রাহক</th>
              <th>পরিমাণ</th>
              <th>স্ট্যাটাস</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id}>
                <td>{row.name}</td>
                <td>{row.amount}</td>
                <td>{row.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </AppLayout>
  )
}

export default Billing
