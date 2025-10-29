import React, { useState, useEffect, useCallback } from "react";
import {
  Thermometer,
  Wind,
  Droplets,
  Zap,
  Users,
  DoorOpen,
  Battery,
  Activity,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
} from "lucide-react";

interface DeviceMeasurement {
  deviceId: string;
  type: string;
  value: number;
  time: string;
}

interface Device {
  id: string;
  tenantId: string;
  model: string;
  serial: string;
  status: string;
}

interface DeviceAnalytics {
  totalDevices: number;
  onlineDevices: number;
  offlineDevices: number;
  activeAlerts: number;
  averageTemperature: number;
  averageCO2: number;
  averageHumidity: number;
  deviceTypes: {
    temperature: number;
    co2: number;
    humidity: number;
    voc: number;
    occupancy: number;
    door: number;
    energy: number;
    power: number;
  };
}

const DeviceAnalytics: React.FC = () => {
  const [analytics, setAnalytics] = useState<DeviceAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchDeviceAnalytics = useCallback(async () => {
    try {
      setLoading(true);

      // Get tenant info
      const tenantResponse = await fetch(
        "http://localhost:5101/api/tenants/by-slug/innovia"
      );
      if (!tenantResponse.ok) {
        throw new Error("Failed to fetch tenant");
      }
      const tenant = await tenantResponse.json();

      // Get devices
      const devicesResponse = await fetch(
        `http://localhost:5101/api/tenants/${tenant.id}/devices`
      );
      if (!devicesResponse.ok) {
        throw new Error("Failed to fetch devices");
      }
      const devices: Device[] = await devicesResponse.json();

      // Get recent measurements for analytics
      const measurementsPromises = devices.map(async (device: Device) => {
        try {
          const response = await fetch(
            `http://localhost:5104/api/devices/${device.id}/measurements?limit=50`
          );
          if (response.ok) {
            return await response.json();
          }
          return [];
        } catch {
          return [];
        }
      });

      const allMeasurements = await Promise.all(measurementsPromises);
      const flatMeasurements = allMeasurements.flat();

      // Get active alerts from Rules.Engine
      let activeAlerts = 0;
      try {
        const alertsResponse = await fetch("http://localhost:5105/alerts");
        if (alertsResponse.ok) {
          const alerts = await alertsResponse.json();
          activeAlerts = alerts.length;
        }
      } catch {
        // If alerts service is not available, use 0
      }

      // Calculate real analytics based on actual data
      const analyticsData: DeviceAnalytics = {
        totalDevices: devices.length,
        onlineDevices: calculateOnlineDevices(flatMeasurements),
        offlineDevices:
          devices.length - calculateOnlineDevices(flatMeasurements),
        activeAlerts: activeAlerts,
        averageTemperature: calculateAverage(flatMeasurements, "temperature"),
        averageCO2: calculateAverage(flatMeasurements, "co2"),
        averageHumidity: calculateAverage(flatMeasurements, "humidity"),
        deviceTypes: calculateRealDeviceTypes(flatMeasurements),
      };

      setAnalytics(analyticsData);
      setLastUpdated(new Date());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDeviceAnalytics();

    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchDeviceAnalytics, 30000);

    return () => clearInterval(interval);
  }, [fetchDeviceAnalytics]);

  const calculateAverage = (
    measurements: DeviceMeasurement[],
    type: string
  ): number => {
    const filtered = measurements.filter((m) => m.type === type);
    if (filtered.length === 0) return 0;
    const sum = filtered.reduce((acc, m) => acc + m.value, 0);
    return Math.round((sum / filtered.length) * 10) / 10;
  };

  const calculateOnlineDevices = (
    measurements: DeviceMeasurement[]
  ): number => {
    // A device is considered online if it has measurements in the last 30 seconds
    const thirtySecondsAgo = new Date(Date.now() - 30 * 1000).toISOString();

    const onlineDeviceIds = new Set(
      measurements
        .filter((m) => new Date(m.time) > new Date(thirtySecondsAgo))
        .map((m) => m.deviceId)
    );

    return onlineDeviceIds.size;
  };

  const calculateRealDeviceTypes = (measurements: DeviceMeasurement[]) => {
    // Count actual device types based on measurements
    const typeCounts: { [key: string]: number } = {
      temperature: 0,
      co2: 0,
      humidity: 0,
      voc: 0,
      occupancy: 0,
      door: 0,
      energy: 0,
      power: 0,
    };

    // Get unique device types from measurements
    const uniqueTypes = new Set(measurements.map((m) => m.type));

    uniqueTypes.forEach((type) => {
      if (Object.prototype.hasOwnProperty.call(typeCounts, type)) {
        // Count devices that have this type of measurement
        const devicesWithThisType = new Set(
          measurements.filter((m) => m.type === type).map((m) => m.deviceId)
        );
        typeCounts[type] = devicesWithThisType.size;
      }
    });

    return typeCounts as {
      temperature: number;
      co2: number;
      humidity: number;
      voc: number;
      occupancy: number;
      door: number;
      energy: number;
      power: number;
    };
  };

  const getDeviceTypeIcon = (type: string) => {
    switch (type.toLowerCase()) {
      case "temperature":
        return <Thermometer className="w-4 h-4 text-red-500" />;
      case "co2":
        return <Wind className="w-4 h-4 text-blue-500" />;
      case "humidity":
        return <Droplets className="w-4 h-4 text-cyan-500" />;
      case "voc":
        return <Zap className="w-4 h-4 text-purple-500" />;
      case "occupancy":
        return <Users className="w-4 h-4 text-green-500" />;
      case "door":
        return <DoorOpen className="w-4 h-4 text-orange-500" />;
      case "energy":
        return <Battery className="w-4 h-4 text-yellow-500" />;
      case "power":
        return <Zap className="w-4 h-4 text-indigo-500" />;
      default:
        return <Activity className="w-4 h-4 text-gray-500" />;
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-20 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="text-center">
          <AlertTriangle className="w-8 h-8 text-red-500 mx-auto mb-2" />
          <p className="text-red-600">{error}</p>
        </div>
      </div>
    );
  }

  if (!analytics) return null;

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">
            Device Analytics
          </h2>
          {lastUpdated && (
            <p className="text-xs text-gray-500 mt-1">
              Last updated: {lastUpdated.toLocaleTimeString()}
            </p>
          )}
        </div>
        <button
          onClick={fetchDeviceAnalytics}
          className="text-sm text-blue-600 hover:text-blue-800 font-medium"
        >
          Refresh
        </button>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-blue-50 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-blue-600">Total Devices</p>
              <p className="text-2xl font-bold text-blue-900">
                {analytics.totalDevices}
              </p>
            </div>
            <Activity className="w-8 h-8 text-blue-500" />
          </div>
        </div>

        <div className="bg-green-50 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-green-600">Online</p>
              <p className="text-2xl font-bold text-green-900">
                {analytics.onlineDevices}
              </p>
            </div>
            <TrendingUp className="w-8 h-8 text-green-500" />
          </div>
        </div>

        <div className="bg-red-50 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-red-600">Offline</p>
              <p className="text-2xl font-bold text-red-900">
                {analytics.offlineDevices}
              </p>
            </div>
            <TrendingDown className="w-8 h-8 text-red-500" />
          </div>
        </div>

        <div className="bg-orange-50 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-orange-600">
                Active Alerts
              </p>
              <p className="text-2xl font-bold text-orange-900">
                {analytics.activeAlerts}
              </p>
            </div>
            <AlertTriangle className="w-8 h-8 text-orange-500" />
          </div>
        </div>
      </div>

      {/* Average Values */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="flex items-center space-x-2 mb-2">
            <Thermometer className="w-5 h-5 text-red-500" />
            <span className="text-sm font-medium text-gray-700">
              Avg Temperature
            </span>
          </div>
          <p className="text-xl font-bold text-gray-900">
            {analytics.averageTemperature}°C
          </p>
        </div>

        <div className="bg-gray-50 rounded-lg p-4">
          <div className="flex items-center space-x-2 mb-2">
            <Wind className="w-5 h-5 text-blue-500" />
            <span className="text-sm font-medium text-gray-700">Avg CO₂</span>
          </div>
          <p className="text-xl font-bold text-gray-900">
            {analytics.averageCO2} ppm
          </p>
        </div>

        <div className="bg-gray-50 rounded-lg p-4">
          <div className="flex items-center space-x-2 mb-2">
            <Droplets className="w-5 h-5 text-cyan-500" />
            <span className="text-sm font-medium text-gray-700">
              Avg Humidity
            </span>
          </div>
          <p className="text-xl font-bold text-gray-900">
            {analytics.averageHumidity}%
          </p>
        </div>
      </div>

      {/* Device Types Distribution */}
      <div>
        <h3 className="text-md font-semibold text-gray-900 mb-4">
          Device Types Distribution
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {Object.entries(analytics.deviceTypes)
            .filter(([, count]) => count > 0) // Only show types that have devices
            .map(([deviceType, count]) => (
              <div key={deviceType} className="bg-gray-50 rounded-lg p-3">
                <div className="flex items-center space-x-2 mb-1">
                  {getDeviceTypeIcon(deviceType)}
                  <span className="text-sm font-medium text-gray-700 capitalize">
                    {deviceType === "co2" ? "CO₂" : deviceType}
                  </span>
                </div>
                <p className="text-lg font-bold text-gray-900">{count}</p>
                <p className="text-xs text-gray-500">devices</p>
              </div>
            ))}
        </div>
        {Object.values(analytics.deviceTypes).every((count) => count === 0) && (
          <div className="text-center py-8">
            <Activity className="w-12 h-12 text-gray-300 mx-auto mb-2" />
            <p className="text-gray-500">No device measurements available</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default DeviceAnalytics;
