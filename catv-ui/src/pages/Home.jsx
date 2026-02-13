import { Link } from 'react-router-dom'

function Home() {
  return (
    <div className="page home-page">
      <div className="hero-orb orb-one" aria-hidden="true" />
      <div className="hero-orb orb-two" aria-hidden="true" />
      <div className="hero-orb orb-three" aria-hidden="true" />
      <main className="hero-card reveal">
        <div className="hero-badge">CATV UI</div>
        <h1>CATV বিলিং ম্যানেজমেন্ট</h1>
        <p>
          বায়ান্ন পে-এর জন্য একটি ফ্রেশ, ফোকাসড আর গতিশীল অ্যাডমিন
          এক্সপেরিয়েন্স। নিচের লিংকগুলো থেকে মূল স্ক্রিনে যান।
        </p>
        <div className="hero-links">
          <Link className="btn primary" to="/login">
            লগইন পেজ
          </Link>
          <Link className="btn ghost" to="/dashboard">
            ড্যাশবোর্ড
          </Link>
          <Link className="btn outline" to="/area">
            এরিয়া তালিকা
          </Link>
        </div>
        <div className="hero-meta">
          <div>
            <strong>৩টি</strong>
            <span>প্রধান স্ক্রিন</span>
          </div>
          <div>
            <strong>১২+</strong>
            <span>মডিউল প্রস্তুত</span>
          </div>
          <div>
            <strong>৯৯.৯%</strong>
            <span>আপটাইম টার্গেট</span>
          </div>
        </div>
      </main>
    </div>
  )
}

export default Home
