import { useEffect, useState } from 'react'
import AppLayout from '../components/AppLayout.jsx'

const apiBase = import.meta.env.PROD
  ? '/api'
  : import.meta.env.VITE_API_BASE || 'http://localhost:5000'

function AdminPackages() {
  const [packages, setPackages] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [status, setStatus] = useState('')
  const [isOpen, setIsOpen] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    price: '',
    durationMonths: '',
    supportTier: 'standard',
  })

  const token = localStorage.getItem('auth_token')

  useEffect(() => {
    loadPackages()
  }, [])

  const loadPackages = async () => {
    if (!token) return
    setIsLoading(true)
    setStatus('')
    try {
      const response = await fetch(`${apiBase}/billing/packages`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || 'প্যাকেজ লোড করা যায়নি')
      }
      setPackages(data.data || [])
    } catch (error) {
      setStatus(error.message)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!token) return

    setIsLoading(true)
    setStatus('')

    try {
      const response = await fetch(`${apiBase}/billing/packages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          ...formData,
          price: parseInt(formData.price),
          durationMonths: formData.durationMonths ? parseInt(formData.durationMonths) : null,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'প্যাকেজ তৈরি করা যায়নি')
      }

      setStatus('প্যাকেজ সফলভাবে তৈরি হয়েছে')
      setIsOpen(false)
      setFormData({ name: '', price: '', durationMonths: '', supportTier: 'standard' })
      await loadPackages()
    } catch (error) {
      setStatus(error.message)
    } finally {
      setIsLoading(false)
    }
  }

  const tierLabels = {
    basic: 'বেসিক',
    standard: 'স্ট্যান্ডার্ড',
    premium: 'প্রিমিয়াম',
  }

  return (
    <AppLayout title="প্যাকেজ" subtitle="প্যাকেজ ব্যবস্থাপনা">
      <div className="module-card">
        <div className="module-header">
          <div>
            <div className="module-title">প্যাকেজ তালিকা</div>
            <div className="module-sub">মোট {packages.length} টি</div>
          </div>
          <div className="action-buttons">
            <button className="btn primary" onClick={() => setIsOpen(true)}>
              নতুন প্যাকেজ
            </button>
          </div>
        </div>

        {status && (
          <div className={`status-banner ${status.includes('সফল') ? 'success' : 'error'}`}>
            {status}
          </div>
        )}

        {isLoading ? (
          <div className="module-sub">লোড হচ্ছে...</div>
        ) : packages.length === 0 ? (
          <div className="module-sub">কোনো প্যাকেজ পাওয়া যায়নি</div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.5rem' }}>
            {packages.map((pkg) => (
              <div key={pkg.id} className="bg-white rounded-lg border p-6">
                <h3 className="text-lg font-bold text-gray-900 mb-2">{pkg.name}</h3>
                <p className="text-3xl font-bold text-blue-600 mb-1">৳{pkg.price}</p>
                <p className="text-sm text-gray-600 mb-4">
                  {pkg.durationMonths ? `${pkg.durationMonths} মাসের জন্য` : 'একক মূল্য'}
                </p>

                <div className="space-y-2 mb-4">
                  <div className="text-sm">
                    <span className="font-semibold text-gray-700">সাপোর্ট: </span>
                    <span className={`status-pill info`}>
                      {tierLabels[pkg.supportTier] || pkg.supportTier}
                    </span>
                  </div>
                  {pkg.maxCustomers && (
                    <p className="text-sm text-gray-600">সর্বোচ্চ গ্রাহক: {pkg.maxCustomers}</p>
                  )}
                  {pkg.apiRateLimit && (
                    <p className="text-sm text-gray-600">API লিমিট: {pkg.apiRateLimit}/দিন</p>
                  )}
                </div>

                <button className="btn outline full">সম্পাদনা করুন</button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className={`modal-overlay ${isOpen ? 'is-open' : ''}`}>
        <div className="modal" onClick={(e) => e.stopPropagation()}>
          <div className="modal-header">
            <h3>নতুন প্যাকেজ তৈরি করুন</h3>
            <button className="btn outline" onClick={() => setIsOpen(false)}>✕</button>
          </div>
          <form className="auth-form" onSubmit={handleSubmit}>
            <label className="field">
              <span>প্যাকেজ নাম *</span>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="যেমন: প্রিমিয়াম প্লাস"
              />
            </label>

            <label className="field">
              <span>মূল্য (টাকা) *</span>
              <input
                type="number"
                required
                value={formData.price}
                onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                placeholder="যেমন: 5000"
              />
            </label>

            <label className="field">
              <span>সময়কাল (মাস)</span>
              <input
                type="number"
                value={formData.durationMonths}
                onChange={(e) => setFormData({ ...formData, durationMonths: e.target.value })}
                placeholder="যেমন: 12"
              />
            </label>

            <label className="field">
              <span>সাপোর্ট টায়ার</span>
              <select
                value={formData.supportTier}
                onChange={(e) => setFormData({ ...formData, supportTier: e.target.value })}
              >
                <option value="basic">বেসিক</option>
                <option value="standard">স্ট্যান্ডার্ড</option>
                <option value="premium">প্রিমিয়াম</option>
              </select>
            </label>

            <div className="modal-actions">
              <button className="btn ghost" type="button" onClick={() => setIsOpen(false)}>
                বাতিল
              </button>
              <button className="btn primary" type="submit" disabled={isLoading}>
                {isLoading ? 'তৈরি করছে...' : 'তৈরি করুন'}
              </button>
            </div>
          </form>
        </div>
        <button className="modal-backdrop" onClick={() => setIsOpen(false)} />
      </div>
    </AppLayout>
  )
}

export default AdminPackages
