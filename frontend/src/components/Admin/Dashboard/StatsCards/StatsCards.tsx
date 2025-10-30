import React from "react";
import StatsCard from "./StatsCard";
import { MdPeople, MdEvent, MdBusiness, MdDevices } from "react-icons/md";
import type { DashboardStats } from "../../../../types/admin";

interface StatsCardsProps {
  dashboardStats?: DashboardStats;
  isIoTOffline?: boolean;
  iotDevicesCount?: number;
}

const StatsCards: React.FC<StatsCardsProps> = ({ dashboardStats, isIoTOffline, iotDevicesCount }) => {
  // Use real data if available, otherwise fallback to mock data
  const stats = [
    {
      title: "Total Users",
      value: dashboardStats?.totalUsers?.toString() || "1,234",
      change: "+12%",
      changeType: "positive" as const,
      icon: MdPeople,
      color: "blue" as const,
      description: "From last month",
    },
    {
      title: "Active Bookings",
      value: dashboardStats?.activeBookings?.toString() || "89",
      change: "+5%",
      changeType: "positive" as const,
      icon: MdEvent,
      color: "green" as const,
      description: "Currently active",
    },
    {
      title: "Total Resources",
      value: dashboardStats?.totalResources?.toString() || "45",
      change: "+2",
      changeType: "positive" as const,
      icon: MdBusiness,
      color: "gray" as const,
      description: "Available resources",
    },
    {
      title: "IoT Devices",
      value:
        typeof iotDevicesCount === "number"
          ? iotDevicesCount.toString()
          : isIoTOffline
          ? "0"
          : "—",
      change: isIoTOffline ? "Offline" : "—",
      changeType: (isIoTOffline ? "negative" : "neutral") as const,
      icon: MdDevices,
      color: "purple" as const,
      description: isIoTOffline ? "Sensors unavailable" : "No IoT data available",
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-6">
      {stats.map((stat) => (
        <div key={stat.title}>
          <StatsCard {...stat} />
        </div>
      ))}
    </div>
  );
};

export default StatsCards;
