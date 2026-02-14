import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import NotificationBell from './NotificationBell';
import {
  LayoutDashboard,
  Users,
  CalendarCheck,
  Map,
  UserPlus,
  CreditCard,
  DollarSign,
  LogOut,
  Menu,
  X,
  Plane,
  ChevronDown,
  User,
  ShieldAlert,
  Settings,
  UserCheck
} from 'lucide-react';

interface LayoutProps {
  children: React.ReactNode;
  currentPage: string;
  onNavigate: (page: string) => void;
}

const navItems = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'customers', label: 'Customers', icon: Users },
  { id: 'bookings', label: 'Bookings', icon: CalendarCheck },
  { id: 'itineraries', label: 'Itineraries', icon: Map },
  { id: 'leads', label: 'Leads', icon: UserPlus },
  { id: 'payments', label: 'Payments', icon: CreditCard },
  { id: 'commissions', label: 'Commissions', icon: DollarSign },
];

export function Layout({ children, currentPage, onNavigate }: LayoutProps) {
  const { agent, logout, checkPermission } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  // Define nav items with their required permission
  const extendedNavItems = [
    ...navItems,
    ...(checkPermission('canApproveAgents') ? [{ id: 'agent-approvals', label: 'Agent Approvals', icon: UserCheck }] : []),
    ...(checkPermission('canManageSettings') ? [{ id: 'permission-matrix', label: 'Permissions', icon: ShieldAlert }] : []),
    ...(checkPermission('canViewAuditLogs') ? [{ id: 'audit-logs', label: 'System Logs', icon: ShieldAlert }] : []),
    ...(checkPermission('canManageSettings') ? [{ id: 'admin-settings', label: 'Settings', icon: Settings }] : [])
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 z-50 h-full w-64 bg-gradient-to-b from-slate-900 to-slate-800 text-white transform transition-transform duration-300 ease-in-out ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'
          } lg:translate-x-0`}
      >
        <div className="flex items-center justify-between p-5 border-b border-slate-700">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-gradient-to-br from-sky-400 to-blue-600 rounded-lg flex items-center justify-center">
              <Plane className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight">TravAgent</h1>
              <p className="text-[10px] text-slate-400 uppercase tracking-widest">B2B Platform</p>
            </div>
          </div>
          <button onClick={() => setSidebarOpen(false)} className="lg:hidden text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <nav className="p-3 space-y-1 mt-2">
          {extendedNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentPage === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  onNavigate(item.id);
                  setSidebarOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${isActive
                  ? 'bg-sky-600/20 text-sky-400 shadow-sm'
                  : 'text-slate-300 hover:bg-slate-700/60 hover:text-white'
                  }`}
              >
                <Icon className="w-[18px] h-[18px]" />
                {item.label}
              </button>
            );
          })}
        </nav>

        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-slate-700">
          <div className="flex items-center gap-3 mb-3 px-2">
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-emerald-400 to-teal-600 flex items-center justify-center text-sm font-bold">
              {agent?.firstName?.charAt(0)?.toUpperCase() || 'A'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{agent?.fullName || `${agent?.firstName || ''} ${agent?.lastName || ''}`.trim() || 'Agent'}</p>
              <p className="text-xs text-slate-400 truncate">{agent?.email}</p>
            </div>
          </div>
          <button
            onClick={logout}
            className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="lg:ml-64">
        {/* Top bar */}
        <header className="bg-white border-b border-gray-200 sticky top-0 z-30">
          <div className="flex items-center justify-between px-4 sm:px-6 h-16">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setSidebarOpen(true)}
                className="lg:hidden text-gray-500 hover:text-gray-700"
              >
                <Menu className="w-6 h-6" />
              </button>
              <h2 className="text-lg font-semibold text-gray-800 capitalize">
                {currentPage}
              </h2>
            </div>

            <div className="flex items-center gap-4">
              <NotificationBell onNavigate={onNavigate} />

              <div className="relative">
                <button
                  onClick={() => setProfileOpen(!profileOpen)}
                  className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 transition-colors"
                >
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-sky-400 to-blue-600 flex items-center justify-center">
                    <User className="w-4 h-4 text-white" />
                  </div>
                  <span className="hidden sm:inline font-medium">{agent?.fullName || agent?.firstName || 'Agent'}</span>
                  <ChevronDown className="w-4 h-4" />
                </button>
                {profileOpen && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setProfileOpen(false)} />
                    <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-lg border border-gray-200 py-2 z-20">
                      <div className="px-4 py-2 border-b border-gray-100">
                        <p className="text-sm font-medium text-gray-900">{agent?.fullName || `${agent?.firstName || ''} ${agent?.lastName || ''}`.trim()}</p>
                        <p className="text-xs text-gray-500">{agent?.role}</p>
                      </div>
                      <button
                        onClick={logout}
                        className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                      >
                        <LogOut className="w-4 h-4" />
                        Sign Out
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="p-4 sm:p-6">{children}</main>
      </div>
    </div>
  );
}
