import { useState } from 'react';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Layout } from './components/Layout';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { PendingApprovalPage } from './pages/PendingApprovalPage';
import { DashboardPage } from './pages/DashboardPage';
import { CustomersPage } from './pages/CustomersPage';
import { BookingsPage } from './pages/BookingsPage';
import { ItinerariesPage } from './pages/ItinerariesPage';
import { LeadsPage } from './pages/LeadsPage';
import { PaymentsPage } from './pages/PaymentsPage';
import { CommissionsPage } from './pages/CommissionsPage';
import NotificationsPage from './pages/NotificationsPage';
import AuditLogsPage from './pages/AuditLogsPage';
import AdminSettingsPage from './pages/AdminSettingsPage';
import AgentApprovalsPage from './pages/AgentApprovalsPage';
import { PermissionMatrixPage } from './pages/PermissionMatrixPage';
import { Loader2 } from 'lucide-react';

function AppContent() {
  const { isAuthenticated, isApproved, loading } = useAuth();
  const [currentPage, setCurrentPage] = useState('dashboard');
  const [authPage, setAuthPage] = useState<'login' | 'register'>('login');

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-10 h-10 animate-spin text-sky-500 mx-auto" />
          <p className="text-gray-500 mt-3 text-sm">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return authPage === 'login' ? (
      <LoginPage onSwitchToRegister={() => setAuthPage('register')} />
    ) : (
      <RegisterPage onSwitchToLogin={() => setAuthPage('login')} />
    );
  }

  // Authenticated but NOT approved — show pending approval page
  if (!isApproved) {
    return <PendingApprovalPage />;
  }

  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard': return <DashboardPage />;
      case 'customers': return <CustomersPage />;
      case 'bookings': return <BookingsPage />;
      case 'itineraries': return <ItinerariesPage />;
      case 'leads': return <LeadsPage />;
      case 'payments': return <PaymentsPage />;
      case 'commissions': return <CommissionsPage />;
      case 'notifications': return <NotificationsPage />;
      case 'audit-logs': return <AuditLogsPage />;
      case 'admin-settings': return <AdminSettingsPage />;
      case 'agent-approvals': return <AgentApprovalsPage />;
      case 'permission-matrix': return <PermissionMatrixPage />;
      default: return <DashboardPage />;
    }
  };

  return (
    <Layout currentPage={currentPage} onNavigate={setCurrentPage}>
      {renderPage()}
    </Layout>
  );
}

export function App() {
  return (
    <AuthProvider>
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 3000,
          style: {
            background: '#1e293b',
            color: '#f8fafc',
            borderRadius: '12px',
            fontSize: '14px',
          },
          success: {
            iconTheme: { primary: '#10b981', secondary: '#f8fafc' },
          },
          error: {
            iconTheme: { primary: '#ef4444', secondary: '#f8fafc' },
          },
        }}
      />
      <AppContent />
    </AuthProvider>
  );
}
