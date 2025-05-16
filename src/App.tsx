import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ToastProvider } from './contexts/ToastContext';
import { AuthProvider } from './contexts/AuthContext';
import { SocketProvider } from './contexts/SocketContext';
import HomePage from './pages/HomePage';
import AdminLogin from './pages/admin/AdminLogin';
import AdminDashboard from './pages/admin/AdminDashboard';
import UserManagement from './pages/admin/UserManagement';
import MatchMonitoring from './pages/admin/MatchMonitoring';
import TransactionHistory from './pages/admin/TransactionHistory';
import ReportViewer from './pages/admin/ReportViewer';
import AdminRoute from './components/admin/AdminRoute';

function App() {
  return (
    <ToastProvider>
      <AuthProvider>
        <SocketProvider>
          <Router>
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/admin" element={<AdminLogin />} />
              <Route path="/admin/dashboard" element={<AdminRoute><AdminDashboard /></AdminRoute>} />
              <Route path="/admin/users" element={<AdminRoute><UserManagement /></AdminRoute>} />
              <Route path="/admin/matches" element={<AdminRoute><MatchMonitoring /></AdminRoute>} />
              <Route path="/admin/transactions" element={<AdminRoute><TransactionHistory /></AdminRoute>} />
              <Route path="/admin/reports" element={<AdminRoute><ReportViewer /></AdminRoute>} />
            </Routes>
          </Router>
        </SocketProvider>
      </AuthProvider>
    </ToastProvider>
  );
}

export default App;