import { useEffect, useState } from 'react'
import { usePageTitle } from '../hooks/usePageTitle.js'

const apiBase = import.meta.env.PROD
  ? '/api'
  : import.meta.env.VITE_API_BASE || 'http://localhost:5000'

const formatCurrency = (value) => `৳ ${Number(value || 0).toLocaleString('bn-BD')}`

const formatDate = (value) => {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '-'
  return date.toLocaleDateString('bn-BD')
}

function BillReceipt() {
  usePageTitle('বিল রিসিট')
  const [bills, setBills] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [page, setPage] = useState(1)
  const [pagination, setPagination] = useState({})
  const [searchTerm, setSearchTerm] = useState('')

  const token = localStorage.getItem('auth_token')

  const loadBills = async (pageNum = 1) => {
    if (!token) {
      setError('লগইন করা নেই')
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      const response = await fetch(
        `${apiBase}/invoices?page=${pageNum}&limit=20`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      )
      const payload = await response.json()

      if (!response.ok) {
        throw new Error(payload.error || 'বিল লোড করতে ব্যর্থ')
      }

      setBills(payload.data || [])
      setPagination(payload.pagination || {})
      setError('')
    } catch (error) {
      setError(error.message)
      setBills([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadBills(page)
  }, [page])

  const handlePrint = (billId) => {
    window.open(`/invoice/${billId}`, '_blank')
  }

  const filteredBills = bills.filter((bill) => {
    const search = searchTerm.toLowerCase()
    return (
      bill.customerName.toLowerCase().includes(search) ||
      bill.customerCode.toLowerCase().includes(search) ||
      bill.customerMobile.includes(search)
    )
  })

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>বিল রিসিট</h1>
        <p>গ্রাহকের ইনভয়েস প্রিন্ট করুন</p>
      </div>

      {error && <div className="alert error">{error}</div>}

      <div className="card">
        <div className="card-header">
          <input
            type="text"
            placeholder="গ্রাহকের নাম, কোড বা মোবাইল সার্চ করুন..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
        </div>

        {loading ? (
          <div className="card-body text-center">
            <p>লোড হচ্ছে...</p>
          </div>
        ) : filteredBills.length === 0 ? (
          <div className="card-body text-center">
            <p>{searchTerm ? 'কোন বিল পাওয়া যায়নি' : 'কোন বিল নেই'}</p>
          </div>
        ) : (
          <>
            <table className="data-table">
              <thead>
                <tr>
                  <th>গ্রাহক</th>
                  <th>কোড</th>
                  <th>এরিয়া</th>
                  <th>মাস</th>
                  <th>বিল</th>
                  <th>পরিশোধ</th>
                  <th>স্ট্যাটাস</th>
                  <th>অ্যাকশন</th>
                </tr>
              </thead>
              <tbody>
                {filteredBills.map((bill) => (
                  <tr key={bill.id}>
                    <td>
                      <strong>{bill.customerName}</strong>
                      <br />
                      <small>{bill.customerMobile}</small>
                    </td>
                    <td>{bill.customerCode}</td>
                    <td>{bill.areaName}</td>
                    <td>{bill.monthLabel}</td>
                    <td className="text-right">{formatCurrency(bill.amount)}</td>
                    <td className="text-right">{formatCurrency(bill.totalPaid)}</td>
                    <td>
                      <span className={`status-badge status-${bill.status.toLowerCase()}`}>
                        {bill.status}
                      </span>
                    </td>
                    <td>
                      <button
                        className="btn small primary"
                        onClick={() => handlePrint(bill.id)}
                      >
                        প্রিন্ট করুন
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {pagination.pages > 1 && (
              <div className="pagination">
                <button
                  disabled={page === 1}
                  onClick={() => setPage(page - 1)}
                  className="btn primary"
                >
                  আগে
                </button>
                <span className="pagination-info">
                  পৃষ্ঠা {page} / {pagination.pages}
                </span>
                <button
                  disabled={page === pagination.pages}
                  onClick={() => setPage(page + 1)}
                  className="btn primary"
                >
                  পরে
                </button>
              </div>
            )}
          </>
        )}
      </div>

      <style>{`
        .page-container {
          padding: 20px;
        }

        .page-header {
          margin-bottom: 24px;
        }

        .page-header h1 {
          margin: 0 0 4px 0;
          font-size: 28px;
        }

        .page-header p {
          margin: 0;
          color: #666;
          font-size: 14px;
        }

        .card {
          background: white;
          border-radius: 8px;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
          overflow: hidden;
        }

        .card-header {
          padding: 16px;
          border-bottom: 1px solid #eee;
        }

        .search-input {
          width: 100%;
          padding: 10px 12px;
          border: 1px solid #ddd;
          border-radius: 4px;
          font-size: 14px;
          font-family: inherit;
        }

        .search-input:focus {
          outline: none;
          border-color: #0066cc;
          box-shadow: 0 0 0 3px rgba(0, 102, 204, 0.1);
        }

        .card-body {
          padding: 40px 20px;
          text-align: center;
          color: #999;
        }

        .text-center {
          text-align: center;
        }

        .alert {
          padding: 12px 16px;
          border-radius: 4px;
          margin: 0 0 16px 0;
        }

        .alert.error {
          background: #fee;
          color: #c33;
          border: 1px solid #fcc;
        }

        .data-table {
          width: 100%;
          border-collapse: collapse;
        }

        .data-table thead {
          background: #f5f5f5;
          border-bottom: 2px solid #ddd;
        }

        .data-table th {
          padding: 12px 16px;
          text-align: left;
          font-weight: 600;
          font-size: 13px;
          color: #333;
        }

        .data-table td {
          padding: 12px 16px;
          border-bottom: 1px solid #e5e5e5;
          font-size: 13px;
        }

        .data-table tr:hover {
          background: #fafafa;
        }

        .text-right {
          text-align: right;
        }

        .status-badge {
          display: inline-block;
          padding: 4px 8px;
          border-radius: 3px;
          font-size: 11px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .status-due {
          background: #fee;
          color: #c33;
        }

        .status-partial {
          background: #fef3cd;
          color: #856404;
        }

        .status-paid {
          background: #d4edda;
          color: #155724;
        }

        .status-advance {
          background: #cfe2ff;
          color: #084298;
        }

        .btn {
          padding: 8px 12px;
          border: 1px solid #ddd;
          border-radius: 4px;
          background: white;
          font-size: 13px;
          cursor: pointer;
          transition: all 0.2s;
        }

        .btn.small {
          padding: 6px 10px;
          font-size: 12px;
        }

        .btn.primary {
          background: #0066cc;
          color: white;
          border-color: #0066cc;
        }

        .btn.primary:hover:not(:disabled) {
          background: #0052a3;
          border-color: #0052a3;
        }

        .btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .pagination {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 12px;
          padding: 16px;
          border-top: 1px solid #eee;
        }

        .pagination-info {
          font-size: 13px;
          color: #666;
        }

        small {
          color: #999;
          font-size: 12px;
        }
      `}</style>
    </div>
  )
}

export default BillReceipt
