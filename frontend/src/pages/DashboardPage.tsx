import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { dashboardAPI, analyticsAPI } from '../services/api';
import type { DashboardStats, Booking } from '../types';
import {
  Users,
  CalendarCheck,
  DollarSign,
  UserPlus,
  TrendingUp,
  Clock,
  CheckCircle2,
  XCircle,
  ArrowUpRight,
  Loader2,
  XCircle as CloseIcon
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { format, startOfMonth, endOfMonth } from 'date-fns';

export function DashboardPage() {
  const { agent } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentBookings, setRecentBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [period, setPeriod] = useState('30d');
  const [dateFrom, setDateFrom] = useState(format(startOfMonth(new Date()), 'yyyy-MM-dd'));
  const [dateTo, setDateTo] = useState(format(endOfMonth(new Date()), 'yyyy-MM-dd'));
  const [customRange, setCustomRange] = useState(false);

  useEffect(() => {
    loadDashboard();
  }, [period, dateFrom, dateTo]);

  const loadDashboard = async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = {};
      if (customRange) {
        params.startDate = dateFrom;
        params.endDate = dateTo;
      } else {
        params.period = period;
      }

      // Parallel fetch for dashboard data
      const [statsRes, overviewRes, recentRes] = await Promise.allSettled([
        dashboardAPI.getStats(),
        analyticsAPI.getOverview(params),
        dashboardAPI.getRecentBookings()
      ]);

      // Handle Stats & Overview
      let dashboardData: DashboardStats = {
        totalCustomers: 0,
        totalBookings: 0,
        totalRevenue: 0,
        totalCommission: 0,
        pendingBookings: 0,
        confirmedBookings: 0,
        totalLeads: 0,
        conversionRate: 0,
        revenueByMonth: [],
        topAgents: [],
        leadFunnel: []
      };

      if (overviewRes.status === 'fulfilled') {
        // Prefer the enhanced analytics overview if available
        dashboardData = { ...dashboardData, ...(overviewRes.value.data.data || overviewRes.value.data) };
      } else if (statsRes.status === 'fulfilled') {
        // Fallback to basic stats
        dashboardData = { ...dashboardData, ...(statsRes.value.data.data || statsRes.value.data) };
      }

      setStats(dashboardData);

      // Handle Recent Bookings
      if (recentRes.status === 'fulfilled') {
        setRecentBookings(recentRes.value.data?.data || recentRes.value.data?.bookings || recentRes.value.data || []);
      }
    } catch (error) {
      console.error('Failed to load dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const statCards = [
    { label: 'Total Customers', value: stats?.totalCustomers || 0, icon: Users, color: 'from-blue-500 to-blue-600', bg: 'bg-blue-50', text: 'text-blue-600' },
    { label: 'Total Bookings', value: stats?.totalBookings || 0, icon: CalendarCheck, color: 'from-emerald-500 to-emerald-600', bg: 'bg-emerald-50', text: 'text-emerald-600' },
    { label: 'Revenue', value: `₹${(stats?.totalRevenue || 0).toLocaleString()}`, icon: DollarSign, color: 'from-purple-500 to-purple-600', bg: 'bg-purple-50', text: 'text-purple-600' },
    { label: 'Commission', value: `₹${(stats?.totalCommission || 0).toLocaleString()}`, icon: TrendingUp, color: 'from-amber-500 to-amber-600', bg: 'bg-amber-50', text: 'text-amber-600' },
    { label: 'Pending', value: stats?.pendingBookings || 0, icon: Clock, color: 'from-orange-500 to-orange-600', bg: 'bg-orange-50', text: 'text-orange-600' },
    { label: 'Confirmed', value: stats?.confirmedBookings || 0, icon: CheckCircle2, color: 'from-green-500 to-green-600', bg: 'bg-green-50', text: 'text-green-600' },
    { label: 'Total Leads', value: stats?.totalLeads || 0, icon: UserPlus, color: 'from-pink-500 to-pink-600', bg: 'bg-pink-50', text: 'text-pink-600' },
    { label: 'Conversion', value: `${(stats?.conversionRate || 0).toFixed(1)}%`, icon: ArrowUpRight, color: 'from-cyan-500 to-cyan-600', bg: 'bg-cyan-50', text: 'text-cyan-600' },
  ];

  const bookingChartData = [
    { name: 'Pending', value: stats?.pendingBookings || 0, color: '#f59e0b' },
    { name: 'Confirmed', value: stats?.confirmedBookings || 0, color: '#10b981' },
    { name: 'Other', value: Math.max(0, (stats?.totalBookings || 0) - (stats?.pendingBookings || 0) - (stats?.confirmedBookings || 0)), color: '#6366f1' },
  ].filter(d => d.value > 0);

  const revenueData = stats?.revenueByMonth || [];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-8 h-8 animate-spin text-sky-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Welcome & Filters */}
      <div className="flex flex-col md:flex-row gap-4 items-start md:items-end justify-between bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-500">Welcome back, {agent?.firstName}!</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {!customRange ? (
            <div className="flex bg-gray-100 p-1 rounded-lg">
              {['7d', '30d', '90d', '1y'].map((p) => (
                <button
                  key={p}
                  onClick={() => setPeriod(p)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${period === p ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                    }`}
                >
                  {p === '1y' ? 'Year' : p.toUpperCase()}
                </button>
              ))}
              <button
                onClick={() => setCustomRange(true)}
                className="px-3 py-1.5 text-xs font-medium text-gray-500 hover:text-gray-700 rounded-md"
              >
                Custom
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2 bg-gray-50 p-2 rounded-lg border border-gray-200">
              <input
                type="date"
                value={dateFrom}
                onChange={e => setDateFrom(e.target.value)}
                className="text-xs border-gray-300 rounded focus:ring-sky-500"
              />
              <span className="text-gray-400">-</span>
              <input
                type="date"
                value={dateTo}
                onChange={e => setDateTo(e.target.value)}
                className="text-xs border-gray-300 rounded focus:ring-sky-500"
              />
              <button
                onClick={() => setCustomRange(false)}
                className="text-xs text-red-500 hover:text-red-700 ml-2"
              >
                <CloseIcon className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {statCards.map((card) => {
          const Icon = card.icon;
          return (
            <div key={card.label} className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-3">
                <div className={`w-10 h-10 ${card.bg} rounded-lg flex items-center justify-center`}>
                  <Icon className={`w-5 h-5 ${card.text}`} />
                </div>
              </div>
              <p className="text-2xl font-bold text-gray-900">{card.value}</p>
              <p className="text-xs text-gray-500 mt-1">{card.label}</p>
            </div>
          );
        })}
      </div>

      {/* Analytics Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Revenue Trend */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <h3 className="text-sm font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-sky-500" /> Revenue Trend
          </h3>
          <ResponsiveContainer width="100%" height={280}>
            {revenueData.length > 0 ? (
              <BarChart data={revenueData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="month" tickFormatter={(m) => ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'][m - 1] || m} tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={(val) => `₹${val / 1000}k`} />
                <Tooltip formatter={(val: number | any) => [`₹${(val || 0).toLocaleString()}`, 'Revenue']} />
                <Bar dataKey="totalRevenue" fill="#0ea5e9" radius={[4, 4, 0, 0]} barSize={30} />
              </BarChart>
            ) : (
              <div className="flex items-center justify-center h-full text-gray-400 text-sm">
                No revenue data for this period
              </div>
            )}
          </ResponsiveContainer>
        </div>

        {/* Booking Status Pie */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <h3 className="text-sm font-semibold text-gray-800 mb-4">Booking Status</h3>
          {bookingChartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={bookingChartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={90}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {bookingChartData.map((entry, index) => (
                    <Cell key={index} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-[220px] text-gray-400 text-sm">
              No booking data yet
            </div>
          )}
          <div className="flex flex-wrap justify-center gap-3 mt-4">
            {bookingChartData.map((d) => (
              <div key={d.name} className="flex items-center gap-1.5 text-xs">
                <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: d.color }} />
                {d.name}: {d.value}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Top Agents & Lead Funnel */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Top Agents */}
        <div className="lg:col-span-1 bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <h3 className="text-sm font-semibold text-gray-800 mb-4">Top Performing Agents</h3>
          <div className="space-y-4">
            {stats?.topAgents && stats.topAgents.length > 0 ? (
              stats.topAgents.map((agentStat, index) => (
                <div key={agentStat._id} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white ${index === 0 ? 'bg-yellow-400' : index === 1 ? 'bg-gray-400' : index === 2 ? 'bg-orange-400' : 'bg-blue-400'}`}>
                      {index + 1}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">{agentStat.agentInfo?.[0]?.firstName || 'Unknown'} {agentStat.agentInfo?.[0]?.lastName || ''}</p>
                      <p className="text-xs text-gray-500">{agentStat.totalBookings} bookings</p>
                    </div>
                  </div>
                  <p className="text-sm font-semibold text-green-600">₹{(agentStat.totalRevenue || 0).toLocaleString()}</p>
                </div>
              ))
            ) : (
              <div className="text-center text-gray-400 text-sm py-8">No agent performance data</div>
            )}
          </div>
        </div>

        {/* Lead Conversion Pipe */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <h3 className="text-sm font-semibold text-gray-800 mb-4">Lead Conversion Funnel</h3>
          {stats?.leadFunnel && stats.leadFunnel.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={stats.leadFunnel} layout="vertical" margin={{ left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" hide />
                <YAxis dataKey="_id" type="category" width={80} tick={{ fontSize: 12 }} />
                <Tooltip cursor={{ fill: 'transparent' }} />
                <Bar dataKey="count" fill="#8b5cf6" radius={[0, 4, 4, 0]} barSize={20} label={{ position: 'right', fill: '#666', fontSize: 12 }} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="text-center text-gray-400 text-sm py-12">No lead data to display funnel</div>
          )}
        </div>
      </div>

      {/* Recent Bookings */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex justify-between items-center">
          <h3 className="text-sm font-semibold text-gray-800">Recent Bookings</h3>
        </div>
        {recentBookings.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase">Reference</th>
                  <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase">Destination</th>
                  <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase">Travel Date</th>
                  <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                  <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {recentBookings.map((booking) => (
                  <tr key={booking._id} className="hover:bg-gray-50">
                    <td className="px-5 py-3 font-medium text-gray-900">{booking.bookingReference || 'N/A'}</td>
                    <td className="px-5 py-3 text-gray-600">{booking.tripDetails?.destination || 'N/A'}</td>
                    <td className="px-5 py-3 text-gray-600">{booking.tripDetails?.startDate ? format(new Date(booking.tripDetails.startDate), 'MMM d, yyyy') : 'N/A'}</td>
                    <td className="px-5 py-3 text-gray-600">₹{(booking.pricing?.totalAmount || 0).toLocaleString()}</td>
                    <td className="px-5 py-3">
                      <StatusBadge status={booking.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-8 text-center text-gray-400">
            <CalendarCheck className="w-10 h-10 mx-auto mb-2 opacity-50" />
            <p>No recent bookings</p>
          </div>
        )}
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    pending: 'bg-amber-100 text-amber-700',
    confirmed: 'bg-emerald-100 text-emerald-700',
    cancelled: 'bg-red-100 text-red-700',
    completed: 'bg-blue-100 text-blue-700',
    refunded: 'bg-purple-100 text-purple-700',
    draft: 'bg-gray-100 text-gray-700',
    in_progress: 'bg-sky-100 text-sky-700',
  };
  const icons: Record<string, React.ReactNode> = {
    pending: <Clock className="w-3 h-3" />,
    confirmed: <CheckCircle2 className="w-3 h-3" />,
    cancelled: <XCircle className="w-3 h-3" />,
    completed: <CheckCircle2 className="w-3 h-3" />,
    refunded: <CheckCircle2 className="w-3 h-3" />,
    draft: <Clock className="w-3 h-3" />,
    in_progress: <Clock className="w-3 h-3" />,
  };

  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${styles[status] || 'bg-gray-100 text-gray-700'}`}>
      {icons[status]}
      {status}
    </span>
  );
}
