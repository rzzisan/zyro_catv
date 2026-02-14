import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'

const apiBase = import.meta.env.PROD
  ? '/api'
  : import.meta.env.VITE_API_BASE || 'http://localhost:5000'

const formatCurrency = (value) => `৳ ${Number(value || 0).toLocaleString('bn-BD')}`

const formatDateTime = (value) => {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return date.toLocaleString('bn-BD')
}

function InvoicePrint() {
  const { billId } = useParams()
  const [data, setData] = useState(null)
  const [status, setStatus] = useState('')

  const token = localStorage.getItem('auth_token')

  const loadInvoice = async () => {
    if (!token) {
      setStatus('লগইন করা নেই')
      return
    }
    try {
      const response = await fetch(`${apiBase}/invoices/${billId}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      const payload = await response.json()
      if (!response.ok) {
        throw new Error(payload.error || 'ইনভয়েস লোড করা যায়নি')
      }
      setData(payload.data)
      setStatus('')
      setTimeout(() => {
        window.print()
      }, 300)
    } catch (error) {
      setStatus(error.message)
    }
  }

  useEffect(() => {
    loadInvoice()
  }, [billId])

  const header = useMemo(() => {
    const company = data?.company
    return {
      name: company?.name || 'Zyrotech CATV',
      slogan: company?.slogan || '',
      helpline: company?.helplineNumber || '',
      note: company?.invoiceNote || '',
      address: company?.address || '',
    }
  }, [data])

  if (!data) {
    return (
      <div className="print-shell">
        <div className="print-card">{status || 'লোড হচ্ছে...'}</div>
      </div>
    )
  }

  const { customer, bill, lastPayment } = data
  const collectorName = lastPayment?.collectedBy?.name || ''

  return (
    <div className="print-shell">
      <div className="print-actions">
        <button className="btn primary" type="button" onClick={() => window.print()}>
          প্রিন্ট করুন
        </button>
      </div>
      <div className="receipt">
        <h1>{header.name}</h1>
        {header.slogan ? <div className="header-sub">{header.slogan}</div> : null}
        {header.helpline ? <div className="header-sub">হেল্পলাইন: {header.helpline}</div> : null}
        <div className="line"><span className="muted">তারিখ</span><span>{formatDateTime(lastPayment?.paidAt || new Date())}</span></div>
        <div className="line"><span className="muted">গ্রাহক</span><span>{customer?.name}</span></div>
        <div className="line"><span className="muted">আইডি</span><span>{customer?.customerCode}</span></div>
        <div className="line"><span className="muted">এরিয়া</span><span>{customer?.area?.name || '-'}</span></div>
        <div className="divider" />
        <div className="line"><span className="muted">মাসিক বিল</span><span>{formatCurrency(bill?.amount)}</span></div>
        <div className="line"><span className="muted">পরিশোধ</span><span>{formatCurrency(data.paidTotal)}</span></div>
        <div className="line"><span className="muted">বকেয়া</span><span>{formatCurrency(data.totalDue)}</span></div>
        <div className="divider" />
        <div className="line total"><span>স্ট্যাটাস</span><span>{bill?.status}</span></div>
        <div className="line"><span className="muted">মেথড</span><span>{lastPayment?.method || '-'}</span></div>
        {collectorName ? (
          <div className="line"><span className="muted">কালেক্টর</span><span>{collectorName}</span></div>
        ) : null}
        <div className="divider" />
        {header.note ? <div className="footer-note">{header.note}</div> : null}
        {header.address ? <div className="footer-note">{header.address}</div> : null}
      </div>

      <style>{`
        * { box-sizing: border-box; }
        body { margin: 0; }
        .print-shell { padding: 16px; display: grid; justify-content: center; }
        .print-card { font-family: "Hind Siliguri", "Noto Sans Bengali", "SolaimanLipi", "Kalpurush", Arial, sans-serif; }
        .print-actions { display: flex; justify-content: center; margin-bottom: 12px; }
        .receipt { width: 54mm; margin: 0 auto; font-family: "Hind Siliguri", "Noto Sans Bengali", "SolaimanLipi", "Kalpurush", Arial, sans-serif; font-size: 13px; line-height: 1.35; }
        h1 { font-size: 17px; margin: 0; text-align: center; letter-spacing: 0.2px; }
        .header-sub { font-size: 12.5px; text-align: center; margin-top: 4px; }
        .footer-note { font-size: 12.5px; text-align: center; margin-top: 6px; }
        .line { display: flex; justify-content: space-between; font-size: 13px; margin-bottom: 4px; }
        .muted { color: #555; }
        .divider { border-top: 1px dashed #999; margin: 8px 0; }
        .total { font-weight: 700; }
        @media print {
          body { padding: 0; }
          .print-actions { display: none; }
          .receipt { width: 54mm; margin: 0 auto; }
        }
      `}</style>
    </div>
  )
}

export default InvoicePrint
