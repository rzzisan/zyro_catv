import { useEffect, useState } from 'react'
import AppLayout from '../components/AppLayout.jsx'

const apiBase = import.meta.env.PROD
  ? '/api'
  : import.meta.env.VITE_API_BASE || 'http://localhost:5000'

const defaultFormData = {
  name: '',
  billingCycle: 'MONTHLY',
  price: '',
  maxCustomers: '',
}

const parseApiResponse = async (response) => {
  const contentType = response.headers.get('content-type') || ''
  if (contentType.includes('application/json')) {
    return response.json()
  }
  const text = await response.text()
  return {
    error: text?.trim()
      ? `সার্ভার JSON দেয়নি। (${text.slice(0, 300)})`
      : 'সার্ভার থেকে সঠিক রেসপন্স পাওয়া যায়নি',
  }
}

const cycleLabel = (pkg) => {
  const billingCycle = pkg.billingCycle || (pkg.durationMonths === 12 ? 'YEARLY' : 'MONTHLY')
  return billingCycle === 'YEARLY' ? 'বাৎসরিক' : 'মাসিক'
}

function AdminPackages() {
  const [packages, setPackages] = useState([])
  const [deletedPackages, setDeletedPackages] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [isTrashLoading, setIsTrashLoading] = useState(false)
  const [status, setStatus] = useState('')
  const [isOpen, setIsOpen] = useState(false)
  const [editingPackageId, setEditingPackageId] = useState('')
  const [actionPackageId, setActionPackageId] = useState('') // for delete/restore in-progress
  const [formData, setFormData] = useState(defaultFormData)
  const [showTrash, setShowTrash] = useState(false)

  const token = localStorage.getItem('auth_token')
  const isEditing = Boolean(editingPackageId)

  useEffect(() => {
    loadPackages()
  }, [])

  useEffect(() => {
    if (showTrash) loadDeletedPackages()
  }, [showTrash])

  const loadPackages = async () => {
    if (!token) return
    setIsLoading(true)
    try {
      const response = await fetch(`${apiBase}/admin/packages`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await parseApiResponse(response)
      if (!response.ok) throw new Error(data.error || 'প্যাকেজ লোড করা যায়নি')
      setPackages(data.data || [])
    } catch (error) {
      setStatus(error.message)
    } finally {
      setIsLoading(false)
    }
  }

  const loadDeletedPackages = async () => {
    if (!token) return
    setIsTrashLoading(true)
    try {
      const response = await fetch(`${apiBase}/admin/packages?trash=1`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await parseApiResponse(response)
      if (!response.ok) throw new Error(data.error || 'ডিলিট করা প্যাকেজ লোড করা যায়নি')
      setDeletedPackages(data.data || [])
    } catch (error) {
      setStatus(error.message)
    } finally {
      setIsTrashLoading(false)
    }
  }

  const closeModal = () => {
    setIsOpen(false)
    setEditingPackageId('')
    setFormData(defaultFormData)
  }

  const openCreateModal = () => {
    setStatus('')
    setEditingPackageId('')
    setFormData(defaultFormData)
    setIsOpen(true)
  }

  const openEditModal = (pkg) => {
    setStatus('')
    setEditingPackageId(pkg.id)
    setFormData({
      name: pkg.name || '',
      billingCycle: pkg.billingCycle || (pkg.durationMonths === 12 ? 'YEARLY' : 'MONTHLY'),
      price: String(pkg.price ?? ''),
      maxCustomers: String(pkg.maxCustomers ?? ''),
    })
    setIsOpen(true)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!token) return
    setIsLoading(true)
    setStatus('')
    try {
      const response = await fetch(
        isEditing ? `${apiBase}/admin/packages/${editingPackageId}` : `${apiBase}/admin/packages`,
        {
          method: isEditing ? 'PUT' : 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({
            name: formData.name,
            billingCycle: formData.billingCycle,
            price: parseInt(formData.price),
            maxCustomers: parseInt(formData.maxCustomers),
          }),
        }
      )
      const data = await parseApiResponse(response)
      if (!response.ok) {
        throw new Error(data.error || (isEditing ? 'প্যাকেজ আপডেট করা যায়নি' : 'প্যাকেজ তৈরি করা যায়নি'))
      }
      setStatus(isEditing ? 'প্যাকেজ সফলভাবে আপডেট হয়েছে' : 'প্যাকেজ সফলভাবে তৈরি হয়েছে')
      closeModal()
      await loadPackages()
    } catch (error) {
      setStatus(error.message)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSoftDelete = async (pkg) => {
    if (!token || actionPackageId) return
    const confirmed = window.confirm(`"${pkg.name}" প্যাকেজটি ডিলিট করতে চান? পরে Restore করা যাবে।`)
    if (!confirmed) return
    setActionPackageId(pkg.id)
    setStatus('')
    try {
      const response = await fetch(`${apiBase}/admin/packages/${pkg.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await parseApiResponse(response)
      if (!response.ok) throw new Error(data.error || 'প্যাকেজ ডিলিট করা যায়নি')
      setStatus(data.message || 'প্যাকেজ ডিলিট হয়েছে')
      await loadPackages()
      if (showTrash) await loadDeletedPackages()
    } catch (error) {
      setStatus(error.message)
    } finally {
      setActionPackageId('')
    }
  }

  const handleRestore = async (pkg) => {
    if (!token || actionPackageId) return
    setActionPackageId(pkg.id)
    setStatus('')
    try {
      const response = await fetch(`${apiBase}/admin/packages/${pkg.id}/restore`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await parseApiResponse(response)
      if (!response.ok) throw new Error(data.error || 'প্যাকেজ রিস্টোর করা যায়নি')
      setStatus(data.message || 'প্যাকেজ সফলভাবে রিস্টোর হয়েছে')
      await loadPackages()
      await loadDeletedPackages()
    } catch (error) {
      setStatus(error.message)
    } finally {
      setActionPackageId('')
    }
  }

  const isSuccess = status.includes('সফল') || status.includes('রিস্টোর') || status.includes('ডিলিট হয়েছে')

  return (
    <AppLayout title="প্যাকেজ" subtitle="প্যাকেজ ব্যবস্থাপনা">
      {/* Active packages */}
      <div className="module-card">
        <div className="module-header">
          <div>
            <div className="module-title">প্যাকেজ তালিকা</div>
            <div className="module-sub">মোট {packages.length} টি সক্রিয়</div>
          </div>
          <div className="action-buttons">
            <button
              className={`btn ${showTrash ? 'ghost' : 'outline'}`}
              onClick={() => setShowTrash((v) => !v)}
            >
              {showTrash ? 'ডিলিট করা লুকান' : `ডিলিট করা দেখুন (${deletedPackages.length})`}
            </button>
            <button className="btn primary" onClick={openCreateModal}>
              নতুন প্যাকেজ
            </button>
          </div>
        </div>

        {status && (
          <div className={`status-banner ${isSuccess ? 'success' : 'error'}`}>
            {status}
          </div>
        )}

        {isLoading ? (
          <div className="module-sub">লোড হচ্ছে...</div>
        ) : packages.length === 0 ? (
          <div className="module-sub">কোনো সক্রিয় প্যাকেজ নেই</div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.5rem' }}>
            {packages.map((pkg) => (
              <div key={pkg.id} className="bg-white rounded-lg border p-6">
                <h3 className="text-lg font-bold text-gray-900 mb-2">{pkg.name}</h3>
                <p className="text-3xl font-bold text-blue-600 mb-1">৳{pkg.price}</p>
                <p className="text-sm text-gray-600 mb-4">{cycleLabel(pkg)} প্যাকেজ</p>
                <div className="space-y-2 mb-4">
                  <p className="text-sm text-gray-600">সর্বোচ্চ গ্রাহক: {pkg.maxCustomers || '—'}</p>
                </div>
                <div className="action-buttons" style={{ display: 'flex', gap: '0.5rem' }}>
                  <button className="btn outline full" onClick={() => openEditModal(pkg)}>
                    সম্পাদনা
                  </button>
                  <button
                    className="btn danger full"
                    onClick={() => handleSoftDelete(pkg)}
                    disabled={actionPackageId === pkg.id}
                  >
                    {actionPackageId === pkg.id ? 'হচ্ছে...' : 'ডিলিট'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Trash / deleted packages */}
      {showTrash && (
        <div className="module-card" style={{ marginTop: '1.5rem' }}>
          <div className="module-header">
            <div>
              <div className="module-title" style={{ color: '#6b7280' }}>ডিলিট করা প্যাকেজ</div>
              <div className="module-sub">মোট {deletedPackages.length} টি</div>
            </div>
          </div>

          {isTrashLoading ? (
            <div className="module-sub">লোড হচ্ছে...</div>
          ) : deletedPackages.length === 0 ? (
            <div className="module-sub">কোনো ডিলিট করা প্যাকেজ নেই</div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.5rem' }}>
              {deletedPackages.map((pkg) => (
                <div key={pkg.id} className="bg-white rounded-lg border p-6" style={{ opacity: 0.75 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                    <h3 className="text-lg font-bold text-gray-900">{pkg.name}</h3>
                    <span className="status-pill inactive" style={{ fontSize: '0.7rem' }}>ডিলিট করা</span>
                  </div>
                  <p className="text-3xl font-bold text-gray-400 mb-1">৳{pkg.price}</p>
                  <p className="text-sm text-gray-500 mb-4">{cycleLabel(pkg)} প্যাকেজ</p>
                  <div className="space-y-2 mb-4">
                    <p className="text-sm text-gray-500">সর্বোচ্চ গ্রাহক: {pkg.maxCustomers || '—'}</p>
                    {pkg.deletedAt && (
                      <p className="text-sm text-gray-400">
                        ডিলিট: {new Date(pkg.deletedAt).toLocaleDateString('bn-BD')}
                      </p>
                    )}
                  </div>
                  <button
                    className="btn outline full"
                    onClick={() => handleRestore(pkg)}
                    disabled={actionPackageId === pkg.id}
                  >
                    {actionPackageId === pkg.id ? 'রিস্টোর হচ্ছে...' : '↩ রিস্টোর করুন'}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Create / Edit modal */}
      <div className={`modal-overlay ${isOpen ? 'is-open' : ''}`}>
        <div className="modal" onClick={(e) => e.stopPropagation()}>
          <div className="modal-header">
            <h3>{isEditing ? 'প্যাকেজ সম্পাদনা করুন' : 'নতুন প্যাকেজ তৈরি করুন'}</h3>
            <button className="btn outline" onClick={closeModal}>✕</button>
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
              <span>প্যাকেজ টাইপ *</span>
              <select
                required
                value={formData.billingCycle}
                onChange={(e) => setFormData({ ...formData, billingCycle: e.target.value })}
              >
                <option value="MONTHLY">মাসিক</option>
                <option value="YEARLY">বাৎসরিক</option>
              </select>
            </label>

            <label className="field">
              <span>দাম (টাকা) *</span>
              <input
                type="number"
                required
                min="1"
                value={formData.price}
                onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                placeholder="যেমন: 5000"
              />
            </label>

            <label className="field">
              <span>গ্রাহক সীমা *</span>
              <input
                type="number"
                required
                min="1"
                value={formData.maxCustomers}
                onChange={(e) => setFormData({ ...formData, maxCustomers: e.target.value })}
                placeholder="যেমন: 200"
              />
            </label>

            <div className="modal-actions">
              <button className="btn ghost" type="button" onClick={closeModal}>
                বাতিল
              </button>
              <button className="btn primary" type="submit" disabled={isLoading}>
                {isLoading
                  ? (isEditing ? 'আপডেট হচ্ছে...' : 'তৈরি করছে...')
                  : (isEditing ? 'আপডেট করুন' : 'তৈরি করুন')}
              </button>
            </div>
          </form>
        </div>
        <button className="modal-backdrop" onClick={closeModal} />
      </div>
    </AppLayout>
  )
}

export default AdminPackages
