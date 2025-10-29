import React, { useState, useEffect, useCallback } from "react";
import { HubConnection, HubConnectionBuilder } from "@microsoft/signalr";
import {
  Thermometer,
  Wind,
  Activity,
  AlertTriangle,
  Wifi,
  WifiOff,
  X,
  Droplets,
  Zap,
  Users,
  DoorOpen,
  Battery,
  Settings,
} from "lucide-react";
import { DeviceManagement } from "../../components/Admin/IoT";

interface IoTDevice {
  id: string;
  tenantId: string;
  model: string;
  serial: string;
  status: string;
}

interface Measurement {
  tenantSlug: string;
  deviceId: string;
  type: string;
  value: number;
  time: string;
}

interface Alert {
  tenantSlug: string;
  deviceId: string;
  type: string;
  value: number;
  time: string;
  ruleId: string;
  severity: string;
  message: string;
}

interface DeviceData {
  device: IoTDevice;
  latestMeasurements: { [key: string]: Measurement };
  measurementHistory: { [key: string]: Measurement[] };
  isOnline: boolean;
  deviceStatus: string; // "active" or "inactive" from database
}

const IoTDashboard: React.FC = () => {
  const [devices, setDevices] = useState<DeviceData[]>([]);
  const [connection, setConnection] = useState<HubConnection | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [selectedDevice, setSelectedDevice] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"dashboard" | "management">(
    "dashboard"
  );

  // Fetch historical measurements for a device
  const fetchDeviceHistory = async (deviceId: string) => {
    try {
      const response = await fetch(
        `http://localhost:5104/api/devices/${deviceId}/measurements?limit=10`
      );
      if (!response.ok) {
        return {};
      }
      const measurements: Measurement[] = await response.json();

      // Group measurements by type
      const groupedMeasurements: { [key: string]: Measurement[] } = {};
      measurements.forEach((measurement) => {
        if (!groupedMeasurements[measurement.type]) {
          groupedMeasurements[measurement.type] = [];
        }
        groupedMeasurements[measurement.type].push(measurement);
      });

      return groupedMeasurements;
    } catch (err) {
      console.error(`Failed to fetch history for device ${deviceId}:`, err);
      return {};
    }
  };

  // Fetch devices from DeviceRegistry
  const fetchDevices = useCallback(async () => {
    try {
      // First get tenant by slug
      const tenantResponse = await fetch(
        "http://localhost:5101/api/tenants/by-slug/innovia"
      );
      if (!tenantResponse.ok) {
        throw new Error("Failed to fetch tenant");
      }
      const tenant = await tenantResponse.json();

      // Then get devices for the tenant
      const devicesResponse = await fetch(
        `http://localhost:5101/api/tenants/${tenant.id}/devices`
      );
      if (!devicesResponse.ok) {
        throw new Error("Failed to fetch devices");
      }
      const devicesData: IoTDevice[] = await devicesResponse.json();

      // Initialize device data and fetch history for each device
      const deviceDataPromises = devicesData.map(async (device) => {
        const history = await fetchDeviceHistory(device.id);
        return {
          device,
          latestMeasurements: {},
          measurementHistory: history,
          isOnline: false,
          deviceStatus: device.status || "active",
        };
      });

      const deviceData = await Promise.all(deviceDataPromises);
      setDevices(deviceData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, []);

  // Handle device management events
  const handleDeviceAdded = useCallback(() => {
    // Refresh devices list
    fetchDevices();
  }, [fetchDevices]);

  const handleDeviceUpdated = useCallback(() => {
    // Refresh devices list
    fetchDevices();
  }, [fetchDevices]);

  const handleDeviceDeleted = useCallback((deviceId: string) => {
    // Remove device from state
    setDevices((prevDevices) =>
      prevDevices.filter((deviceData) => deviceData.device.id !== deviceId)
    );
  }, []);

  // Setup SignalR connection
  useEffect(() => {
    const setupConnection = async () => {
      try {
        const newConnection = new HubConnectionBuilder()
          .withUrl("http://localhost:5103/hub/telemetry")
          .withAutomaticReconnect()
          .build();

        newConnection.on("measurementReceived", (measurement: Measurement) => {
          console.log("Received measurement:", measurement);
          setDevices((prevDevices) => {
            return prevDevices.map((deviceData) => {
              if (deviceData.device.id === measurement.deviceId) {
                // Update latest measurement
                const updatedLatestMeasurements = {
                  ...deviceData.latestMeasurements,
                  [measurement.type]: measurement,
                };

                // Update measurement history
                const updatedHistory = { ...deviceData.measurementHistory };
                if (!updatedHistory[measurement.type]) {
                  updatedHistory[measurement.type] = [];
                }

                // Check if this measurement already exists (same time, value, and device)
                const existingHistory = updatedHistory[measurement.type];
                const isDuplicate = existingHistory.some(
                  (m) =>
                    m.time === measurement.time &&
                    m.value === measurement.value &&
                    m.deviceId === measurement.deviceId
                );

                // Only add if not duplicate
                if (!isDuplicate) {
                  updatedHistory[measurement.type] = [
                    measurement,
                    ...existingHistory.slice(0, 9),
                  ];
                }

                return {
                  ...deviceData,
                  latestMeasurements: updatedLatestMeasurements,
                  measurementHistory: updatedHistory,
                  isOnline: true,
                };
              }
              return deviceData;
            });
          });
        });

        newConnection.on("alertRaised", (alert: Alert) => {
          setAlerts((prevAlerts) => [alert, ...prevAlerts.slice(0, 9)]); // Keep last 10 alerts
          console.log("Alert received:", alert);
        });

        newConnection.onclose(() => {
          setIsConnected(false);
          // Mark all devices as offline
          setDevices((prevDevices) =>
            prevDevices.map((deviceData) => ({
              ...deviceData,
              isOnline: false,
            }))
          );
        });

        await newConnection.start();
        await newConnection.invoke("JoinTenant", "innovia");

        setConnection(newConnection);
        setIsConnected(true);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Connection failed");
        setIsConnected(false);
      }
    };

    setupConnection();

    return () => {
      if (connection) {
        connection.stop();
      }
    };
  }, []);

  // Fetch devices on component mount
  useEffect(() => {
    fetchDevices();
  }, [fetchDevices]);

  const getMeasurementIcon = (type: string) => {
    switch (type.toLowerCase()) {
      case "temperature":
        return <Thermometer className="w-5 h-5 text-red-500" />;
      case "co2":
        return <Wind className="w-5 h-5 text-blue-500" />;
      case "humidity":
        return <Droplets className="w-5 h-5 text-cyan-500" />;
      case "voc":
        return <Zap className="w-5 h-5 text-purple-500" />;
      case "occupancy":
        return <Users className="w-5 h-5 text-green-500" />;
      case "door":
        return <DoorOpen className="w-5 h-5 text-orange-500" />;
      case "energy":
        return <Battery className="w-5 h-5 text-yellow-500" />;
      case "power":
        return <Zap className="w-5 h-5 text-indigo-500" />;
      default:
        return <Activity className="w-5 h-5 text-gray-500" />;
    }
  };

  const getMeasurementColor = (type: string, value: number) => {
    switch (type.toLowerCase()) {
      case "temperature":
        if (value > 28) return "text-red-600";
        if (value > 25) return "text-orange-500";
        return "text-green-600";
      case "co2":
        if (value > 1200) return "text-red-600";
        if (value > 1000) return "text-orange-500";
        return "text-green-600";
      case "humidity":
        if (value > 70) return "text-red-600";
        if (value > 60) return "text-orange-500";
        return "text-green-600";
      case "voc":
        if (value > 400) return "text-red-600";
        if (value > 200) return "text-orange-500";
        return "text-green-600";
      case "occupancy":
        if (value > 8) return "text-red-600";
        if (value > 5) return "text-orange-500";
        return "text-green-600";
      case "door":
        return value === 1 ? "text-red-600" : "text-green-600";
      case "energy":
        if (value > 4) return "text-red-600";
        if (value > 2) return "text-orange-500";
        return "text-green-600";
      case "power":
        if (value > 800) return "text-red-600";
        if (value > 500) return "text-orange-500";
        return "text-green-600";
      default:
        return "text-gray-600";
    }
  };

  const getDeviceModel = (
    deviceSerial: string,
    _measurements: { [key: string]: Measurement },
    actualModel?: string
  ) => {
    // Map device serial to appropriate model based on device serial
    // This ensures consistent naming regardless of measurement data
    const modelMap: { [key: string]: string } = {
      "dev-101": "Acme Temperature Sensor",
      "dev-102": "Acme CO₂ Monitor",
      "dev-103": "Acme Humidity Sensor",
      "dev-104": "Acme Temperature Pro",
      "dev-105": "Acme VOC Detector",
      "dev-106": "Acme Occupancy Counter",
      "dev-107": "Acme Door Sensor",
      "dev-108": "Acme Energy Meter",
      "dev-109": "Acme Power Monitor",
      "dev-110": "Acme CO₂ Pro",
      "dev-111": "Acme Temperature Sensor",
      "dev-112": "Acme CO₂ Monitor",
    };

    // Return mapped model if available, otherwise use actual model or fallback
    return modelMap[deviceSerial] || actualModel || "Acme IoT Sensor";
  };

  const getStatusColor = (isOnline: boolean, deviceStatus: string) => {
    // Device must be active in database AND receiving data to be truly online
    const isActive = deviceStatus === "active";
    const isTrulyOnline = isOnline && isActive;
    return isTrulyOnline ? "text-green-500" : "text-red-500";
  };

  const getStatusText = (isOnline: boolean, deviceStatus: string) => {
    // Device must be active in database AND receiving data to be truly online
    const isActive = deviceStatus === "active";
    if (!isActive) return "Inactive";
    return isOnline ? "Online" : "Offline";
  };

  const getStatusDotColor = (isOnline: boolean, deviceStatus: string) => {
    // Device must be active in database AND receiving data to be truly online
    const isActive = deviceStatus === "active";
    const isTrulyOnline = isOnline && isActive;
    return isTrulyOnline ? "bg-green-500" : "bg-red-500";
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading IoT devices...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-800 mb-2">
            Loading Error
          </h2>
          <p className="text-gray-600">{error}</p>
          <button
            onClick={fetchDevices}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">
            IoT Dashboard
          </h1>
          <p className="text-sm sm:text-base text-gray-600 mt-1">
            Monitor and manage IoT devices in real-time
          </p>
        </div>

        {/* Connection Status */}
        <div className="flex items-center space-x-2">
          {isConnected ? (
            <div className="flex items-center space-x-2 text-green-600">
              <Wifi className="w-4 h-4 sm:w-5 sm:h-5" />
              <span className="text-sm sm:text-base font-medium">
                Connected
              </span>
            </div>
          ) : (
            <div className="flex items-center space-x-2 text-red-600">
              <WifiOff className="w-4 h-4 sm:w-5 sm:h-5" />
              <span className="text-sm sm:text-base font-medium">
                Disconnected
              </span>
            </div>
          )}
          <span className="text-xs sm:text-sm text-gray-500">
            {devices.length} devices
          </span>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab("dashboard")}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === "dashboard"
                ? "border-blue-500 text-blue-600"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            }`}
          >
            <div className="flex items-center space-x-2">
              <Activity className="w-4 h-4" />
              <span>Dashboard</span>
            </div>
          </button>
          <button
            onClick={() => setActiveTab("management")}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === "management"
                ? "border-blue-500 text-blue-600"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            }`}
          >
            <div className="flex items-center space-x-2">
              <Settings className="w-4 h-4" />
              <span>Device Management</span>
            </div>
          </button>
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === "dashboard" && (
        <>
          {/* Alerts */}
          {alerts.length > 0 && (
            <div className="bg-red-50 border-l-4 border-red-400 p-3 sm:p-4">
              <div className="flex items-start">
                <AlertTriangle className="w-5 h-5 text-red-400 mt-0.5 mr-3 flex-shrink-0" />
                <div className="flex-1">
                  <h3 className="text-sm sm:text-base font-medium text-red-800">
                    Active Alerts ({alerts.length})
                  </h3>
                  <div className="mt-2 space-y-2">
                    {alerts.slice(0, 3).map((alert, index) => {
                      // Find device info for this alert
                      const deviceInfo = devices.find(
                        (d) => d.device.id === alert.deviceId
                      );
                      const deviceName = deviceInfo
                        ? deviceInfo.device.serial
                        : `Device ${alert.deviceId.slice(-4)}`;

                      return (
                        <div
                          key={index}
                          className="text-xs sm:text-sm text-red-700 bg-red-100 p-2 rounded"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex-1 min-w-0">
                              <div className="font-semibold text-red-800 truncate">
                                {alert.message}
                              </div>
                              <div className="text-red-600 mt-1">
                                {deviceName} -{" "}
                                {alert.type.charAt(0).toUpperCase() +
                                  alert.type.slice(1)}
                              </div>
                              <div className="text-xs text-red-500 mt-1">
                                {new Date(alert.time).toLocaleString()}
                              </div>
                            </div>
                            <div className="ml-2 text-right">
                              <div className="font-bold text-red-800">
                                {alert.type === "door"
                                  ? alert.value === 1
                                    ? "Open"
                                    : "Closed"
                                  : alert.type === "occupancy"
                                  ? Math.round(alert.value).toString()
                                  : alert.value.toFixed(1)}
                              </div>
                              <div className="text-xs text-red-500">
                                {alert.type === "temperature"
                                  ? "°C"
                                  : alert.type === "co2"
                                  ? "ppm"
                                  : alert.type === "humidity"
                                  ? "%"
                                  : alert.type === "voc"
                                  ? "ppb"
                                  : alert.type === "occupancy"
                                  ? "people"
                                  : alert.type === "door"
                                  ? ""
                                  : alert.type === "energy"
                                  ? "kWh"
                                  : alert.type === "power"
                                  ? "W"
                                  : ""}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                    {alerts.length > 3 && (
                      <div className="text-xs sm:text-sm text-red-600">
                        +{alerts.length - 3} more alerts
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Devices Grid - Each device gets its own card */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
            {devices.map((deviceData) => (
              <div
                key={deviceData.device.id}
                className="bg-white rounded-lg shadow-sm border border-gray-200 p-3 sm:p-4 hover:shadow-md transition-shadow"
              >
                {/* Device Header */}
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm sm:text-base font-semibold text-gray-900 truncate">
                      {deviceData.device.serial}
                    </h3>
                    <p className="text-xs sm:text-sm text-gray-600 truncate">
                      {getDeviceModel(
                        deviceData.device.serial,
                        deviceData.latestMeasurements,
                        deviceData.device.model
                      )}
                    </p>
                  </div>
                  <div
                    className={`flex items-center space-x-1 ml-2 ${getStatusColor(
                      deviceData.isOnline,
                      deviceData.deviceStatus
                    )}`}
                  >
                    <div
                      className={`w-2 h-2 rounded-full ${getStatusDotColor(
                        deviceData.isOnline,
                        deviceData.deviceStatus
                      )}`}
                    ></div>
                    <span className="text-xs font-medium">
                      {getStatusText(
                        deviceData.isOnline,
                        deviceData.deviceStatus
                      )}
                    </span>
                  </div>
                </div>

                {/* Device Measurements */}
                <div className="space-y-2 mb-3">
                  {Object.entries(deviceData.latestMeasurements).map(
                    ([type, measurement]) => (
                      <div
                        key={type}
                        className="flex items-center justify-between p-2 bg-gray-50 rounded-lg"
                      >
                        <div className="flex items-center space-x-2">
                          {getMeasurementIcon(type)}
                          <span className="text-xs sm:text-sm text-gray-600 capitalize">
                            {type === "co2" ? "CO₂" : type}
                          </span>
                        </div>
                        <div className="text-right">
                          <span
                            className={`text-sm sm:text-base font-bold ${getMeasurementColor(
                              type,
                              measurement.value
                            )}`}
                          >
                            {type === "door"
                              ? measurement.value === 1
                                ? "Open"
                                : "Closed"
                              : type === "occupancy"
                              ? Math.round(measurement.value).toString()
                              : measurement.value.toFixed(1)}
                          </span>
                          <span className="text-xs text-gray-500 ml-1">
                            {type === "temperature"
                              ? "°C"
                              : type === "co2"
                              ? "ppm"
                              : type === "humidity"
                              ? "%"
                              : type === "voc"
                              ? "ppb"
                              : type === "occupancy"
                              ? "people"
                              : type === "door"
                              ? ""
                              : type === "energy"
                              ? "kWh"
                              : type === "power"
                              ? "W"
                              : ""}
                          </span>
                        </div>
                      </div>
                    )
                  )}
                </div>

                {/* History Button */}
                <div className="mt-3 pt-3 border-t border-gray-100">
                  <button
                    onClick={() => {
                      setSelectedDevice(deviceData.device.id);
                    }}
                    className="w-full text-xs sm:text-sm text-blue-600 hover:text-blue-800 font-medium py-1 px-2 rounded border border-blue-200 hover:border-blue-300 transition-colors"
                  >
                    View Device History
                  </button>
                </div>

                {/* Last Update */}
                <div className="mt-4 pt-4 border-t border-gray-100">
                  <p className="text-xs text-gray-500 text-center">
                    Last updated: {new Date().toLocaleTimeString()}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {devices.length === 0 && (
            <div className="text-center py-12">
              <Activity className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                No Devices Found
              </h3>
              <p className="text-gray-600">
                No IoT devices are currently registered or active
              </p>
            </div>
          )}

          {/* History Modal */}
          {selectedDevice && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[80vh] overflow-hidden">
                <div className="flex items-center justify-between p-4 sm:p-6 border-b border-gray-200">
                  <h3 className="text-base sm:text-lg font-semibold text-gray-900">
                    Device History
                  </h3>
                  <button
                    onClick={() => {
                      setSelectedDevice(null);
                    }}
                    className="text-gray-400 hover:text-gray-600 p-1"
                  >
                    <X className="w-5 h-5 sm:w-6 sm:h-6" />
                  </button>
                </div>

                <div className="p-4 sm:p-6 overflow-y-auto max-h-[60vh]">
                  {(() => {
                    const device = devices.find(
                      (d) => d.device.id === selectedDevice
                    );
                    if (!device) {
                      return (
                        <div className="text-center py-8">
                          <Activity className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                          <p className="text-gray-500">
                            No device data available
                          </p>
                        </div>
                      );
                    }

                    return (
                      <div>
                        <div className="mb-6">
                          <h4 className="text-lg font-medium text-gray-900 mb-2">
                            {device.device.serial} -{" "}
                            {getDeviceModel(
                              device.device.serial,
                              device.latestMeasurements,
                              device.device.model
                            )}
                          </h4>
                          <div className="flex items-center space-x-2">
                            <div
                              className={`w-2 h-2 rounded-full ${getStatusDotColor(
                                device.isOnline,
                                device.deviceStatus
                              )}`}
                            ></div>
                            <span className="text-sm text-gray-600">
                              {getStatusText(
                                device.isOnline,
                                device.deviceStatus
                              )}
                            </span>
                          </div>
                        </div>

                        {/* Show history for each measurement type */}
                        {Object.entries(device.measurementHistory).map(
                          ([type, history]) => (
                            <div key={type} className="mb-6">
                              <div className="flex items-center space-x-2 mb-3">
                                {getMeasurementIcon(type)}
                                <h5 className="text-sm font-medium text-gray-700 capitalize">
                                  {type === "co2" ? "CO₂" : type} History
                                </h5>
                              </div>

                              <div className="space-y-2">
                                {history
                                  .slice(0, 5)
                                  .map(
                                    (
                                      measurement: Measurement,
                                      index: number
                                    ) => (
                                      <div
                                        key={index}
                                        className="flex items-center justify-between p-2 sm:p-3 bg-gray-50 rounded-lg"
                                      >
                                        <div className="flex items-center space-x-2 sm:space-x-3">
                                          <div className="text-xs sm:text-sm font-medium text-gray-600">
                                            #{history.length - index}
                                          </div>
                                          <div className="text-xs sm:text-sm text-gray-500">
                                            {new Date(
                                              measurement.time
                                            ).toLocaleString()}
                                          </div>
                                        </div>
                                        <div className="text-right">
                                          <span
                                            className={`text-sm sm:text-base font-bold ${getMeasurementColor(
                                              type,
                                              measurement.value
                                            )}`}
                                          >
                                            {type === "door"
                                              ? measurement.value === 1
                                                ? "Open"
                                                : "Closed"
                                              : type === "occupancy"
                                              ? Math.round(
                                                  measurement.value
                                                ).toString()
                                              : measurement.value.toFixed(1)}
                                          </span>
                                          <span className="text-xs text-gray-500 ml-1">
                                            {type === "temperature"
                                              ? "°C"
                                              : type === "co2"
                                              ? "ppm"
                                              : type === "humidity"
                                              ? "%"
                                              : type === "voc"
                                              ? "ppb"
                                              : type === "occupancy"
                                              ? "people"
                                              : type === "door"
                                              ? ""
                                              : type === "energy"
                                              ? "kWh"
                                              : type === "power"
                                              ? "W"
                                              : ""}
                                          </span>
                                        </div>
                                      </div>
                                    )
                                  )}
                                {history.length > 5 && (
                                  <div className="text-xs text-gray-500 text-center py-2">
                                    +{history.length - 5} more measurements
                                  </div>
                                )}
                              </div>
                            </div>
                          )
                        )}
                      </div>
                    );
                  })()}
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {activeTab === "management" && (
        <DeviceManagement
          onDeviceAdded={handleDeviceAdded}
          onDeviceUpdated={handleDeviceUpdated}
          onDeviceDeleted={handleDeviceDeleted}
        />
      )}
    </div>
  );
};

export default IoTDashboard;
