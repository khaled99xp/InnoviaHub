import React, { useState, useEffect } from "react";
import {
  Plus,
  Edit,
  Trash2,
  AlertTriangle,
  Settings,
  Save,
  X,
  ChevronLeft,
  ChevronRight,
  Filter,
  CheckSquare,
  Square,
  Power,
  PowerOff,
} from "lucide-react";

interface Device {
  id: string;
  serial: string;
  model: string;
  status: string;
}

interface Rule {
  id: string;
  tenantId: string;
  deviceId: string;
  type: string;
  operator: string;
  threshold: number;
  cooldownSeconds: number;
  enabled: boolean;
  message?: string;
  createdAt: string;
  updatedAt?: string;
}

interface Alert {
  id: string;
  deviceId: string;
  type: string;
  value: number;
  time: string;
  ruleId: string;
  severity: string;
  message: string;
}

const RulesManagement: React.FC = () => {
  const [devices, setDevices] = useState<Device[]>([]);
  const [rules, setRules] = useState<Rule[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAddRule, setShowAddRule] = useState(false);
  const [editingRule, setEditingRule] = useState<Rule | null>(null);

  // Pagination and filtering state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [sensorTypeFilter, setSensorTypeFilter] = useState<string>("all");
  const [selectedAlerts, setSelectedAlerts] = useState<string[]>([]);
  const [showBulkActions, setShowBulkActions] = useState(false);

  // Tab state
  const [activeTab, setActiveTab] = useState<"rules" | "alerts">("rules");

  // Form state for new/edit rule
  const [ruleForm, setRuleForm] = useState({
    deviceId: "",
    type: "temperature",
    operator: ">",
    threshold: 25,
    severity: "warning",
    message: "",
    isActive: true,
  });

  // Get sensor type from device
  const getSensorTypeFromDevice = (deviceId: string) => {
    const device = devices.find((d) => d.id === deviceId);
    if (!device) return "temperature";

    const model = getDeviceModel(device);
    if (model.includes("Temperature")) return "temperature";
    if (model.includes("CO₂")) return "co2";
    if (model.includes("Humidity")) return "humidity";
    if (model.includes("VOC")) return "voc";
    if (model.includes("Occupancy")) return "occupancy";
    if (model.includes("Door")) return "door";
    if (model.includes("Energy")) return "energy";
    if (model.includes("Power")) return "power";

    return "temperature"; // default
  };

  // Get default threshold based on sensor type
  const getDefaultThreshold = (sensorType: string) => {
    switch (sensorType) {
      case "temperature":
        return 25;
      case "co2":
        return 1000;
      case "humidity":
        return 60;
      case "voc":
        return 200;
      case "occupancy":
        return 5;
      case "door":
        return 0; // Default to "Closed"
      case "energy":
        return 1.0;
      case "power":
        return 100;
      default:
        return 25;
    }
  };

  // Get threshold step based on sensor type
  const getThresholdStep = (sensorType: string) => {
    switch (sensorType) {
      case "door":
        return 0.1;
      case "temperature":
      case "humidity":
      case "energy":
        return 0.1;
      case "co2":
      case "voc":
      case "power":
        return 1;
      case "occupancy":
        return 1;
      default:
        return 0.1;
    }
  };

  // Get threshold unit based on sensor type
  const getThresholdUnit = (sensorType: string) => {
    switch (sensorType) {
      case "temperature":
        return "°C";
      case "co2":
        return "ppm";
      case "humidity":
        return "%";
      case "voc":
        return "ppb";
      case "occupancy":
        return "people";
      case "door":
        return ""; // No unit for door state
      case "energy":
        return "kWh";
      case "power":
        return "W";
      default:
        return "";
    }
  };

  // Fetch devices from DeviceRegistry
  const fetchDevices = async () => {
    try {
      console.log("Fetching tenant...");
      const tenantResponse = await fetch(
        "http://localhost:5101/api/tenants/by-slug/innovia"
      );

      if (!tenantResponse.ok) {
        throw new Error(`Failed to fetch tenant: ${tenantResponse.status}`);
      }

      const tenant = await tenantResponse.json();
      console.log("Tenant:", tenant);

      console.log("Fetching devices for tenant:", tenant.id);
      const devicesResponse = await fetch(
        `http://localhost:5101/api/tenants/${tenant.id}/devices`
      );

      if (!devicesResponse.ok) {
        throw new Error(`Failed to fetch devices: ${devicesResponse.status}`);
      }

      const devicesData = await devicesResponse.json();
      console.log("Devices fetched:", devicesData);
      setDevices(devicesData);
    } catch (err) {
      console.error("Error fetching devices:", err);
      setError(
        `Failed to fetch devices: ${
          err instanceof Error ? err.message : "Unknown error"
        }`
      );
    }
  };

  // Fetch rules from Rules.Engine
  const fetchRules = async () => {
    try {
      const response = await fetch("http://localhost:5105/rules");
      if (response.ok) {
        const rulesData = await response.json();
        console.log("Rules fetched:", rulesData);

        // Group rules by device and type for debugging
        const rulesByDevice = rulesData.reduce((acc: any, rule: any) => {
          const deviceName = getDeviceName(rule.deviceId);
          const key = `${deviceName}-${rule.type}`;
          if (!acc[key]) {
            acc[key] = [];
          }
          acc[key].push(rule);
          return acc;
        }, {});

        console.log("Rules grouped by device and type:", rulesByDevice);
        setRules(rulesData);
      }
    } catch (err) {
      console.error("Error fetching rules:", err);
    }
  };

  // Fetch alerts from Rules.Engine
  const fetchAlerts = async () => {
    try {
      const response = await fetch("http://localhost:5105/alerts");
      if (response.ok) {
        const alertsData = await response.json();
        console.log("Alerts fetched:", alertsData);

        // Group alerts by device for debugging
        const alertsByDevice = alertsData.reduce((acc: any, alert: any) => {
          const deviceName = getDeviceName(alert.deviceId);
          if (!acc[deviceName]) {
            acc[deviceName] = [];
          }
          acc[deviceName].push(alert);
          return acc;
        }, {});

        console.log("Alerts grouped by device:", alertsByDevice);

        // Debug: Check if we have alerts for door sensor
        const doorAlerts = alertsData.filter(
          (alert: any) => alert.type === "door"
        );
        console.log("Door alerts:", doorAlerts);

        // Debug: Check if we have alerts for power sensor
        const powerAlerts = alertsData.filter(
          (alert: any) => alert.type === "power"
        );
        console.log("Power alerts:", powerAlerts);

        setAlerts(alertsData);
      }
    } catch (err) {
      console.error("Error fetching alerts:", err);
    }
  };

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([fetchDevices(), fetchRules(), fetchAlerts()]);
      setLoading(false);
    };
    loadData();
  }, []);

  // Auto-refresh alerts every 5 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      fetchAlerts();
    }, 5000); // Refresh every 5 seconds

    return () => clearInterval(interval);
  }, []);

  // Reset to first page when filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [sensorTypeFilter]);

  // Create new rule
  const createRule = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      // Get tenant ID first
      const tenantResponse = await fetch(
        "http://localhost:5101/api/tenants/by-slug/innovia"
      );
      const tenant = await tenantResponse.json();

      const ruleData = {
        TenantId: tenant.id,
        DeviceId: ruleForm.deviceId,
        Type: ruleForm.type,
        Op: ruleForm.operator,
        Threshold: ruleForm.threshold,
        CooldownSeconds: 300,
        Enabled: ruleForm.isActive,
        Message:
          ruleForm.message ||
          `${ruleForm.type} ${ruleForm.operator} ${ruleForm.threshold}`,
      };

      const response = await fetch("http://localhost:5105/rules", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(ruleData),
      });

      if (response.ok) {
        await fetchRules();
        setShowAddRule(false);
        resetForm();
      } else {
        setError("Failed to create rule");
      }
    } catch (err) {
      console.error("Error creating rule:", err);
      setError("Failed to create rule");
    }
  };

  // Update rule
  const updateRule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRule) return;

    try {
      const ruleData = {
        Type: ruleForm.type,
        Op: ruleForm.operator,
        Threshold: ruleForm.threshold,
        CooldownSeconds: 300,
        Enabled: ruleForm.isActive,
        Message:
          ruleForm.message ||
          `${ruleForm.type} ${ruleForm.operator} ${ruleForm.threshold}`,
      };

      const response = await fetch(
        `http://localhost:5105/rules/${editingRule.id}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(ruleData),
        }
      );

      if (response.ok) {
        await fetchRules();
        setEditingRule(null);
        resetForm();
      } else {
        setError("Failed to update rule");
      }
    } catch (err) {
      console.error("Error updating rule:", err);
      setError("Failed to update rule");
    }
  };

  // Delete rule
  const deleteRule = async (ruleId: string) => {
    if (!confirm("Are you sure you want to delete this rule?")) return;

    try {
      const response = await fetch(`http://localhost:5105/rules/${ruleId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        await fetchRules();
      } else {
        setError("Failed to delete rule");
      }
    } catch (err) {
      console.error("Error deleting rule:", err);
      setError("Failed to delete rule");
    }
  };

  // Toggle rule active status
  const toggleRuleStatus = async (rule: Rule) => {
    try {
      const response = await fetch(
        `http://localhost:5105/rules/${rule.id}/toggle`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ IsActive: !rule.enabled }),
        }
      );

      if (response.ok) {
        await fetchRules();
      } else {
        setError("Failed to toggle rule status");
      }
    } catch (err) {
      console.error("Error toggling rule status:", err);
      setError("Failed to toggle rule status");
    }
  };

  const resetForm = () => {
    setRuleForm({
      deviceId: "",
      type: "temperature",
      operator: ">",
      threshold: 25,
      severity: "warning",
      message: "",
      isActive: true,
    });
  };

  const openEditRule = (rule: Rule) => {
    setRuleForm({
      deviceId: rule.deviceId,
      type: rule.type,
      operator: rule.operator,
      threshold: rule.threshold,
      severity: "warning", // Default severity since Rules.Engine doesn't store this
      message:
        rule.message || `${rule.type} ${rule.operator} ${rule.threshold}`,
      isActive: rule.enabled,
    });
    setEditingRule(rule);
  };

  const getDeviceName = (deviceId: string) => {
    const device = devices.find((d) => d.id === deviceId);
    if (device) {
      const properModel = getDeviceModel(device);
      return `${device.serial} (${properModel})`;
    }

    // If device not found, try to extract serial from UUID mapping
    // This handles cases where Rules.Engine uses UUIDs instead of serials
    console.warn(`Device not found for ID: ${deviceId}`);
    return deviceId; // Fallback to showing the UUID
  };

  // Get device model with proper naming (same as IoTDashboard)
  const getDeviceModel = (device: Device) => {
    // Map of device serials to their proper models
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

    // Check if we have a predefined model for this device
    if (modelMap[device.serial]) {
      return modelMap[device.serial];
    }

    // If device has a custom model from database and it's not the generic one
    if (device.model && device.model !== "Acme CO2-Temp Sensor") {
      return device.model;
    }

    // Fallback to generic model
    return "Acme IoT Sensor";
  };

  const getSeverityColor = (severity: string) => {
    switch (severity.toLowerCase()) {
      case "critical":
        return "text-red-600 bg-red-50";
      case "warning":
        return "text-yellow-600 bg-yellow-50";
      case "info":
        return "text-blue-600 bg-blue-50";
      default:
        return "text-gray-600 bg-gray-50";
    }
  };

  // Filter alerts by sensor type
  const getFilteredAlerts = () => {
    if (sensorTypeFilter === "all") {
      return alerts;
    }
    return alerts.filter((alert) => alert.type === sensorTypeFilter);
  };

  // Get paginated alerts
  const getPaginatedAlerts = () => {
    const filtered = getFilteredAlerts();
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return filtered.slice(startIndex, endIndex);
  };

  // Get total pages
  const getTotalPages = () => {
    const filtered = getFilteredAlerts();
    return Math.ceil(filtered.length / itemsPerPage);
  };

  // Handle alert selection
  const handleAlertSelect = (alertId: string) => {
    setSelectedAlerts((prev) =>
      prev.includes(alertId)
        ? prev.filter((id) => id !== alertId)
        : [...prev, alertId]
    );
  };

  // Handle select all alerts on current page
  const handleSelectAll = () => {
    const currentPageAlerts = getPaginatedAlerts();
    const allSelected = currentPageAlerts.every((alert) =>
      selectedAlerts.includes(alert.id)
    );

    if (allSelected) {
      // Deselect all on current page
      setSelectedAlerts((prev) =>
        prev.filter((id) => !currentPageAlerts.some((alert) => alert.id === id))
      );
    } else {
      // Select all on current page
      const newSelected = currentPageAlerts.map((alert) => alert.id);
      setSelectedAlerts((prev) => [...new Set([...prev, ...newSelected])]);
    }
  };

  // Delete single alert
  const deleteAlert = async (alertId: string) => {
    try {
      const response = await fetch(`http://localhost:5105/alerts/${alertId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        setAlerts((prev) => prev.filter((alert) => alert.id !== alertId));
        setSelectedAlerts((prev) => prev.filter((id) => id !== alertId));
      }
    } catch (err) {
      console.error("Error deleting alert:", err);
    }
  };

  // Delete multiple alerts
  const deleteSelectedAlerts = async () => {
    if (selectedAlerts.length === 0) {
      console.warn("No alerts selected for deletion");
      return;
    }

    // Confirm deletion
    if (
      !confirm(
        `Are you sure you want to delete ${selectedAlerts.length} alert(s)?`
      )
    ) {
      return;
    }

    try {
      console.log("Deleting alerts:", selectedAlerts);

      // Use the bulk delete endpoint
      const response = await fetch("http://localhost:5105/alerts", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(selectedAlerts),
      });

      console.log("Delete response status:", response.status);

      if (response.ok) {
        setAlerts((prev) =>
          prev.filter((alert) => !selectedAlerts.includes(alert.id))
        );
        setSelectedAlerts([]);
        setShowBulkActions(false);
        console.log("Alerts deleted successfully");
      } else {
        const errorText = await response.text();
        console.error("Failed to delete alerts:", response.status, errorText);
        alert(`Failed to delete alerts: ${response.status} ${errorText}`);
      }
    } catch (err) {
      console.error("Error deleting alerts:", err);
      alert(
        `Error deleting alerts: ${
          err instanceof Error ? err.message : "Unknown error"
        }`
      );
    }
  };

  // Get unique sensor types from alerts
  const getUniqueSensorTypes = () => {
    const types = [...new Set(alerts.map((alert) => alert.type))];
    return types.sort();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading rules and alerts...</p>
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
            Rules Management
          </h1>
          <p className="text-sm sm:text-base text-gray-600 mt-1">
            Create and manage IoT device rules and alerts
          </p>
        </div>
        {activeTab === "rules" && (
          <button
            onClick={() => setShowAddRule(true)}
            className="flex items-center space-x-2 px-3 sm:px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm sm:text-base"
          >
            <Plus className="w-4 h-4" />
            <span>Add Rule</span>
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8 px-4 sm:px-6">
            <button
              onClick={() => setActiveTab("rules")}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === "rules"
                  ? "border-blue-500 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              <div className="flex items-center space-x-2">
                <Settings className="w-4 h-4" />
                <span>Rules ({rules.length})</span>
              </div>
            </button>
            <button
              onClick={() => setActiveTab("alerts")}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === "alerts"
                  ? "border-blue-500 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              <div className="flex items-center space-x-2">
                <AlertTriangle className="w-4 h-4" />
                <span>Alerts ({getFilteredAlerts().length})</span>
              </div>
            </button>
          </nav>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border-l-4 border-red-400 p-3 sm:p-4">
          <div className="flex items-center">
            <AlertTriangle className="w-5 h-5 text-red-400 mr-2 flex-shrink-0" />
            <p className="text-red-700 text-sm sm:text-base flex-1">{error}</p>
            <button
              onClick={() => setError(null)}
              className="ml-auto text-red-400 hover:text-red-600 p-1"
            >
              <X className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
          </div>
        </div>
      )}

      {/* Tab Content */}
      {activeTab === "rules" && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-gray-200">
            <h2 className="text-lg sm:text-xl font-semibold text-gray-900 flex items-center">
              <Settings className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
              Rules ({rules.length})
            </h2>
          </div>
          <div className="p-4 sm:p-6">
            {rules.length === 0 ? (
              <div className="text-center py-8">
                <Settings className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">No rules configured</p>
                <button
                  onClick={() => setShowAddRule(true)}
                  className="mt-4 text-blue-600 hover:text-blue-700"
                >
                  Create your first rule
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {rules.map((rule) => (
                  <div
                    key={rule.id}
                    className="border border-gray-200 rounded-lg p-3 sm:p-4"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <h3 className="text-sm sm:text-base font-medium text-gray-900 truncate">
                          {rule.message ||
                            `${rule.type} ${rule.operator} ${rule.threshold}`}
                        </h3>
                        <p className="text-xs sm:text-sm text-gray-600 mt-1">
                          {getDeviceName(rule.deviceId)}
                        </p>
                        <p className="text-xs sm:text-sm text-gray-500 mt-1">
                          {rule.type} {rule.operator} {rule.threshold}
                        </p>
                      </div>
                      <div className="flex items-center space-x-2 ml-2">
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-medium ${
                            rule.enabled
                              ? "bg-green-100 text-green-800"
                              : "bg-gray-100 text-gray-800"
                          }`}
                        >
                          {rule.enabled ? "Active" : "Inactive"}
                        </span>
                        <button
                          onClick={() => openEditRule(rule)}
                          className="p-1 text-blue-600 hover:bg-blue-100 rounded transition-colors"
                          title="Edit Rule"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => toggleRuleStatus(rule)}
                          className={`p-1 rounded transition-colors ${
                            rule.enabled
                              ? "text-red-600 hover:bg-red-100"
                              : "text-green-600 hover:bg-green-100"
                          }`}
                          title={rule.enabled ? "Disable Rule" : "Enable Rule"}
                        >
                          {rule.enabled ? (
                            <PowerOff className="w-4 h-4" />
                          ) : (
                            <Power className="w-4 h-4" />
                          )}
                        </button>
                        <button
                          onClick={() => deleteRule(rule.id)}
                          className="p-1 text-red-600 hover:bg-red-100 rounded transition-colors"
                          title="Delete Rule"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === "alerts" && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-gray-200">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <h2 className="text-lg sm:text-xl font-semibold text-gray-900 flex items-center">
                <AlertTriangle className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
                Recent Alerts ({getFilteredAlerts().length})
              </h2>

              {/* Filter and Bulk Actions */}
              <div className="flex flex-col sm:flex-row gap-3">
                {/* Sensor Type Filter */}
                <div className="flex items-center space-x-2">
                  <Filter className="w-4 h-4 text-gray-500" />
                  <select
                    value={sensorTypeFilter}
                    onChange={(e) => setSensorTypeFilter(e.target.value)}
                    className="px-3 py-1 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="all">All Types</option>
                    {getUniqueSensorTypes().map((type) => (
                      <option key={type} value={type}>
                        {type.charAt(0).toUpperCase() + type.slice(1)}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Bulk Actions */}
                {selectedAlerts.length > 0 && (
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={deleteSelectedAlerts}
                      className="flex items-center space-x-1 px-3 py-1 bg-red-600 text-white rounded-md text-sm hover:bg-red-700 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                      <span>Delete ({selectedAlerts.length})</span>
                    </button>
                    <button
                      onClick={() => setSelectedAlerts([])}
                      className="px-3 py-1 bg-gray-500 text-white rounded-md text-sm hover:bg-gray-600 transition-colors"
                    >
                      Clear
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="p-4 sm:p-6">
            {getFilteredAlerts().length === 0 ? (
              <div className="text-center py-8">
                <AlertTriangle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">
                  {sensorTypeFilter === "all"
                    ? "No alerts triggered"
                    : `No ${sensorTypeFilter} alerts`}
                </p>
              </div>
            ) : (
              <>
                {/* Select All Checkbox */}
                <div className="mb-4 flex items-center space-x-2">
                  <button
                    onClick={handleSelectAll}
                    className="flex items-center space-x-2 text-sm text-gray-600 hover:text-gray-800"
                  >
                    {getPaginatedAlerts().every((alert) =>
                      selectedAlerts.includes(alert.id)
                    ) ? (
                      <CheckSquare className="w-4 h-4" />
                    ) : (
                      <Square className="w-4 h-4" />
                    )}
                    <span>Select All</span>
                  </button>
                </div>

                {/* Alerts List */}
                <div className="space-y-3 sm:space-y-4">
                  {getPaginatedAlerts().map((alert) => (
                    <div
                      key={alert.id}
                      className={`border-l-4 border-red-400 bg-red-50 p-3 sm:p-4 rounded ${
                        selectedAlerts.includes(alert.id)
                          ? "ring-2 ring-blue-500"
                          : ""
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-start space-x-3 flex-1 min-w-0">
                          {/* Selection Checkbox */}
                          <button
                            onClick={() => handleAlertSelect(alert.id)}
                            className="mt-1"
                          >
                            {selectedAlerts.includes(alert.id) ? (
                              <CheckSquare className="w-4 h-4 text-blue-600" />
                            ) : (
                              <Square className="w-4 h-4 text-gray-400" />
                            )}
                          </button>

                          <div className="flex-1 min-w-0">
                            <h3 className="text-sm sm:text-base font-medium text-red-900 truncate">
                              {getDeviceName(alert.deviceId)}
                            </h3>
                            <p className="text-xs sm:text-sm text-red-700 mt-1">
                              {alert.message}
                            </p>
                            <p className="text-xs text-red-600 mt-1">
                              Value: {alert.value} |{" "}
                              {new Date(alert.time).toLocaleString()}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center space-x-2 ml-2">
                          <span
                            className={`px-2 py-1 rounded-full text-xs font-medium ${getSeverityColor(
                              alert.severity
                            )}`}
                          >
                            {alert.severity}
                          </span>

                          {/* Delete Button */}
                          <button
                            onClick={() => deleteAlert(alert.id)}
                            className="p-1 text-red-600 hover:bg-red-100 rounded transition-colors"
                            title="Delete alert"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Pagination */}
                {getTotalPages() > 1 && (
                  <div className="mt-6 flex items-center justify-between">
                    <div className="text-sm text-gray-700">
                      Showing {(currentPage - 1) * itemsPerPage + 1} to{" "}
                      {Math.min(
                        currentPage * itemsPerPage,
                        getFilteredAlerts().length
                      )}{" "}
                      of {getFilteredAlerts().length} alerts
                    </div>

                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() =>
                          setCurrentPage((prev) => Math.max(prev - 1, 1))
                        }
                        disabled={currentPage === 1}
                        className="p-2 rounded-md border border-gray-300 text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </button>

                      <div className="flex items-center space-x-1">
                        {Array.from(
                          { length: getTotalPages() },
                          (_, i) => i + 1
                        ).map((page) => (
                          <button
                            key={page}
                            onClick={() => setCurrentPage(page)}
                            className={`px-3 py-1 rounded-md text-sm ${
                              currentPage === page
                                ? "bg-blue-600 text-white"
                                : "text-gray-700 hover:bg-gray-100"
                            }`}
                          >
                            {page}
                          </button>
                        ))}
                      </div>

                      <button
                        onClick={() =>
                          setCurrentPage((prev) =>
                            Math.min(prev + 1, getTotalPages())
                          )
                        }
                        disabled={currentPage === getTotalPages()}
                        className="p-2 rounded-md border border-gray-300 text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {/* Add/Edit Rule Modal */}
      {(showAddRule || editingRule) && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              {editingRule ? "Edit Rule" : "Add New Rule"}
            </h3>
            <form
              onSubmit={editingRule ? updateRule : createRule}
              className="space-y-4"
            >
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Device
                </label>
                <select
                  value={ruleForm.deviceId}
                  onChange={(e) => {
                    const deviceId = e.target.value;
                    const sensorType = getSensorTypeFromDevice(deviceId);
                    const defaultThreshold = getDefaultThreshold(sensorType);

                    setRuleForm({
                      ...ruleForm,
                      deviceId,
                      type: sensorType,
                      threshold: defaultThreshold,
                    });
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                >
                  <option value="">
                    Select Device ({devices.length} devices available)
                  </option>
                  {devices.map((device) => (
                    <option key={device.id} value={device.id}>
                      {device.serial} ({getDeviceModel(device)})
                    </option>
                  ))}
                </select>
                {ruleForm.deviceId && (
                  <p className="text-xs text-gray-500 mt-1">
                    Sensor Type:{" "}
                    {ruleForm.type.charAt(0).toUpperCase() +
                      ruleForm.type.slice(1)}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Operator
                </label>
                <select
                  value={ruleForm.operator}
                  onChange={(e) =>
                    setRuleForm({ ...ruleForm, operator: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                >
                  <option value=">">Greater than</option>
                  <option value="<">Less than</option>
                  <option value=">=">Greater than or equal</option>
                  <option value="<=">Less than or equal</option>
                  <option value="==">Equal to</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {ruleForm.type === "door"
                    ? "Door State"
                    : `Threshold Value ${getThresholdUnit(ruleForm.type)}`}
                </label>
                {ruleForm.type === "door" ? (
                  <select
                    value={ruleForm.threshold}
                    onChange={(e) =>
                      setRuleForm({
                        ...ruleForm,
                        threshold: parseFloat(e.target.value),
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                  >
                    <option value={0}>Closed</option>
                    <option value={1}>Open</option>
                  </select>
                ) : (
                  <input
                    type="number"
                    step={getThresholdStep(ruleForm.type)}
                    value={ruleForm.threshold}
                    onChange={(e) =>
                      setRuleForm({
                        ...ruleForm,
                        threshold: parseFloat(e.target.value),
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                )}
                {ruleForm.type === "door" && (
                  <p className="text-xs text-gray-500 mt-1">
                    Select whether the door should be closed or open to trigger
                    the alert
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Alert Message
                </label>
                <input
                  type="text"
                  value={ruleForm.message}
                  onChange={(e) =>
                    setRuleForm({ ...ruleForm, message: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Custom alert message (optional)"
                />
              </div>

              <div className="flex items-center space-x-4">
                <button
                  type="submit"
                  className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <Save className="w-4 h-4" />
                  <span>{editingRule ? "Update Rule" : "Create Rule"}</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowAddRule(false);
                    setEditingRule(null);
                    setRuleForm({
                      deviceId: "",
                      type: "temperature",
                      operator: ">",
                      threshold: 25,
                      severity: "warning",
                      message: "",
                      isActive: true,
                    });
                  }}
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

export default RulesManagement;
