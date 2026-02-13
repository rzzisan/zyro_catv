function Login() {
  const handleSubmit = (event) => {
    event.preventDefault()
  }

  return (
    <div className="page login-page">
      <div className="login-card reveal">
        <div className="login-mark">৫২</div>
        <div className="login-title">বায়ান্ন পে</div>
        <p className="login-subtitle">আপনার অ্যাকাউন্টে প্রবেশ করুন</p>
        <form className="login-form" onSubmit={handleSubmit}>
          <label htmlFor="mobile">মোবাইল</label>
          <input id="mobile" type="text" placeholder="019XXXXXXXX" />

          <label htmlFor="password">পাসওয়ার্ড</label>
          <input id="password" type="password" placeholder="********" />

          <button className="btn primary" type="submit">
            লগইন করুন
          </button>
          <button className="btn ghost" type="button">
            রেজিস্টার
          </button>
        </form>
        <div className="login-footer">মোবাইল অ্যাপ ডাউনলোড করতে এখানে ক্লিক করুন</div>
      </div>
    </div>
  )
}

export default Login
