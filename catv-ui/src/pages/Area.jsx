import { useMemo, useState } from 'react'
import AppLayout from '../components/AppLayout.jsx'

const areaRows = [
  {
    area: 'বরিশালপাড়া',
    collectors: 'কায়ুম মিয়া, মো: জুয়েল, অফিস স্টাফ',
  },
  {
    area: 'মাছুয়া বাড়ি',
    collectors: 'কায়ুম মিয়া, মো: জুয়েল, অফিস স্টাফ',
  },
  {
    area: 'কায়সারড়ি',
    collectors: 'কায়ুম মিয়া, মো: জুয়েল, অফিস স্টাফ',
  },
  {
    area: 'দক্ষিণ বিলেপুর',
    collectors: 'কায়ুম মিয়া, মো: জুয়েল, অফিস স্টাফ',
  },
  {
    area: 'সৈয়ালবাড়ি',
    collectors: 'কায়ুম মিয়া, মো: জুয়েল, অফিস স্টাফ',
  },
]

function Area() {
  const [query, setQuery] = useState('')
  const [isOpen, setIsOpen] = useState(false)

  const filteredRows = useMemo(() => {
    const needle = query.trim()
    if (!needle) return areaRows
    return areaRows.filter((row) => row.area.includes(needle))
  }, [query])

  return (
    <AppLayout title="এরিয়া ম্যানেজমেন্ট" subtitle="এরিয়া ভিত্তিক কালেক্টর তালিকা">
      <div className="table-card reveal">
        <div className="table-header">
          <div>
            <div className="table-title">সকল এরিয়া</div>
            <div className="table-sub">মোট: {filteredRows.length}</div>
          </div>
          <div className="table-actions">
            <input
              className="search-box"
              type="text"
              placeholder="Search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
            <button className="btn primary" type="button" onClick={() => setIsOpen(true)}>
              +
            </button>
          </div>
        </div>

        <table className="table">
          <thead>
            <tr>
              <th>এরিয়া</th>
              <th>কালেক্টর</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {filteredRows.map((row) => (
              <tr key={row.area}>
                <td>{row.area}</td>
                <td>{row.collectors}</td>
                <td className="action-dot">•••</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className={`modal-overlay ${isOpen ? 'is-open' : ''}`}>
        <div
          className="modal"
          role="dialog"
          aria-modal="true"
          onClick={(event) => event.stopPropagation()}
        >
          <div className="modal-header">
            <h3>নতুন এরিয়া</h3>
            <button
              className="btn outline"
              type="button"
              onClick={() => setIsOpen(false)}
            >
              ✕
            </button>
          </div>
          <label htmlFor="area-name">এরিয়ার নাম</label>
          <input
            id="area-name"
            className="search-box"
            type="text"
            placeholder="এরিয়ার নাম"
          />
          <div className="modal-actions">
            <button
              className="btn ghost"
              type="button"
              onClick={() => setIsOpen(false)}
            >
              বন্ধ করুন
            </button>
            <button className="btn primary" type="button">
              সাবমিট
            </button>
          </div>
        </div>
        <button
          className="modal-backdrop"
          type="button"
          aria-label="Close"
          onClick={() => setIsOpen(false)}
        />
      </div>
    </AppLayout>
  )
}

export default Area
