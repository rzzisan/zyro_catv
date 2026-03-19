import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import Areas from './pages/Areas.jsx'
import Billing from './pages/Billing.jsx'
import CollectorBilling from './pages/CollectorBilling.jsx'
import Collectors from './pages/Collectors.jsx'
import Customers from './pages/Customers.jsx'
import CustomerDetails from './pages/CustomerDetails.jsx'
import CustomerTypes from './pages/CustomerTypes.jsx'
import CompanySettings from './pages/CompanySettings.jsx'
import Dashboard from './pages/Dashboard.jsx'
import Deposits from './pages/Deposits.jsx'
import Employees from './pages/Employees.jsx'
import ExpenseCategories from './pages/ExpenseCategories.jsx'
import Expenses from './pages/Expenses.jsx'
import Home from './pages/Home.jsx'
import InvoicePrint from './pages/InvoicePrint.jsx'
import Managers from './pages/Managers.jsx'
import Reports from './pages/Reports.jsx'
import ReportsAllMonths from './pages/ReportsAllMonths.jsx'
import ReportsDue from './pages/ReportsDue.jsx'
import ReportsMessageLog from './pages/ReportsMessageLog.jsx'
import ReportsPaymentMessage from './pages/ReportsPaymentMessage.jsx'
import ReportsPreviousSummary from './pages/ReportsPreviousSummary.jsx'
import Tutorials from './pages/Tutorials.jsx'
import UserProfile from './pages/UserProfile.jsx'
import AdminDashboard from './pages/AdminDashboard.jsx'
import AdminCompanies from './pages/AdminCompanies.jsx'
import AdminUsers from './pages/AdminUsers.jsx'
import AdminActivityLogs from './pages/AdminActivityLogs.jsx'
import AdminAuditTrail from './pages/AdminAuditTrail.jsx'
import AdminPackages from './pages/AdminPackages.jsx'
import AdminSettings from './pages/AdminSettings.jsx'
import AdminSupportTickets from './pages/AdminSupportTickets.jsx'
import AdminBackups from './pages/AdminBackups.jsx'
import AdminAnalytics from './pages/AdminAnalytics.jsx'
import BillReceipt from './pages/BillReceipt.jsx'
import SupportCategories from './pages/SupportCategories.jsx'
import CustomerSupport from './pages/CustomerSupport.jsx'
import SupportHistory from './pages/SupportHistory.jsx'

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

function RestrictedRoute({ blockedRoles, redirectTo = '/dashboard', children }) {
  const role = getUserRole()
  if (blockedRoles.includes(role)) {
    return <Navigate to={redirectTo} replace />
  }
  return children
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Navigate to="/" replace />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/profile" element={<UserProfile />} />
        <Route path="/areas" element={<Areas />} />
        <Route path="/managers" element={<Managers />} />
        <Route path="/collectors" element={<Collectors />} />
        <Route path="/customers" element={<Customers />} />
        <Route path="/customers/:customerId" element={<CustomerDetails />} />
        <Route path="/customer-types" element={<CustomerTypes />} />
        <Route path="/company-settings" element={<CompanySettings />} />
        <Route path="/billing" element={<Billing />} />
        <Route path="/collector-billing" element={<CollectorBilling />} />
        <Route path="/bill-receipt" element={<BillReceipt />} />
        <Route
          path="/support/categories"
          element={(
            <RestrictedRoute blockedRoles={['COLLECTOR', 'MANAGER', 'SUPER_ADMIN']}>
              <SupportCategories />
            </RestrictedRoute>
          )}
        />
        <Route path="/support/customer" element={<CustomerSupport />} />
        <Route path="/support/history" element={<SupportHistory />} />
        <Route path="/reports" element={<Navigate to="/reports/current-month" replace />} />
        <Route path="/reports/current-month" element={<Reports />} />
        <Route path="/reports/all-months" element={<ReportsAllMonths />} />
        <Route path="/reports/due" element={<ReportsDue />} />
        <Route
          path="/reports/previous-summary"
          element={(
            <RestrictedRoute blockedRoles={['COLLECTOR']}>
              <ReportsPreviousSummary />
            </RestrictedRoute>
          )}
        />
        <Route
          path="/reports/payment-message"
          element={(
            <RestrictedRoute blockedRoles={['COLLECTOR']}>
              <ReportsPaymentMessage />
            </RestrictedRoute>
          )}
        />
        <Route
          path="/reports/message-log"
          element={(
            <RestrictedRoute blockedRoles={['COLLECTOR']}>
              <ReportsMessageLog />
            </RestrictedRoute>
          )}
        />
        <Route path="/deposits" element={<Deposits />} />
        <Route path="/invoice/:billId" element={<InvoicePrint />} />
        <Route
          path="/expenses"
          element={(
            <RestrictedRoute blockedRoles={['COLLECTOR']}>
              <Expenses />
            </RestrictedRoute>
          )}
        />
        <Route
          path="/expense-categories"
          element={(
            <RestrictedRoute blockedRoles={['COLLECTOR']}>
              <ExpenseCategories />
            </RestrictedRoute>
          )}
        />
        <Route
          path="/employees"
          element={(
            <RestrictedRoute blockedRoles={['COLLECTOR']}>
              <Employees />
            </RestrictedRoute>
          )}
        />
        <Route
          path="/tutorials"
          element={(
            <RestrictedRoute blockedRoles={['COLLECTOR']}>
              <Tutorials />
            </RestrictedRoute>
          )}
        />

        {/* Admin Routes */}
        <Route path="/admin" element={<Navigate to="/admin/dashboard" replace />} />
        <Route path="/admin/dashboard" element={<AdminDashboard />} />
        <Route path="/admin/companies" element={<AdminCompanies />} />
        <Route path="/admin/users" element={<AdminUsers />} />
        <Route path="/admin/activity-logs" element={<AdminActivityLogs />} />
        <Route path="/admin/audit-trail" element={<AdminAuditTrail />} />
        <Route path="/admin/packages" element={<AdminPackages />} />
        <Route path="/admin/settings" element={<AdminSettings />} />
        <Route path="/admin/support-tickets" element={<AdminSupportTickets />} />
        <Route path="/admin/backups" element={<AdminBackups />} />
        <Route path="/admin/analytics" element={<AdminAnalytics />} />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
