import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import Areas from './pages/Areas.jsx'
import Billing from './pages/Billing.jsx'
import Collectors from './pages/Collectors.jsx'
import Customers from './pages/Customers.jsx'
import CustomerTypes from './pages/CustomerTypes.jsx'
import Dashboard from './pages/Dashboard.jsx'
import Deposits from './pages/Deposits.jsx'
import Employees from './pages/Employees.jsx'
import ExpenseCategories from './pages/ExpenseCategories.jsx'
import Expenses from './pages/Expenses.jsx'
import Home from './pages/Home.jsx'
import Managers from './pages/Managers.jsx'
import Reports from './pages/Reports.jsx'
import Tutorials from './pages/Tutorials.jsx'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Navigate to="/" replace />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/areas" element={<Areas />} />
        <Route path="/managers" element={<Managers />} />
        <Route path="/collectors" element={<Collectors />} />
        <Route path="/customers" element={<Customers />} />
        <Route path="/customer-types" element={<CustomerTypes />} />
        <Route path="/billing" element={<Billing />} />
        <Route path="/reports" element={<Reports />} />
        <Route path="/deposits" element={<Deposits />} />
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
