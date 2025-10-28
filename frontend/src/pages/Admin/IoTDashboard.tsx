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
} from "lucide-react";

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
}

const IoTDashboard: React.FC = () => {
  const [devices, setDevices] = useState<DeviceData[]>([]);
  const [connection, setConnection] = useState<HubConnection | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [selectedDevice, setSelectedDevice] = useState<string | null>(null);
  const [selectedMeasurementType, setSelectedMeasurementType] = useState<string | null>(null);

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
                const isDuplicate = existingHistory.some(m => 
                  m.time === measurement.time && 
                  m.value === measurement.value &&
                  m.deviceId === measurement.deviceId
                );
                
                // Only add if not duplicate
                if (!isDuplicate) {
                  updatedHistory[measurement.type] = [
                    measurement,
                    ...existingHistory.slice(0, 9)
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
      default:
        return "text-gray-600";
    }
  };

  const getStatusColor = (isOnline: boolean) => {
    return isOnline ? "text-green-500" : "text-red-500";
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
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                IoT Dashboard
              </h1>
              <p className="mt-2 text-gray-600">Real-time sensor monitoring</p>
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                {isConnected ? (
                  <Wifi className="w-5 h-5 text-green-500" />
                ) : (
                  <WifiOff className="w-5 h-5 text-red-500" />
                )}
                <span
                  className={`text-sm font-medium ${
                    isConnected ? "text-green-600" : "text-red-600"
                  }`}
                >
                  {isConnected ? "Connected" : "Disconnected"}
                </span>
              </div>
              <div className="text-sm text-gray-500">
                {devices.length} devices
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Alerts Section */}
      {alerts.length > 0 && (
        <div className="bg-red-50 border-l-4 border-red-400 p-4">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center">
              <AlertTriangle className="w-5 h-5 text-red-400 mr-2" />
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">
                  Active Alerts ({alerts.length})
                </h3>
                <div className="mt-2 text-sm text-red-700">
                  {alerts.slice(0, 3).map((alert, index) => (
                    <div key={index} className="mb-1">
                      {alert.message} -{" "}
                      {new Date(alert.time).toLocaleTimeString()}
                    </div>
                  ))}
                  {alerts.length > 3 && (
                    <div className="text-xs text-red-600">
                      +{alerts.length - 3} more alerts
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Devices Grid */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {devices.map((deviceData) => (
            <div
              key={deviceData.device.id}
              className="bg-white rounded-lg shadow-md border border-gray-200 p-6 hover:shadow-lg transition-shadow"
            >
              {/* Device Header */}
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    {deviceData.device.serial}
                  </h3>
                  <p className="text-sm text-gray-600">
                    {deviceData.device.model}
                  </p>
                </div>
                <div
                  className={`flex items-center space-x-1 ${getStatusColor(
                    deviceData.isOnline
                  )}`}
                >
                  <div
                    className={`w-2 h-2 rounded-full ${
                      deviceData.isOnline ? "bg-green-500" : "bg-red-500"
                    }`}
                  ></div>
                  <span className="text-xs font-medium">
                    {deviceData.isOnline ? "Online" : "Offline"}
                  </span>
                </div>
              </div>

              {/* Measurements */}
              <div className="space-y-3">
                {Object.entries(deviceData.latestMeasurements).map(
                  ([type, measurement]) => (
                    <div
                      key={type}
                      className="flex items-center justify-between"
                    >
                      <div className="flex items-center space-x-2">
                        {getMeasurementIcon(type)}
                        <span className="text-sm font-medium text-gray-700 capitalize">
                          {type === "co2" ? "CO₂" : type}
                        </span>
                      </div>
                      <div className="text-right">
                        <span
                          className={`text-lg font-bold ${getMeasurementColor(
                            type,
                            measurement.value
                          )}`}
                        >
                          {measurement.value.toFixed(1)}
                        </span>
                        <span className="text-xs text-gray-500 ml-1">
                          {type === "temperature"
                            ? "°C"
                            : type === "co2"
                            ? "ppm"
                            : ""}
                        </span>
                      </div>
                    </div>
                  )
                )}

                {Object.keys(deviceData.latestMeasurements).length === 0 && (
                  <div className="text-center py-4">
                    <Activity className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                    <p className="text-sm text-gray-500">No data available</p>
                  </div>
                )}

                {/* History Button */}
                {Object.keys(deviceData.latestMeasurements).length > 0 && (
                  <div className="mt-3 pt-3 border-t border-gray-100">
                    <button
                      onClick={() => {
                        setSelectedDevice(deviceData.device.id);
                        setSelectedMeasurementType(Object.keys(deviceData.latestMeasurements)[0]);
                      }}
                      className="w-full text-xs text-blue-600 hover:text-blue-800 font-medium"
                    >
                      View History (Last 10)
                    </button>
                  </div>
                )}
              </div>

              {/* Last Update */}
              {Object.keys(deviceData.latestMeasurements).length > 0 && (
                <div className="mt-4 pt-4 border-t border-gray-100">
                  <p className="text-xs text-gray-500">
                    Last updated: {new Date().toLocaleTimeString()}
                  </p>
                </div>
              )}
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
              No IoT devices are currently registered
            </p>
          </div>
        )}
      </div>

      {/* History Modal */}
      {selectedDevice && selectedMeasurementType && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[80vh] overflow-hidden">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">
                Measurement History
              </h3>
              <button
                onClick={() => {
                  setSelectedDevice(null);
                  setSelectedMeasurementType(null);
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto max-h-[60vh]">
              {(() => {
                const device = devices.find(d => d.device.id === selectedDevice);
                if (!device || !device.measurementHistory[selectedMeasurementType]) {
                  return (
                    <div className="text-center py-8">
                      <Activity className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                      <p className="text-gray-500">No historical data available</p>
                    </div>
                  );
                }

                const history = device.measurementHistory[selectedMeasurementType];
                return (
                  <div>
                    <div className="mb-4">
                      <h4 className="text-sm font-medium text-gray-700 mb-2">
                        Device: {device.device.serial} - {device.device.model}
                      </h4>
                      <div className="flex items-center space-x-2">
                        {getMeasurementIcon(selectedMeasurementType)}
                        <span className="text-sm font-medium text-gray-700 capitalize">
                          {selectedMeasurementType === "co2" ? "CO₂" : selectedMeasurementType}
                        </span>
                      </div>
                    </div>
                    
                    <div className="space-y-3">
                      {history.map((measurement, index) => (
                        <div
                          key={index}
                          className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                        >
                          <div className="flex items-center space-x-3">
                            <div className="text-sm font-medium text-gray-600">
                              #{history.length - index}
                            </div>
                            <div className="text-sm text-gray-500">
                              {new Date(measurement.time).toLocaleString()}
                            </div>
                          </div>
                          <div className="text-right">
                            <span
                              className={`text-lg font-bold ${getMeasurementColor(
                                selectedMeasurementType,
                                measurement.value
                              )}`}
                            >
                              {measurement.value.toFixed(1)}
                            </span>
                            <span className="text-xs text-gray-500 ml-1">
                              {selectedMeasurementType === "temperature"
                                ? "°C"
                                : selectedMeasurementType === "co2"
                                ? "ppm"
                                : ""}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default IoTDashboard;
