import { useEffect, useState } from 'react'
import AppLayout from '../components/AppLayout.jsx'

const apiBase = import.meta.env.PROD
  ? '/api'
  : import.meta.env.VITE_API_BASE || 'http://localhost:5000'

function UserProfile() {
  const [form, setForm] = useState({
    name: '',
    mobile: '',
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  })
  const [status, setStatus] = useState({ type: '', message: '' })
  const [isLoading, setIsLoading] = useState(false)
  const [isFetching, setIsFetching] = useState(false)

  const token = localStorage.getItem('auth_token')

  const loadProfile = async () => {
    if (!token) return
    setIsFetching(true)
    setStatus({ type: '', message: '' })
    try {
      const response = await fetch(`${apiBase}/users/me`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || 'প্রোফাইল তথ্য লোড করা যায়নি')
      }

      setForm({
        name: data.data?.name || '',
        mobile: data.data?.mobile || '',
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      })
    } catch (error) {
      setStatus({ type: 'error', message: error.message })
    } finally {
      setIsFetching(false)
    }
  }

  useEffect(() => {
    loadProfile()
  }, [])

  const handleChange = (event) => {
    const { name, value } = event.target
    setForm((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    if (!token) return
    setIsLoading(true)
    setStatus({ type: '', message: '' })

    try {
      const hasPasswordInput =
        form.currentPassword || form.newPassword || form.confirmPassword

      if (hasPasswordInput) {
        if (!form.currentPassword || !form.newPassword || !form.confirmPassword) {
          setStatus({ type: 'error', message: 'সবগুলো পাসওয়ার্ড ফিল্ড পূরণ করুন' })
          setIsLoading(false)
          return
        }

        if (form.newPassword !== form.confirmPassword) {
          setStatus({ type: 'error', message: 'নতুন পাসওয়ার্ড মিলছে না' })
          setIsLoading(false)
          return
        }
      }

      const payload = {
        name: form.name.trim(),
        mobile: form.mobile.trim(),
      }

      if (hasPasswordInput) {
        payload.currentPassword = form.currentPassword
        payload.newPassword = form.newPassword
      }

      const response = await fetch(`${apiBase}/users/me`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      })

      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || 'প্রোফাইল আপডেট করা যায়নি')
      }

      localStorage.setItem('user_name', data.data?.name || form.name)
      setForm((prev) => ({
        ...prev,
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      }))
      window.dispatchEvent(new Event('user-profile-updated'))
      setStatus({ type: 'success', message: 'প্রোফাইল আপডেট সফল হয়েছে' })
    } catch (error) {
      setStatus({ type: 'error', message: error.message })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <AppLayout title="প্রোফাইল" subtitle="আপনার তথ্য আপডেট করুন">
      <div className="module-card">
        <div className="module-header">
          <div>
            <div className="module-title">ইউজার প্রোফাইল</div>
            <div className="module-sub">নাম, ফোন নম্বর এবং পাসওয়ার্ড আপডেট করুন</div>
          </div>
        </div>

        <form className="auth-form" onSubmit={handleSubmit}>
          <div className="form-grid">
            <label className="field">
              <span>নাম</span>
              <input
                name="name"
                type="text"
                value={form.name}
                onChange={handleChange}
                placeholder="আপনার নাম"
              />
            </label>
            <label className="field">
              <span>মোবাইল নম্বর</span>
              <input
                name="mobile"
                type="text"
                value={form.mobile}
                onChange={handleChange}
                placeholder="01XXXXXXXXX"
              />
            </label>
            <label className="field">
              <span>পুরাতন পাসওয়ার্ড</span>
              <input
                name="currentPassword"
                type="password"
                value={form.currentPassword}
                onChange={handleChange}
                placeholder="বর্তমান পাসওয়ার্ড"
                autoComplete="current-password"
              />
            </label>
            <label className="field">
              <span>নতুন পাসওয়ার্ড</span>
              <input
                name="newPassword"
                type="password"
                value={form.newPassword}
                onChange={handleChange}
                placeholder="নতুন পাসওয়ার্ড"
                autoComplete="new-password"
              />
            </label>
            <label className="field">
              <span>কনফার্ম পাসওয়ার্ড</span>
              <input
                name="confirmPassword"
                type="password"
                value={form.confirmPassword}
                onChange={handleChange}
                placeholder="নতুন পাসওয়ার্ড পুনরায় লিখুন"
                autoComplete="new-password"
              />
            </label>
          </div>
          <div className="modal-actions">
            <button className="btn primary" type="submit" disabled={isLoading || isFetching}>
              {isLoading ? 'আপডেট হচ্ছে...' : 'আপডেট করুন'}
            </button>
          </div>
        </form>

        {status.message ? (
          <div className={`status-banner ${status.type === 'success' ? 'success' : 'error'}`}>
            {status.message}
          </div>
        ) : null}
      </div>
    </AppLayout>
  )
}

export default UserProfile
