import { lazy, Suspense, type ComponentType, useMemo, useState } from 'react';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Layout } from './components/Layout';
import { Loader2 } from 'lucide-react';
import { Skeleton } from './components/Skeleton';
import { useDelayedLoading } from './hooks/useDelayedLoading';

const LoginPage = lazy(() => import('./pages/LoginPage').then((m) => ({ default: m.LoginPage })));
const RegisterPage = lazy(() => import('./pages/RegisterPage').then((m) => ({ default: m.RegisterPage })));
const PendingApprovalPage = lazy(() => import('./pages/PendingApprovalPage').then((m) => ({ default: m.PendingApprovalPage })));
const DashboardPage = lazy(() => import('./pages/DashboardPage').then((m) => ({ default: m.DashboardPage })));
const CustomersPage = lazy(() => import('./pages/CustomersPage').then((m) => ({ default: m.CustomersPage })));
const BookingsPage = lazy(() => import('./pages/BookingsPage').then((m) => ({ default: m.BookingsPage })));
const ItinerariesPage = lazy(() => import('./pages/ItinerariesPage').then((m) => ({ default: m.ItinerariesPage })));
const LeadsPage = lazy(() => import('./pages/LeadsPage').then((m) => ({ default: m.LeadsPage })));
const PaymentsPage = lazy(() => import('./pages/PaymentsPage').then((m) => ({ default: m.PaymentsPage })));
const CommissionsPage = lazy(() => import('./pages/CommissionsPage').then((m) => ({ default: m.CommissionsPage })));
const NotificationsPage = lazy(() => import('./pages/NotificationsPage'));
const AuditLogsPage = lazy(() => import('./pages/AuditLogsPage'));
const AdminSettingsPage = lazy(() => import('./pages/AdminSettingsPage'));
const AgentApprovalsPage = lazy(() => import('./pages/AgentApprovalsPage'));
const PermissionMatrixPage = lazy(() => import('./pages/PermissionMatrixPage').then((m) => ({ default: m.PermissionMatrixPage })));

const PageLoadingFallback = () => (
  <div className="space-y-4">
    <Skeleton className="h-10 w-60" />
    <Skeleton className="h-32 w-full" />
    <Skeleton className="h-24 w-full" />
    <Skeleton className="h-24 w-full" />
  </div>
);

function DelayedPageFallback() {
  const showSlowFallback = useDelayedLoading(true, 400);
  if (!showSlowFallback) return null;
  return <PageLoadingFallback />;
}

function getPageComponent(currentPage: string): ComponentType {
  switch (currentPage) {
    case 'dashboard': return DashboardPage;
    case 'customers': return CustomersPage;
    case 'bookings': return BookingsPage;
    case 'itineraries': return ItinerariesPage;
    case 'leads': return LeadsPage;
    case 'payments': return PaymentsPage;
    case 'commissions': return CommissionsPage;
    case 'notifications': return NotificationsPage;
    case 'audit-logs': return AuditLogsPage;
    case 'admin-settings': return AdminSettingsPage;
    case 'agent-approvals': return AgentApprovalsPage;
    case 'permission-matrix': return PermissionMatrixPage;
    default: return DashboardPage;
  }
}

function AppContent() {
  const { isAuthenticated, isApproved, loading } = useAuth();
  const [currentPage, setCurrentPage] = useState('dashboard');
  const [authPage, setAuthPage] = useState<'login' | 'register'>('login');
  const CurrentPage = useMemo(() => getPageComponent(currentPage), [currentPage]);

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
    return (
      <Suspense fallback={<DelayedPageFallback />}>
        {authPage === 'login' ? (
          <LoginPage onSwitchToRegister={() => setAuthPage('register')} />
        ) : (
          <RegisterPage onSwitchToLogin={() => setAuthPage('login')} />
        )}
      </Suspense>
    );
  }

  // Authenticated but NOT approved — show pending approval page
  if (!isApproved) {
    return (
      <Suspense fallback={<DelayedPageFallback />}>
        <PendingApprovalPage />
      </Suspense>
    );
  }

  return (
    <Layout currentPage={currentPage} onNavigate={setCurrentPage}>
      <Suspense fallback={<DelayedPageFallback />}>
        <CurrentPage />
      </Suspense>
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
