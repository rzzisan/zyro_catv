import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import AppLayout from '../components/AppLayout.jsx'

const apiBase = import.meta.env.PROD
  ? '/api'
  : import.meta.env.VITE_API_BASE || 'http://localhost:5000'

const formatCurrency = (value) => `৳ ${Number(value || 0).toLocaleString('bn-BD')}`

const formatDateTime = (value) => {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  return date.toLocaleString('bn-BD', {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

const monthNames = [
  'জানুয়ারি',
  'ফেব্রুয়ারি',
  'মার্চ',
  'এপ্রিল',
  'মে',
  'জুন',
  'জুলাই',
  'আগস্ট',
  'সেপ্টেম্বর',
  'অক্টোবর',
  'নভেম্বর',
  'ডিসেম্বর',
]

const monthLabel = (year, month) => {
  const name = monthNames[month - 1] || String(month)
  return `${name} ${year}`
}

const getUserRole = () => {
  const token = localStorage.getItem('auth_token')
  if (!token) return null
  const parts = token.split('.')
  if (parts.length !== 3) return null
  try {
    const payload = JSON.parse(atob(parts[1]))
    return payload?.role || null
  } catch (error) {
    return null
  }
}

function CustomerDetails() {
  const { customerId } = useParams()
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState('bills')
  const [customer, setCustomer] = useState(null)
  const [bills, setBills] = useState([])
  const [payments, setPayments] = useState([])
  const [summary, setSummary] = useState({ totalGenerated: 0, totalCollected: 0, totalDue: 0 })
  const [loading, setLoading] = useState(false)
  const [status, setStatus] = useState('')
  const [editingBill, setEditingBill] = useState(null)
  const [deletingPayment, setDeletingPayment] = useState(null)
  const [editForm, setEditForm] = useState({ amount: '' })
  const [deleteForm, setDeleteForm] = useState({ remark: '' })

  const token = localStorage.getItem('auth_token')
  const role = getUserRole()

  const loadCustomerDetails = async () => {
    if (!token) return
    setLoading(true)
    setStatus('')
    try {
      const response = await fetch(`${apiBase}/customers/${customerId}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || 'গ্রাহক লোড করা যায়নি')
      }
      setCustomer(data.data.customer)
      setBills(data.data.bills)
      setPayments(data.data.payments)
      setSummary(data.data.summary)
    } catch (error) {
      setStatus(error.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadCustomerDetails()
  }, [customerId])

  const openEditModal = (bill) => {
    setEditingBill(bill)
    setEditForm({ amount: String(bill.amount) })
  }

  const handleEditSubmit = async (event) => {
    event.preventDefault()
    if (!token || !editingBill) return

    const amount = Number(editForm.amount)
    if (!Number.isInteger(amount) || amount < 0) {
      setStatus('পরিমাণ অবশ্যই ০ বা তার চেয়ে বেশি হতে হবে')
      return
    }

    setLoading(true)
    setStatus('')
    try {
      const response = await fetch(`${apiBase}/billing/bills/${editingBill.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ amount }),
      })
      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || 'বিল আপডেট ব্যর্থ হয়েছে')
      }
      setEditingBill(null)
      setEditForm({ amount: '' })
      await loadCustomerDetails()
      setStatus('বিল সফলভাবে আপডেট হয়েছে')
      setTimeout(() => setStatus(''), 3000)
    } catch (error) {
      setStatus(error.message)
    } finally {
      setLoading(false)
    }
  }

  const openDeleteModal = (payment) => {
    setDeletingPayment(payment)
    setDeleteForm({ remark: '' })
  }

  const handleDeleteSubmit = async (event) => {
    event.preventDefault()
    if (!token || !deletingPayment || role !== 'ADMIN') return

    if (!deleteForm.remark.trim()) {
      setStatus('রিমার্ক দিতে হবে')
      return
    }

    setLoading(true)
    setStatus('')
    try {
      const response = await fetch(`${apiBase}/billing/payments/${deletingPayment.id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ remark: deleteForm.remark }),
      })
      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || 'পেমেন্ট ডিলিট ব্যর্থ হয়েছে')
      }
      setDeletingPayment(null)
      setDeleteForm({ remark: '' })
      await loadCustomerDetails()
      setStatus('পেমেন্ট সফলভাবে ডিলিট হয়েছে')
      setTimeout(() => setStatus(''), 3000)
    } catch (error) {
      setStatus(error.message)
    } finally {
      setLoading(false)
    }
  }

  const billStatus = () => {
    if (summary.totalDue === 0) return 'পরিশোধ'
    if (summary.totalDue > 0) return 'বকেয়া'
    return 'অগ্রিম'
  }

  return (
    <AppLayout title="গ্রাহক ডিটেইলস" subtitle="গ্রাহকের সম্পূর্ণ তথ্য">
      <div className="module-card">
        <div className="module-header">
          <button className="btn ghost" type="button" onClick={() => navigate(-1)}>
            ← ফিরে যান
          </button>
        </div>

        {loading && !customer ? (
          <div className="module-sub">লোড হচ্ছে...</div>
        ) : customer ? (
          <>
            <div className="customer-profile-section">
              <div className="profile-row">
                <div className="profile-item">
                  <span className="profile-label">গ্রাহক কোড</span>
                  <span className="profile-value">{customer.customerCode}</span>
                </div>
                <div className="profile-item">
                  <span className="profile-label">নাম</span>
                  <span className="profile-value">{customer.name}</span>
                </div>
                <div className="profile-item">
                  <span className="profile-label">মোবাইল</span>
                  <span className="profile-value">{customer.mobile}</span>
                </div>
                <div className="profile-item">
                  <span className="profile-label">এরিয়া</span>
                  <span className="profile-value">{customer.area?.name || '—'}</span>
                </div>
              </div>
              <div className="profile-row">
                <div className="profile-item">
                  <span className="profile-label">গ্রাহক টাইপ</span>
                  <span className="profile-value">{customer.customerType?.name || '—'}</span>
                </div>
                <div className="profile-item">
                  <span className="profile-label">মাসিক বিল</span>
                  <span className="profile-value">{formatCurrency(customer.monthlyFee)}</span>
                </div>
                <div className="profile-item">
                  <span className="profile-label">বিলিং স্ট্যাটাস</span>
                  <span className="profile-value">{customer.billingType}</span>
                </div>
                <div className="profile-item">
                  <span className="profile-label">ঠিকানা</span>
                  <span className="profile-value">{customer.address || '—'}</span>
                </div>
              </div>
            </div>

            <div className="metric-row">
              <div className="metric-card">
                <div className="metric-value">{formatCurrency(summary.totalGenerated)}</div>
                <div className="metric-label">মোট জেনারেটেড বিল</div>
              </div>
              <div className="metric-card">
                <div className="metric-value">{formatCurrency(summary.totalCollected)}</div>
                <div className="metric-label">মোট কালেক্টেড বিল</div>
              </div>
              <div className="metric-card">
                <div className="metric-value">{formatCurrency(Math.abs(summary.totalDue))}</div>
                <div className="metric-label">বকেয়া / অগ্রিম ({billStatus()})</div>
              </div>
            </div>

            <div className="tabs-container">
              <div className="tabs">
                <button
                  className={`tab ${activeTab === 'bills' ? 'active' : ''}`}
                  type="button"
                  onClick={() => setActiveTab('bills')}
                >
                  Generated & Updated Bill/Invoices
                </button>
                <button
                  className={`tab ${activeTab === 'payments' ? 'active' : ''}`}
                  type="button"
                  onClick={() => setActiveTab('payments')}
                >
                  All Received Bill History
                </button>
              </div>

              {activeTab === 'bills' && (
                <div className="tab-content">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>#</th>
                        <th>Date</th>
                        <th>Billing Month</th>
                        <th>Bill Amount</th>
                        <th>Paid Total</th>
                        <th>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {bills.map((bill, index) => (
                        <tr key={bill.id}>
                          <td>{index + 1}</td>
                          <td>{formatDateTime(bill.createdAt)}</td>
                          <td>{monthLabel(bill.periodYear, bill.periodMonth)}</td>
                          <td>{formatCurrency(bill.amount)}</td>
                          <td>{formatCurrency(bill.paidTotal)}</td>
                          <td>
                            {(role === 'ADMIN' || role === 'MANAGER') && (
                              <button
                                className="btn outline small"
                                type="button"
                                onClick={() => openEditModal(bill)}
                              >
                                এডিট
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr>
                        <td colSpan="3">Total</td>
                        <td>{formatCurrency(summary.totalGenerated)}</td>
                        <td colSpan="2"></td>
                      </tr>
                    </tfoot>
                  </table>
                  {!bills.length && <div className="module-sub">কোনো বিল পাওয়া যায়নি</div>}
                </div>
              )}

              {activeTab === 'payments' && (
                <div className="tab-content">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Receive Date</th>
                        <th>Received By</th>
                        <th>Payment Info</th>
                        <th>Created By</th>
                        <th>Received Bill</th>
                        <th>Total Bill</th>
                        <th>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {payments.map((payment) => (
                        <tr key={payment.id}>
                          <td>{formatDateTime(payment.paidAt)}</td>
                          <td>{payment.collectedBy?.name || '—'}</td>
                          <td>
                            Payment by - {payment.method || 'Cash'}
                            <br />
                            <small>Click For Details</small>
                          </td>
                          <td>{payment.collectedBy?.name || '—'}</td>
                          <td>{formatCurrency(payment.amount)}</td>
                          <td>{formatCurrency(payment.amount)}</td>
                          <td>
                            {role === 'ADMIN' && (
                              <button
                                className="btn outline small"
                                type="button"
                                onClick={() => openDeleteModal(payment)}
                              >
                                ডিলিট
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr>
                        <td colSpan="4">Total</td>
                        <td>{formatCurrency(summary.totalCollected)}</td>
                        <td colSpan="2"></td>
                      </tr>
                      <tr>
                        <td colSpan="4">Generated Bill</td>
                        <td>{formatCurrency(summary.totalGenerated)}</td>
                        <td colSpan="2"></td>
                      </tr>
                    </tfoot>
                  </table>
                  {!payments.length && <div className="module-sub">কোনো পেমেন্ট পাওয়া যায়নি</div>}
                </div>
              )}
            </div>
          </>
        ) : null}

        {status ? (
          <div className={`status-banner ${status.includes('সফল') ? 'success' : 'error'}`}>
            {status}
          </div>
        ) : null}
      </div>

      {/* Edit Bill Modal */}
      <div className={`modal-overlay ${editingBill ? 'is-open' : ''}`}>
        <div className="modal" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
          <div className="modal-header">
            <h3>বিল এডিট</h3>
            <button className="btn outline" type="button" onClick={() => setEditingBill(null)}>
              ✕
            </button>
          </div>
          {editingBill && (
            <form className="auth-form" onSubmit={handleEditSubmit}>
              <div className="form-grid">
                <label className="field">
                  <span>মাস</span>
                  <input
                    type="text"
                    value={monthLabel(editingBill.periodYear, editingBill.periodMonth)}
                    disabled
                  />
                </label>
                <label className="field">
                  <span>বিল অ্যামাউন্ট</span>
                  <input
                    type="number"
                    min="0"
                    value={editForm.amount}
                    onChange={(e) => setEditForm((prev) => ({ ...prev, amount: e.target.value }))}
                    placeholder="বিল অ্যামাউন্ট"
                  />
                </label>
              </div>
              <div className="modal-actions">
                <button className="btn ghost" type="button" onClick={() => setEditingBill(null)}>
                  বাতিল
                </button>
                <button className="btn primary" type="submit" disabled={loading}>
                  {loading ? 'সেভ হচ্ছে...' : 'সেভ'}
                </button>
              </div>
            </form>
          )}
        </div>
        <button
          className="modal-backdrop"
          type="button"
          aria-label="Close"
          onClick={() => setEditingBill(null)}
        />
      </div>

      {/* Delete Payment Modal */}
      <div className={`modal-overlay ${deletingPayment ? 'is-open' : ''}`}>
        <div className="modal" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
          <div className="modal-header">
            <h3>পেমেন্ট ডিলিট</h3>
            <button className="btn outline" type="button" onClick={() => setDeletingPayment(null)}>
              ✕
            </button>
          </div>
          {deletingPayment && (
            <form className="auth-form" onSubmit={handleDeleteSubmit}>
              <div className="form-grid">
                <label className="field">
                  <span>পরিমাণ</span>
                  <input type="text" value={formatCurrency(deletingPayment.amount)} disabled />
                </label>
                <label className="field">
                  <span>রিমার্ক (বাধ্যতামূলক)</span>
                  <textarea
                    rows="3"
                    value={deleteForm.remark}
                    onChange={(e) => setDeleteForm((prev) => ({ ...prev, remark: e.target.value }))}
                    placeholder="ডিলিট করার কারণ লিখুন"
                    required
                  />
                </label>
              </div>
              <div className="modal-actions">
                <button className="btn ghost" type="button" onClick={() => setDeletingPayment(null)}>
                  বাতিল
                </button>
                <button className="btn primary" type="submit" disabled={loading}>
                  {loading ? 'ডিলিট হচ্ছে...' : 'ডিলিট'}
                </button>
              </div>
            </form>
          )}
        </div>
        <button
          className="modal-backdrop"
          type="button"
          aria-label="Close"
          onClick={() => setDeletingPayment(null)}
        />
      </div>
    </AppLayout>
  )
}

export default CustomerDetails
