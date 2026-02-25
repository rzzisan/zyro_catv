import { useEffect, useState } from 'react'
import AppLayout from '../components/AppLayout.jsx'

const apiBase = import.meta.env.PROD
  ? '/api'
  : import.meta.env.VITE_API_BASE || 'http://localhost:5000'

function AdminBackups() {
  const [backups, setBackups] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [status, setStatus] = useState('')

  const token = localStorage.getItem('auth_token')

  useEffect(() => {
    loadBackups()
  }, [])

  const loadBackups = async () => {
    if (!token) return
    setIsLoading(true)
    setStatus('')
    try {
      const response = await fetch(`${apiBase}/admin/backups`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || 'ব্যাকআপ লোড করা যায়নি')
      }
      setBackups(data.data || [])
    } catch (error) {
      setStatus(error.message)
    } finally {
      setIsLoading(false)
    }
  }

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i]
  }

  return (
    <AppLayout title="ব্যাকআপ" subtitle="ব্যাকআপ ম্যানেজমেন্ট">
      <div className="module-card">
        <div className="module-header">
          <div>
            <div className="module-title">ব্যাকআপ তালিকা</div>
            <div className="module-sub">ডাটাবেস ব্যাকআপ ইতিহাস এবং রিস্টোর</div>
          </div>
          <div className="action-buttons">
            <button className="btn primary">নতুন ব্যাকআপ</button>
          </div>
        </div>

        {status && (
          <div className="status-banner error">{status}</div>
        )}

        <table className="data-table">
          <thead>
            <tr>
              <th>ব্যাকআপ নাম</th>
              <th>ধরন</th>
              <th>আকার</th>
              <th>শুরু সময়</th>
              <th>সমাপ্ত সময়</th>
              <th>অবস্থা</th>
              <th>ক্রিয়া</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan="7" style={{ textAlign: 'center' }}>লোড হচ্ছে...</td>
              </tr>
            ) : backups.length === 0 ? (
              <tr>
                <td colSpan="7" style={{ textAlign: 'center' }}>কোনো ব্যাকআপ পাওয়া যায়নি</td>
              </tr>
            ) : (
              backups.map((backup) => {
                const statusColors = {
                  'SUCCESS': 'success',
                  'FAILED': 'danger',
                  'PENDING': 'warning',
                }
                return (
                  <tr key={backup.id}>
                    <td className="cell-title">{backup.backupName}</td>
                    <td>
                      {backup.backupType === 'FULL' ? 'সম্পূর্ণ' : 'বৃদ্ধিমূলক'}
                    </td>
                    <td>{formatFileSize(backup.backupSize)}</td>
                    <td className="cell-sub">
                      {new Date(backup.startedAt).toLocaleDateString('bn-BD')} <br />
                      {new Date(backup.startedAt).toLocaleTimeString('bn-BD')}
                    </td>
                    <td>
                      {backup.completedAt
                        ? new Date(backup.completedAt).toLocaleTimeString('bn-BD')
                        : '—'}
                    </td>
                    <td>
                      <span className={`status-pill ${statusColors[backup.status] || 'default'}`}>
                        {backup.status === 'SUCCESS' && 'সফল'}
                        {backup.status === 'FAILED' && 'ব্যর্থ'}
                        {backup.status === 'PENDING' && 'পেন্ডিং'}
                      </span>
                    </td>
                    <td>
                      <div className="action-buttons">
                        <button className="btn ghost small">ডাউনলোড</button>
                        <button className="btn outline small">রিস্টোর</button>
                      </div>
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>

        {/* Backup Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.5rem', marginTop: '2rem' }}>
          <div className="bg-white rounded-lg border p-6">
            <p className="text-sm text-gray-600 mb-2">সর্বমোট ব্যাকআপ</p>
            <p className="text-3xl font-bold text-gray-900">{backups.length}</p>
          </div>
          <div className="bg-white rounded-lg border p-6">
            <p className="text-sm text-gray-600 mb-2">সফল ব্যাকআপ</p>
            <p className="text-3xl font-bold text-green-600">
              {backups.filter((b) => b.status === 'SUCCESS').length}
            </p>
          </div>
          <div className="bg-white rounded-lg border p-6">
            <p className="text-sm text-gray-600 mb-2">মোট আকার</p>
            <p className="text-3xl font-bold text-blue-600">
              {formatFileSize(backups.reduce((sum, b) => sum + b.backupSize, 0))}
            </p>
          </div>
        </div>
      </div>
    </AppLayout>
  )
}

export default AdminBackups
