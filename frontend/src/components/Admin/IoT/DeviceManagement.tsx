import React, { useState, useEffect } from "react";
import {
  Plus,
  Power,
  PowerOff,
  Edit,
  Trash2,
  Save,
  X,
  AlertTriangle,
  CheckCircle,
} from "lucide-react";

interface Device {
  id: string;
  tenantId: string;
  model: string;
  serial: string;
  status: string;
}

interface DeviceManagementProps {
  onDeviceAdded?: (device: Device) => void;
  onDeviceUpdated?: (device: Device) => void;
  onDeviceDeleted?: (deviceId: string) => void;
}

const DeviceManagement: React.FC<DeviceManagementProps> = ({
  onDeviceAdded,
  onDeviceUpdated,
  onDeviceDeleted,
}) => {
  const [devices, setDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isServerOffline, setIsServerOffline] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingDevice, setEditingDevice] = useState<Device | null>(null);
  const [formData, setFormData] = useState({
    model: "",
    serial: "",
    status: "active",
  });

  useEffect(() => {
    fetchDevices();
  }, []);

  const fetchDevices = async () => {
    try {
      setLoading(true);
      setIsServerOffline(false);

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
      const devicesData: Device[] = await devicesResponse.json();
      setDevices(devicesData);
    } catch (err) {
      // IoT backend offline: present a graceful degraded state without throwing errors
      setIsServerOffline(true);
      setDevices([]);
      setError(null);
    } finally {
      setLoading(false);
    }
  };

  const handleAddDevice = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      // Get tenant info
      const tenantResponse = await fetch(
        "http://localhost:5101/api/tenants/by-slug/innovia"
      );
      if (!tenantResponse.ok) {
        throw new Error("Failed to fetch tenant");
      }
      const tenant = await tenantResponse.json();

      const response = await fetch(
        `http://localhost:5101/api/tenants/${tenant.id}/devices`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: formData.model,
            serial: formData.serial,
            status: formData.status,
          }),
        }
      );

      if (!response.ok) {
        throw new Error("Failed to add device");
      }

      const newDevice: Device = await response.json();
      setDevices([...devices, newDevice]);
      setShowAddForm(false);
      setFormData({ model: "", serial: "", status: "active" });
      onDeviceAdded?.(newDevice);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add device");
    }
  };

  const handleUpdateDevice = async (device: Device) => {
    try {
      const response = await fetch(
        `http://localhost:5101/api/tenants/${device.tenantId}/devices/${device.id}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: device.model,
            serial: device.serial,
            status: device.status,
          }),
        }
      );

      if (!response.ok) {
        throw new Error("Failed to update device");
      }

      const updatedDevice: Device = await response.json();
      setDevices(devices.map((d) => (d.id === device.id ? updatedDevice : d)));
      setEditingDevice(null);
      onDeviceUpdated?.(updatedDevice);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update device");
    }
  };

  const handleToggleStatus = async (device: Device) => {
    const newStatus = device.status === "active" ? "inactive" : "active";
    const updatedDevice = { ...device, status: newStatus };
    await handleUpdateDevice(updatedDevice);
  };

  const handleDeleteDevice = async (deviceId: string) => {
    if (!confirm("Are you sure you want to delete this device?")) {
      return;
    }

    try {
      const device = devices.find((d) => d.id === deviceId);
      if (!device) return;

      const response = await fetch(
        `http://localhost:5101/api/tenants/${device.tenantId}/devices/${deviceId}`,
        {
          method: "DELETE",
        }
      );

      if (!response.ok) {
        throw new Error("Failed to delete device");
      }

      setDevices(devices.filter((d) => d.id !== deviceId));
      onDeviceDeleted?.(deviceId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete device");
    }
  };

  const startEditing = (device: Device) => {
    setEditingDevice(device);
    setFormData({
      model: device.model,
      serial: device.serial,
      status: device.status,
    });
  };

  const cancelEditing = () => {
    setEditingDevice(null);
    setFormData({ model: "", serial: "", status: "active" });
  };

  const getDeviceModel = (deviceSerial: string, deviceModel?: string) => {
    // Map device serial to appropriate model
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
    };

    // If device is in predefined map, return mapped model
    if (modelMap[deviceSerial]) {
      return modelMap[deviceSerial];
    }

    // For new devices, use the actual model from database
    if (deviceModel && deviceModel !== "Acme CO2-Temp Sensor") {
      return deviceModel;
    }

    // Fallback for devices without proper model
    return "Acme IoT Sensor";
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-16 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-semibold text-gray-900">
          Device Management
        </h2>
        <button
          onClick={() => setShowAddForm(true)}
          className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
            isServerOffline
              ? "bg-gray-300 text-gray-600 cursor-not-allowed"
              : "bg-blue-600 text-white hover:bg-blue-700"
          }`}
          disabled={isServerOffline}
        >
          <Plus className="w-4 h-4" />
          <span>Add Device</span>
        </button>
      </div>

      {isServerOffline && (
        <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
          <div className="flex items-center space-x-2">
            <AlertTriangle className="w-5 h-5 text-yellow-600" />
            <p className="text-yellow-800">
              IoT server is currently offline. Devices are unavailable and will be shown as offline. You can continue using the platform; please try again later.
            </p>
          </div>
        </div>
      )}

      {/* Add Device Form */}
      {showAddForm && (
        <div className="mb-6 p-4 bg-gray-50 rounded-lg">
          <h3 className="text-md font-semibold text-gray-900 mb-4">
            Add New Device
          </h3>
          <form onSubmit={handleAddDevice} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Device Model
                </label>
                <select
                  value={formData.model}
                  onChange={(e) =>
                    setFormData({ ...formData, model: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                >
                  <option value="">Select Device Model</option>
                  <option value="Acme Temperature Sensor">
                    Acme Temperature Sensor
                  </option>
                  <option value="Acme CO₂ Monitor">Acme CO₂ Monitor</option>
                  <option value="Acme Humidity Sensor">
                    Acme Humidity Sensor
                  </option>
                  <option value="Acme Temperature Pro">
                    Acme Temperature Pro
                  </option>
                  <option value="Acme VOC Detector">Acme VOC Detector</option>
                  <option value="Acme Occupancy Counter">
                    Acme Occupancy Counter
                  </option>
                  <option value="Acme Door Sensor">Acme Door Sensor</option>
                  <option value="Acme Energy Meter">Acme Energy Meter</option>
                  <option value="Acme Power Monitor">Acme Power Monitor</option>
                  <option value="Acme CO₂ Pro">Acme CO₂ Pro</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Serial Number
                </label>
                <input
                  type="text"
                  value={formData.serial}
                  onChange={(e) =>
                    setFormData({ ...formData, serial: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="e.g., dev-111"
                  required
                />
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <button
                type="submit"
                className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
                  isServerOffline
                    ? "bg-gray-300 text-gray-600 cursor-not-allowed"
                    : "bg-green-600 text-white hover:bg-green-700"
                }`}
                disabled={isServerOffline}
              >
                <Save className="w-4 h-4" />
                <span>Save Device</span>
              </button>
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="flex items-center space-x-2 px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
              >
                <X className="w-4 h-4" />
                <span>Cancel</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Devices List */}
      <div className="space-y-3">
        {devices.map((device) => (
          <div
            key={device.id}
            className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <div className="flex-1">
              <div className="flex items-center space-x-3">
                <div>
                  <h3 className="text-sm font-semibold text-gray-900">
                    {device.serial}
                  </h3>
                  <p className="text-sm text-gray-600">
                    {getDeviceModel(device.serial, device.model)}
                  </p>
                </div>
                <div className="flex items-center space-x-2">
                  <div
                    className={`w-2 h-2 rounded-full ${
                      device.status === "active" ? "bg-green-500" : "bg-red-500"
                    }`}
                  ></div>
                  <span
                    className={`text-xs font-medium ${
                      device.status === "active"
                        ? "text-green-600"
                        : "text-red-600"
                    }`}
                  >
                    {device.status === "active" ? "Active" : "Inactive"}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <button
                onClick={() => handleToggleStatus(device)}
                className={`p-2 rounded-lg transition-colors ${
                  isServerOffline
                    ? "text-gray-400 cursor-not-allowed"
                    : device.status === "active"
                    ? "text-red-600 hover:bg-red-50"
                    : "text-green-600 hover:bg-green-50"
                }`}
                disabled={isServerOffline}
                title={device.status === "active" ? "Deactivate" : "Activate"}
              >
                {device.status === "active" ? (
                  <PowerOff className="w-4 h-4" />
                ) : (
                  <Power className="w-4 h-4" />
                )}
              </button>

              <button
                onClick={() => startEditing(device)}
                className={`p-2 rounded-lg transition-colors ${
                  isServerOffline
                    ? "text-gray-400 cursor-not-allowed"
                    : "text-blue-600 hover:bg-blue-50"
                }`}
                disabled={isServerOffline}
                title="Edit Device"
              >
                <Edit className="w-4 h-4" />
              </button>

              <button
                onClick={() => handleDeleteDevice(device.id)}
                className={`p-2 rounded-lg transition-colors ${
                  isServerOffline
                    ? "text-gray-400 cursor-not-allowed"
                    : "text-red-600 hover:bg-red-50"
                }`}
                disabled={isServerOffline}
                title="Delete Device"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}

        {devices.length === 0 && !isServerOffline && (
          <div className="text-center py-8">
            <CheckCircle className="w-12 h-12 text-gray-300 mx-auto mb-2" />
            <p className="text-gray-500">No devices found</p>
          </div>
        )}

        {devices.length === 0 && isServerOffline && (
          <div className="text-center py-8">
            <AlertTriangle className="w-12 h-12 text-yellow-500 mx-auto mb-2" />
            <p className="text-gray-700">IoT server offline — devices unavailable.</p>
          </div>
        )}
      </div>

      {/* Edit Device Modal */}
      {editingDevice && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Edit Device
            </h3>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleUpdateDevice({
                  ...editingDevice,
                  model: formData.model,
                  serial: formData.serial,
                  status: formData.status,
                });
              }}
              className="space-y-4"
            >
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Device Model
                </label>
                <input
                  type="text"
                  value={getDeviceModel(formData.serial, formData.model)}
                  onChange={(e) =>
                    setFormData({ ...formData, model: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                  readOnly
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Serial Number
                </label>
                <input
                  type="text"
                  value={formData.serial}
                  onChange={(e) =>
                    setFormData({ ...formData, serial: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Status
                </label>
                <select
                  value={formData.status}
                  onChange={(e) =>
                    setFormData({ ...formData, status: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
              <div className="flex items-center space-x-4">
                <button
                  type="submit"
                  className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <Save className="w-4 h-4" />
                  <span>Update Device</span>
                </button>
                <button
                  type="button"
                  onClick={cancelEditing}
                  className="flex items-center space-x-2 px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
                >
                  <X className="w-4 h-4" />
                  <span>Cancel</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default DeviceManagement;
