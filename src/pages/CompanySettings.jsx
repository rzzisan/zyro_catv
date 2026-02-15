import { useEffect, useState } from 'react'
import AppLayout from '../components/AppLayout.jsx'

const apiBase = import.meta.env.PROD
  ? '/api'
  : import.meta.env.VITE_API_BASE || 'http://localhost:5000'

function CompanySettings() {
  const [form, setForm] = useState({
    name: '',
    helplineNumber: '',
    invoiceNote: '',
    slogan: '',
    address: '',
    billingSystem: 'POSTPAID',
  })
  const [status, setStatus] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const token = localStorage.getItem('auth_token')

  const loadCompany = async () => {
    if (!token) return
    setIsLoading(true)
    setStatus('')
    try {
      const response = await fetch(`${apiBase}/company`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || 'কোম্পানি লোড করা যায়নি')
      }
      const company = data.data || {}
      setForm({
        name: company.name || '',
        helplineNumber: company.helplineNumber || '',
        invoiceNote: company.invoiceNote || '',
        slogan: company.slogan || '',
        address: company.address || '',
        billingSystem: company.billingSystem || 'POSTPAID',
      })
    } catch (error) {
      setStatus(error.message)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadCompany()
  }, [])

  const handleSubmit = async (event) => {
    event.preventDefault()
    if (!token) return
    setIsLoading(true)
    setStatus('')
    try {
      const response = await fetch(`${apiBase}/company`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: form.name,
          helplineNumber: form.helplineNumber || null,
          invoiceNote: form.invoiceNote || null,
          slogan: form.slogan || null,
          address: form.address || null,
          billingSystem: form.billingSystem,
        }),
      })
      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || 'কোম্পানি আপডেট করা যায়নি')
      }
      setStatus('সফলভাবে আপডেট হয়েছে')
      await loadCompany()
    } catch (error) {
      setStatus(error.message)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <AppLayout title="কোম্পানি সেটিং" subtitle="কোম্পানির তথ্য আপডেট করুন">
      <div className="module-card">
        <div className="module-header">
          <div>
            <div className="module-title">কোম্পানি সেটিং</div>
            <div className="module-sub">ইনভয়েস এবং হেল্পলাইন তথ্য নিয়ন্ত্রণ করুন</div>
          </div>
        </div>
        <form className="auth-form" onSubmit={handleSubmit}>
          <div className="form-grid">
            <label className="field">
              <span>কোম্পানি নাম</span>
              <input
                type="text"
                value={form.name}
                onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
                placeholder="কোম্পানির নাম"
              />
            </label>
            <label className="field">
              <span>হেল্পলাইন নাম্বার</span>
              <input
                type="text"
                value={form.helplineNumber}
                onChange={(event) => setForm((prev) => ({ ...prev, helplineNumber: event.target.value }))}
                placeholder="01XXXXXXXXX"
              />
            </label>
            <label className="field">
              <span>বিলিং সিস্টেম</span>
              <select
                value={form.billingSystem}
                onChange={(event) => setForm((prev) => ({ ...prev, billingSystem: event.target.value }))}
              >
                <option value="POSTPAID">পোস্টপেইড</option>
                <option value="PREPAID">প্রিপেইড</option>
              </select>
            </label>
            <label className="field">
              <span>শ্লোগান</span>
              <input
                type="text"
                value={form.slogan}
                onChange={(event) => setForm((prev) => ({ ...prev, slogan: event.target.value }))}
                placeholder="কোম্পানির শ্লোগান"
              />
            </label>
            <label className="field">
              <span>ইনভয়েস নোট</span>
              <textarea
                rows="3"
                value={form.invoiceNote}
                onChange={(event) => setForm((prev) => ({ ...prev, invoiceNote: event.target.value }))}
                placeholder="ইনভয়েসে দেখানোর নোট"
              />
            </label>
            <label className="field">
              <span>ঠিকানা</span>
              <textarea
                rows="3"
                value={form.address}
                onChange={(event) => setForm((prev) => ({ ...prev, address: event.target.value }))}
                placeholder="কোম্পানির ঠিকানা"
              />
            </label>
          </div>
          <div className="modal-actions">
            <button className="btn primary" type="submit" disabled={isLoading}>
              {isLoading ? 'সেভ হচ্ছে...' : 'আপডেট'}
            </button>
          </div>
        </form>
        {status ? (
          <div className={`status-banner ${status.includes('সফল') ? 'success' : 'error'}`}>
            {status}
          </div>
        ) : null}
      </div>
    </AppLayout>
  )
}

export default CompanySettings
