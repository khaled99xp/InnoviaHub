import React, { useState, useEffect } from "react";
import {
  Plus,
  Edit,
  Trash2,
  AlertTriangle,
  Settings,
  Save,
  X,
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

  // Fetch devices from DeviceRegistry
  const fetchDevices = async () => {
    try {
      const tenantResponse = await fetch(
        "http://localhost:5101/api/tenants/by-slug/innovia"
      );
      const tenant = await tenantResponse.json();

      const devicesResponse = await fetch(
        `http://localhost:5101/api/tenants/${tenant.id}/devices`
      );
      const devicesData = await devicesResponse.json();
      setDevices(devicesData);
    } catch (err) {
      console.error("Error fetching devices:", err);
      setError("Failed to fetch devices");
    }
  };

  // Fetch rules from Rules.Engine
  const fetchRules = async () => {
    try {
      const response = await fetch("http://localhost:5105/rules");
      if (response.ok) {
        const rulesData = await response.json();
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
  const toggleRuleStatus = async (ruleId: string, isActive: boolean) => {
    try {
      const response = await fetch(
        `http://localhost:5105/rules/${ruleId}/toggle`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ IsActive: !isActive }),
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
    return device ? `${device.serial} (${device.model})` : deviceId;
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
        <button
          onClick={() => setShowAddRule(true)}
          className="flex items-center space-x-2 px-3 sm:px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm sm:text-base"
        >
          <Plus className="w-4 h-4" />
          <span>Add Rule</span>
        </button>
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        {/* Rules Section */}
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
                      <div className="flex items-center space-x-1 ml-2">
                        <span className="px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          Rule
                        </span>
                        <button
                          onClick={() =>
                            toggleRuleStatus(rule.id, rule.enabled)
                          }
                          className={`px-2 py-1 rounded text-xs font-medium ${
                            rule.enabled
                              ? "bg-green-100 text-green-800"
                              : "bg-gray-100 text-gray-800"
                          }`}
                        >
                          {rule.enabled ? "Active" : "Inactive"}
                        </button>
                        <button
                          onClick={() => openEditRule(rule)}
                          className="text-blue-600 hover:text-blue-700 p-1"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => deleteRule(rule.id)}
                          className="text-red-600 hover:text-red-700 p-1"
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

        {/* Alerts Section */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-gray-200">
            <h2 className="text-lg sm:text-xl font-semibold text-gray-900 flex items-center">
              <AlertTriangle className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
              Recent Alerts ({alerts.length})
            </h2>
          </div>
          <div className="p-4 sm:p-6">
            {alerts.length === 0 ? (
              <div className="text-center py-8">
                <AlertTriangle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">No alerts triggered</p>
              </div>
            ) : (
              <div className="space-y-3 sm:space-y-4">
                {alerts.slice(0, 10).map((alert) => (
                  <div
                    key={alert.id}
                    className="border-l-4 border-red-400 bg-red-50 p-3 sm:p-4 rounded"
                  >
                    <div className="flex items-start justify-between">
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
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-medium ml-2 ${getSeverityColor(
                          alert.severity
                        )}`}
                      >
                        {alert.severity}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Add/Edit Rule Modal */}
      {(showAddRule || editingRule) && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-4 sm:p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">
                {editingRule ? "Edit Rule" : "Add New Rule"}
              </h3>
              <button
                onClick={() => {
                  setShowAddRule(false);
                  setEditingRule(null);
                  resetForm();
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form
              onSubmit={editingRule ? updateRule : createRule}
              className="space-y-3 sm:space-y-4"
            >
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Device
                </label>
                <select
                  value={ruleForm.deviceId}
                  onChange={(e) =>
                    setRuleForm({ ...ruleForm, deviceId: e.target.value })
                  }
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                >
                  <option value="">Select a device</option>
                  {devices.map((device) => (
                    <option key={device.id} value={device.id}>
                      {device.serial} ({device.model})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Measurement Type
                </label>
                <select
                  value={ruleForm.type}
                  onChange={(e) =>
                    setRuleForm({ ...ruleForm, type: e.target.value })
                  }
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="temperature">Temperature</option>
                  <option value="co2">CO₂</option>
                  <option value="humidity">Humidity</option>
                  <option value="motion">Motion</option>
                  <option value="light">Light</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3 sm:gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Operator
                  </label>
                  <select
                    value={ruleForm.operator}
                    onChange={(e) =>
                      setRuleForm({ ...ruleForm, operator: e.target.value })
                    }
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
                    Threshold
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={ruleForm.threshold}
                    onChange={(e) =>
                      setRuleForm({
                        ...ruleForm,
                        threshold: parseFloat(e.target.value),
                      })
                    }
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Severity
                </label>
                <select
                  value={ruleForm.severity}
                  onChange={(e) =>
                    setRuleForm({ ...ruleForm, severity: e.target.value })
                  }
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="info">Info</option>
                  <option value="warning">Warning</option>
                  <option value="critical">Critical</option>
                </select>
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
                  placeholder="e.g., Temperature too high"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="isActive"
                  checked={ruleForm.isActive}
                  onChange={(e) =>
                    setRuleForm({ ...ruleForm, isActive: e.target.checked })
                  }
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label
                  htmlFor="isActive"
                  className="ml-2 text-sm text-gray-700"
                >
                  Rule is active
                </label>
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddRule(false);
                    setEditingRule(null);
                    resetForm();
                  }}
                  className="px-3 sm:px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex items-center space-x-2 px-3 sm:px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
                >
                  <Save className="w-4 h-4" />
                  <span>{editingRule ? "Update" : "Create"} Rule</span>
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
