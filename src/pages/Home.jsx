import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

const apiBase = import.meta.env.PROD
  ? ''
  : import.meta.env.VITE_API_BASE || 'http://localhost:5000'

function Home() {
  const navigate = useNavigate()
  const [showRegister, setShowRegister] = useState(false)
  const [loginForm, setLoginForm] = useState({ mobile: '', password: '' })
  const [registerForm, setRegisterForm] = useState({
    name: '',
    companyName: '',
    mobile: '',
    email: '',
    packageId: '',
    password: '',
  })
  const [status, setStatus] = useState({ type: '', message: '' })
  const [isLoading, setIsLoading] = useState(false)

  const handleLoginChange = (event) => {
    const { name, value } = event.target
    setLoginForm((prev) => ({ ...prev, [name]: value }))
  }

  const handleRegisterChange = (event) => {
    const { name, value } = event.target
    setRegisterForm((prev) => ({ ...prev, [name]: value }))
  }

  const submitLogin = async (event) => {
    event.preventDefault()
    setIsLoading(true)
    setStatus({ type: '', message: '' })

    try {
      const response = await fetch(`${apiBase}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(loginForm),
      })

      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || 'লগইন ব্যর্থ হয়েছে')
      }

      localStorage.setItem('auth_token', data.token)
      setStatus({ type: 'success', message: 'লগইন সফল হয়েছে।' })
      navigate('/dashboard')
    } catch (error) {
      setStatus({ type: 'error', message: error.message })
    } finally {
      setIsLoading(false)
    }
  }

  const submitRegister = async (event) => {
    event.preventDefault()
    setIsLoading(true)
    setStatus({ type: '', message: '' })

    try {
      const payload = {
        ...registerForm,
        email: registerForm.email || undefined,
        packageId: registerForm.packageId || null,
      }

      const response = await fetch(`${apiBase}/auth/register-company`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || 'রেজিস্ট্রেশন ব্যর্থ হয়েছে')
      }

      localStorage.setItem('auth_token', data.token)
      setStatus({ type: 'success', message: 'রেজিস্ট্রেশন সফল হয়েছে।' })
      navigate('/dashboard')
    } catch (error) {
      setStatus({ type: 'error', message: error.message })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="page auth-page">
      <div className="hero-orb orb-one" aria-hidden="true" />
      <div className="hero-orb orb-two" aria-hidden="true" />
      <div className="hero-orb orb-three" aria-hidden="true" />

      <main className="auth-card reveal">
        <div className="auth-brand">Zyrotech CATV billing Managment</div>
        <h1>লগইন</h1>
        <p className="auth-sub">
          আপনার মোবাইল নম্বর এবং পাসওয়ার্ড দিয়ে লগইন করুন।
        </p>

        <form className="auth-form" onSubmit={submitLogin}>
          <label className="field">
            <span>মোবাইল নম্বর</span>
            <input
              name="mobile"
              type="text"
              placeholder="01XXXXXXXXX"
              value={loginForm.mobile}
              onChange={handleLoginChange}
              autoComplete="tel"
            />
          </label>
          <label className="field">
            <span>পাসওয়ার্ড</span>
            <input
              name="password"
              type="password"
              placeholder="********"
              value={loginForm.password}
              onChange={handleLoginChange}
              autoComplete="current-password"
            />
          </label>
          <button className="btn primary" type="submit" disabled={isLoading}>
            {isLoading ? 'লোড হচ্ছে...' : 'লগইন করুন'}
          </button>
        </form>

        <button
          className="auth-link"
          type="button"
          onClick={() => setShowRegister((prev) => !prev)}
        >
          {showRegister ? 'রেজিস্ট্রেশন লুকান' : 'রেজিস্ট্রেশন করতে এখানে ক্লিক করুন'}
        </button>

        {showRegister ? (
          <form className="auth-form" onSubmit={submitRegister}>
            <div className="form-grid">
              <label className="field">
                <span>নাম</span>
                <input
                  name="name"
                  type="text"
                  placeholder="আপনার নাম"
                  value={registerForm.name}
                  onChange={handleRegisterChange}
                  autoComplete="name"
                />
              </label>
              <label className="field">
                <span>কোম্পানি নাম</span>
                <input
                  name="companyName"
                  type="text"
                  placeholder="কোম্পানির নাম"
                  value={registerForm.companyName}
                  onChange={handleRegisterChange}
                />
              </label>
              <label className="field">
                <span>মোবাইল নম্বর</span>
                <input
                  name="mobile"
                  type="text"
                  placeholder="01XXXXXXXXX"
                  value={registerForm.mobile}
                  onChange={handleRegisterChange}
                  autoComplete="tel"
                />
              </label>
              <label className="field">
                <span>ইমেইল</span>
                <input
                  name="email"
                  type="email"
                  placeholder="name@email.com"
                  value={registerForm.email}
                  onChange={handleRegisterChange}
                  autoComplete="email"
                />
              </label>
              <label className="field">
                <span>প্যাকেজ</span>
                <select
                  name="packageId"
                  value={registerForm.packageId}
                  onChange={handleRegisterChange}
                >
                  <option value="">Starter - 1200 টাকা</option>
                  <option value="standard">Standard - 2500 টাকা</option>
                  <option value="enterprise">Enterprise - 4500 টাকা</option>
                </select>
              </label>
              <label className="field">
                <span>পাসওয়ার্ড</span>
                <input
                  name="password"
                  type="password"
                  placeholder="কমপক্ষে ৬ অক্ষর"
                  value={registerForm.password}
                  onChange={handleRegisterChange}
                  autoComplete="new-password"
                />
              </label>
            </div>
            <button className="btn primary" type="submit" disabled={isLoading}>
              {isLoading ? 'লোড হচ্ছে...' : 'রেজিস্টার করুন'}
            </button>
          </form>
        ) : null}

        {status.message ? (
          <div className={`auth-status ${status.type}`}>{status.message}</div>
        ) : null}
      </main>
    </div>
  )
}

export default Home
