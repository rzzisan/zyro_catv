import { useEffect, useMemo, useState } from 'react'
import AppLayout from '../components/AppLayout.jsx'

const apiBase = import.meta.env.PROD
  ? '/api'
  : import.meta.env.VITE_API_BASE || 'http://localhost:5000'

const statusOptions = [
  { value: '', label: 'সব' },
  { value: 'DUE', label: 'বকেয়া' },
  { value: 'PARTIAL', label: 'আংশিক পরিশোধ' },
  { value: 'PAID', label: 'পরিশোধ' },
  { value: 'ADVANCE', label: 'অগ্রিম' },
]

const methodOptions = [
  { value: 'CASH', label: 'ক্যাশ' },
  { value: 'BKASH', label: 'বিকাশ' },
  { value: 'NAGAD', label: 'নগদ' },
  { value: 'BANK', label: 'ব্যাংক' },
]

const statusLabel = (value) => {
  const match = statusOptions.find((option) => option.value === value)
  return match ? match.label : value
}

const formatDateTimeValue = (value) => {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  const pad = (part) => String(part).padStart(2, '0')
  const year = date.getFullYear()
  const month = pad(date.getMonth() + 1)
  const day = pad(date.getDate())
  const hours = pad(date.getHours())
  const minutes = pad(date.getMinutes())
  return `${year}-${month}-${day}T${hours}:${minutes}`
}

const formatCurrency = (value) => `৳ ${Number(value || 0).toLocaleString('bn-BD')}`

const formatMonthAllocations = (items = []) => {
  if (!items.length) return '—'
  return items
    .map((item) => `${item.label || `${item.month}/${item.year}`} (${formatCurrency(item.amount)})`)
    .join(', ')
}

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

function Billing() {
  const [rows, setRows] = useState([])
  const [areas, setAreas] = useState([])
  const [collectors, setCollectors] = useState([])
  const [company, setCompany] = useState({
    name: 'Zyrotech CATV',
    slogan: '',
    helplineNumber: '',
    invoiceNote: '',
    address: '',
  })
  const [filters, setFilters] = useState({
    areaId: '',
    status: '',
    collectorId: '',
    q: '',
  })
  const [page, setPage] = useState(1)
  const [perPage, setPerPage] = useState(50)
  const [meta, setMeta] = useState({ total: 0, page: 1, perPage: 50, totalPages: 1 })
  const [summary, setSummary] = useState({
    totalCustomers: 0,
    totalDue: 0,
    totalPaid: 0,
    totalAdvance: 0,
    monthAmount: 0,
  })
  const [period, setPeriod] = useState({ month: null, year: null })
  const [status, setStatus] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [collecting, setCollecting] = useState(null)
  const [historyFor, setHistoryFor] = useState(null)
  const [historyRows, setHistoryRows] = useState([])
  const [historyLoading, setHistoryLoading] = useState(false)
  const [historyStatus, setHistoryStatus] = useState('')
  const [collectForm, setCollectForm] = useState({
    amount: '',
    paidAt: formatDateTimeValue(new Date()),
    method: 'CASH',
  })

  const token = localStorage.getItem('auth_token')
  const role = getUserRole()

  const filterQuery = useMemo(() => {
    const params = new URLSearchParams()
    if (filters.areaId) params.append('areaId', filters.areaId)
    if (filters.status) params.append('status', filters.status)
    if (filters.collectorId) params.append('collectorId', filters.collectorId)
    if (filters.q) params.append('q', filters.q)
    if (perPage === 'all') {
      params.append('limit', 'all')
    } else {
      params.append('limit', String(perPage))
      params.append('page', String(page))
    }
    const query = params.toString()
    return query ? `?${query}` : ''
  }, [filters, page, perPage])

  const loadFilters = async () => {
    if (!token) return
    try {
      const [areasRes, collectorsRes] = await Promise.all([
        fetch(`${apiBase}/areas`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${apiBase}/users/collectors`, { headers: { Authorization: `Bearer ${token}` } }),
      ])

      const areasData = await areasRes.json()
      const collectorsData = await collectorsRes.json()
      if (areasRes.ok) setAreas(areasData.data || [])
      if (collectorsRes.ok) setCollectors(collectorsData.data || [])
    } catch (error) {
      setStatus('ফিল্টার লোড করা যায়নি')
    }
  }

  const loadCompany = async () => {
    if (!token) return
    try {
      const response = await fetch(`${apiBase}/company`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await response.json()
      if (response.ok && data.data) {
        setCompany({
          name: data.data.name || 'Zyrotech CATV',
          slogan: data.data.slogan || '',
          helplineNumber: data.data.helplineNumber || '',
          invoiceNote: data.data.invoiceNote || '',
          address: data.data.address || '',
        })
      }
    } catch (error) {
      setStatus('কোম্পানি তথ্য লোড করা যায়নি')
    }
  }

  const loadBilling = async () => {
    if (!token) return
    setIsLoading(true)
    setStatus('')
    try {
      const response = await fetch(`${apiBase}/billing${filterQuery}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || 'বিল লোড করা যায়নি')
      }
      setRows(data.data || [])
      setSummary(data.summary || summary)
      setPeriod(data.period || period)
      if (data.meta) {
        setMeta(data.meta)
      }
    } catch (error) {
      setStatus(error.message)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadFilters()
    loadCompany()
  }, [])

  useEffect(() => {
    loadBilling()
  }, [filterQuery])

  useEffect(() => {
    setPage(1)
  }, [filters, perPage])

  const openCollectModal = (row) => {
    const defaultAmount = row.dueCurrent > 0 ? row.dueCurrent : row.amount
    setCollecting(row)
    setCollectForm({
      amount: defaultAmount ? String(defaultAmount) : '',
      paidAt: formatDateTimeValue(new Date()),
      method: 'CASH',
    })
  }

  const handleCollectSubmit = async (event) => {
    event.preventDefault()
    if (!token || !collecting) return
    setIsLoading(true)
    setStatus('')
    try {
      const response = await fetch(`${apiBase}/billing/collect`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          billId: collecting.billId,
          amount: Number(collectForm.amount),
          paidAt: collectForm.paidAt ? new Date(collectForm.paidAt).toISOString() : undefined,
          method: collectForm.method,
        }),
      })
      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || 'কালেকশন ব্যর্থ হয়েছে')
      }
      setCollecting(null)
      await loadBilling()
    } catch (error) {
      setStatus(error.message)
    } finally {
      setIsLoading(false)
    }
  }

  const loadHistory = async (customerId) => {
    if (!token || !customerId) return
    setHistoryLoading(true)
    setHistoryStatus('')
    try {
      const response = await fetch(`${apiBase}/billing/history/${customerId}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || 'হিস্টোরি লোড করা যায়নি')
      }
      setHistoryRows(data.data || [])
    } catch (error) {
      setHistoryStatus(error.message)
    } finally {
      setHistoryLoading(false)
    }
  }

  const openHistoryModal = (row) => {
    setHistoryFor(row)
    loadHistory(row.customerId)
  }

  const closeHistoryModal = () => {
    setHistoryFor(null)
    setHistoryRows([])
    setHistoryStatus('')
  }

  const handleDeletePayment = async (paymentId) => {
    if (!token || role !== 'ADMIN') return
    const confirmed = window.confirm('আপনি কি এই কালেকশন ডিলিট করতে চান?')
    if (!confirmed) return
    setHistoryLoading(true)
    setHistoryStatus('')
    try {
      const response = await fetch(`${apiBase}/billing/payments/${paymentId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || 'ডিলিট ব্যর্থ হয়েছে')
      }
      if (historyFor) {
        await loadHistory(historyFor.customerId)
      }
      await loadBilling()
    } catch (error) {
      setHistoryStatus(error.message)
    } finally {
      setHistoryLoading(false)
    }
  }

  const handlePrint = (row) => {
    window.open(`/invoice/${row.billId}`, '_blank', 'noopener')
  }

  return (
    <AppLayout title="বিল" subtitle="বিলিং ও কালেকশন তালিকা">
      <div className="module-card">
        <div className="module-header">
          <div>
            <div className="module-title">বিল তালিকা</div>
            <div className="module-sub">
              মাস: {period.month || '-'} / {period.year || '-'} | মোট {meta.total} জন
            </div>
          </div>
        </div>
        <div className="metric-row">
          <div className="metric-card">
            <div className="metric-value">{formatCurrency(summary.monthAmount)}</div>
            <div className="metric-label">চলতি মাসের বিল</div>
          </div>
          <div className="metric-card">
            <div className="metric-value">{formatCurrency(summary.totalPaid)}</div>
            <div className="metric-label">মোট পরিশোধ</div>
          </div>
          <div className="metric-card">
            <div className="metric-value">{formatCurrency(summary.totalDue)}</div>
            <div className="metric-label">মোট বকেয়া</div>
          </div>
          <div className="metric-card">
            <div className="metric-value">{formatCurrency(summary.totalAdvance)}</div>
            <div className="metric-label">মোট অগ্রিম</div>
          </div>
        </div>
        <div className="filter-grid">
          <label className="filter-item">
            <span>এরিয়া</span>
            <select
              value={filters.areaId}
              onChange={(event) => setFilters((prev) => ({ ...prev, areaId: event.target.value }))}
            >
              <option value="">সব</option>
              {areas.map((area) => (
                <option key={area.id} value={area.id}>
                  {area.name}
                </option>
              ))}
            </select>
          </label>
          <label className="filter-item">
            <span>স্ট্যাটাস</span>
            <select
              value={filters.status}
              onChange={(event) => setFilters((prev) => ({ ...prev, status: event.target.value }))}
            >
              {statusOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <label className="filter-item">
            <span>কালেক্টর</span>
            <select
              value={filters.collectorId}
              onChange={(event) => setFilters((prev) => ({ ...prev, collectorId: event.target.value }))}
            >
              <option value="">সব</option>
              {collectors.map((collector) => (
                <option key={collector.id} value={collector.id}>
                  {collector.name}
                </option>
              ))}
            </select>
          </label>
          <label className="filter-item search">
            <span>সার্চ</span>
            <input
              type="text"
              placeholder="নাম, মোবাইল, আইডি"
              value={filters.q}
              onChange={(event) => setFilters((prev) => ({ ...prev, q: event.target.value }))}
            />
          </label>
        </div>
        {isLoading ? <div className="module-sub">লোড হচ্ছে...</div> : null}
        <div className="table-top-controls">
          <label className="pagination-select">
            <span>দেখাও</span>
            <select
              value={perPage}
              onChange={(event) => {
                const value = event.target.value
                setPerPage(value === 'all' ? 'all' : Number(value))
              }}
            >
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
              <option value={200}>200</option>
              <option value="all">সকল</option>
            </select>
          </label>
        </div>
        <table className="data-table">
          <thead>
            <tr>
              <th>গ্রাহক</th>
              <th>এরিয়া</th>
              <th>স্ট্যাটাস</th>
              <th>মাসিক</th>
              <th>পরিশোধ</th>
              <th>বকেয়া</th>
              <th>অ্যাকশন</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.billId}>
                <td>
                  <div className="cell-title">{row.name}</div>
                  <div className="cell-sub">{row.customerCode}</div>
                  <div className="cell-sub">{row.mobile || '—'}</div>
                </td>
                <td>{row.area?.name || '—'}</td>
                <td>
                  <span className={`status-pill ${row.status.toLowerCase()}`}>
                    {statusLabel(row.status)}
                  </span>
                </td>
                <td>{formatCurrency(row.amount)}</td>
                <td>{formatCurrency(row.paidTotal)}</td>
                <td>{formatCurrency(row.totalDue)}</td>
                <td>
                  <div className="action-buttons">
                    <button className="btn ghost small" type="button" onClick={() => openCollectModal(row)}>
                      কালেক্ট
                    </button>
                    <button className="btn ghost small" type="button" onClick={() => openHistoryModal(row)}>
                      হিস্টোরি
                    </button>
                    <button className="btn outline small" type="button" onClick={() => handlePrint(row)}>
                      ইনভয়েস
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="pagination-bar">
          <div className="pagination-info">
            পেজ {meta.page} / {meta.totalPages}
          </div>
          <div className="page-buttons">
            <button
              className="btn ghost small"
              type="button"
              disabled={perPage === 'all' || meta.page <= 1}
              onClick={() => setPage((prev) => Math.max(1, prev - 1))}
            >
              আগের
            </button>
            <button
              className="btn ghost small"
              type="button"
              disabled={perPage === 'all' || meta.page >= meta.totalPages}
              onClick={() => setPage((prev) => Math.min(meta.totalPages, prev + 1))}
            >
              পরের
            </button>
          </div>
        </div>
        {status ? <div className="status-banner error">{status}</div> : null}
      </div>

      <div className={`modal-overlay ${collecting ? 'is-open' : ''}`}>
        <div
          className="modal"
          role="dialog"
          aria-modal="true"
          onClick={(event) => event.stopPropagation()}
        >
          <div className="modal-header">
            <h3>বিল কালেকশন</h3>
            <button className="btn outline" type="button" onClick={() => setCollecting(null)}>
              ✕
            </button>
          </div>
          {collecting ? (
            <form className="auth-form" onSubmit={handleCollectSubmit}>
              <div className="form-grid">
                <label className="field">
                  <span>গ্রাহক</span>
                  <input type="text" value={`${collecting.name} (${collecting.customerCode})`} disabled />
                </label>
                <label className="field">
                  <span>বর্তমান বকেয়া</span>
                  <input type="text" value={formatCurrency(collecting.totalDue)} disabled />
                </label>
                <label className="field">
                  <span>পরিশোধের পরিমাণ</span>
                  <input
                    type="number"
                    min="1"
                    value={collectForm.amount}
                    onChange={(event) => setCollectForm((prev) => ({ ...prev, amount: event.target.value }))}
                    placeholder="পরিমাণ"
                  />
                </label>
                <label className="field">
                  <span>তারিখ ও সময়</span>
                  <input
                    type="datetime-local"
                    value={collectForm.paidAt}
                    onChange={(event) => setCollectForm((prev) => ({ ...prev, paidAt: event.target.value }))}
                  />
                </label>
                <label className="field">
                  <span>মেথড</span>
                  <select
                    value={collectForm.method}
                    onChange={(event) => setCollectForm((prev) => ({ ...prev, method: event.target.value }))}
                  >
                    {methodOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <div className="modal-actions">
                <button className="btn ghost" type="button" onClick={() => setCollecting(null)}>
                  বাতিল
                </button>
                <button className="btn primary" type="submit" disabled={isLoading}>
                  {isLoading ? 'সেভ হচ্ছে...' : 'সেভ'}
                </button>
              </div>
            </form>
          ) : null}
        </div>
        <button className="modal-backdrop" type="button" aria-label="Close" onClick={() => setCollecting(null)} />
      </div>

      <div className={`modal-overlay ${historyFor ? 'is-open' : ''}`}>
        <div
          className="modal"
          role="dialog"
          aria-modal="true"
          onClick={(event) => event.stopPropagation()}
        >
          <div className="modal-header">
            <h3>বিল হিস্টোরি</h3>
            <button className="btn outline" type="button" onClick={closeHistoryModal}>
              ✕
            </button>
          </div>
          {historyFor ? (
            <div>
              <div className="module-sub">
                {historyFor.name} ({historyFor.customerCode})
              </div>
              {historyLoading ? <div className="module-sub">লোড হচ্ছে...</div> : null}
              {!historyLoading && !historyRows.length ? (
                <div className="module-sub">কোনো হিস্টোরি পাওয়া যায়নি</div>
              ) : null}
              {historyRows.length ? (
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>তারিখ</th>
                      <th>মাস সমন্বয়</th>
                      <th>কালেক্টর</th>
                      <th>মেথড</th>
                      <th>পরিমাণ</th>
                      <th>অ্যাকশন</th>
                    </tr>
                  </thead>
                  <tbody>
                    {historyRows.map((item) => (
                      <tr key={item.paymentId}>
                        <td>{formatDateTime(item.paidAt)}</td>
                        <td>{formatMonthAllocations(item.months)}</td>
                        <td>{item.collector?.name || '—'}</td>
                        <td>{item.method || '—'}</td>
                        <td>{formatCurrency(item.amount)}</td>
                        <td>
                          {role === 'ADMIN' ? (
                            <button
                              className="btn outline small"
                              type="button"
                              disabled={historyLoading}
                              onClick={() => handleDeletePayment(item.paymentId)}
                            >
                              ডিলিট
                            </button>
                          ) : (
                            <span className="cell-sub">—</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : null}
              {historyStatus ? <div className="status-banner error">{historyStatus}</div> : null}
            </div>
          ) : null}
        </div>
        <button className="modal-backdrop" type="button" aria-label="Close" onClick={closeHistoryModal} />
      </div>
    </AppLayout>
  )
}

export default Billing
