import React from "react";
import { AlertTriangle } from "lucide-react";
import { useDashboardStats } from "../../hooks/useApi";
import StatsCards from "../../components/Admin/Dashboard/StatsCards/StatsCards";
import DeviceAnalytics from "../../components/Admin/Dashboard/DeviceAnalytics";
import { useAdminAuth } from "../../context/AdminAuthProvider";

const Dashboard: React.FC = () => {
  const { user } = useAdminAuth();
  const { data: dashboardStats, isLoading, error } = useDashboardStats();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  // Graceful offline: show a non-blocking banner instead of a full error page
  const offlineBanner = error ? (
    <div className="bg-yellow-50 border-l-4 border-yellow-400 p-3 sm:p-4 mb-4">
      <div className="flex items-start">
        <AlertTriangle className="w-5 h-5 text-yellow-600 mr-2 flex-shrink-0" />
        <p className="text-yellow-800 text-sm sm:text-base">
          Some services are currently offline. The platform remains operational,
          but certain dashboard data may be unavailable. Please try again later.
        </p>
      </div>
    </div>
  ) : null;

  return (
    <div className="space-y-6">
      {offlineBanner}
      {/* Page Header */}
      <div>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">Dashboard</h1>
            <p className="text-gray-600 mt-1">
              Welcome back, {user?.firstName}! Here's what's happening with your
              system.
            </p>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div>
        <StatsCards dashboardStats={dashboardStats} isIoTOffline={!!error} />
      </div>

      {/* Device Analytics */}
      <div>
        <DeviceAnalytics />
      </div>
    </div>
  );
};

export default Dashboard;
