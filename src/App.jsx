import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import Areas from './pages/Areas.jsx'
import Billing from './pages/Billing.jsx'
import CollectorBilling from './pages/CollectorBilling.jsx'
import Collectors from './pages/Collectors.jsx'
import Customers from './pages/Customers.jsx'
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
        <Route path="/customer-types" element={<CustomerTypes />} />
        <Route path="/company-settings" element={<CompanySettings />} />
        <Route path="/billing" element={<Billing />} />
        <Route path="/collector-billing" element={<CollectorBilling />} />
        <Route path="/reports" element={<Navigate to="/reports/current-month" replace />} />
        <Route path="/reports/current-month" element={<Reports />} />
        <Route path="/reports/all-months" element={<ReportsAllMonths />} />
        <Route path="/reports/due" element={<ReportsDue />} />
        <Route path="/reports/previous-summary" element={<ReportsPreviousSummary />} />
        <Route path="/reports/payment-message" element={<ReportsPaymentMessage />} />
        <Route path="/reports/message-log" element={<ReportsMessageLog />} />
        <Route path="/deposits" element={<Deposits />} />
        <Route path="/invoice/:billId" element={<InvoicePrint />} />
        <Route path="/expenses" element={<Expenses />} />
        <Route path="/expense-categories" element={<ExpenseCategories />} />
        <Route path="/employees" element={<Employees />} />
        <Route path="/tutorials" element={<Tutorials />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
