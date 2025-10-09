import React, { useState, useEffect } from "react";
import {
  Brain,
  TrendingUp,
  Users,
  MessageSquare,
  Lightbulb,
  BarChart3,
} from "lucide-react";
import {
  getAIInsights,
  getAIAnalytics,
  analyzeBookingPatterns,
  type AIInsight,
  type AIAnalytics,
} from "@/api/aiApi";
import { useAdminAuth } from "@/context/AdminAuthProvider";

export const AIInsights: React.FC = () => {
  const [insights, setInsights] = useState<AIInsight[]>([]);
  const [analytics, setAnalytics] = useState<AIAnalytics | null>(null);
  const [patternAnalysis, setPatternAnalysis] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<
    "insights" | "analytics" | "patterns"
  >("insights");
  const { user } = useAdminAuth();

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user]);

  const loadData = async () => {
    try {
      setIsLoading(true);
      // Get token from localStorage since AdminAuthContext doesn't provide it
      const token = localStorage.getItem("token");
      if (!token) {
        throw new Error("No authentication token found");
      }

      const [insightsData, analyticsData, patternsData] = await Promise.all([
        getAIInsights(token),
        getAIAnalytics(token),
        analyzeBookingPatterns(token),
      ]);

      setInsights(insightsData);
      setAnalytics(analyticsData);
      setPatternAnalysis(patternsData.analysis);
    } catch (error) {
      console.error("Failed to load AI data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const getInsightIcon = (type: string) => {
    switch (type) {
      case "usage_pattern":
        return <TrendingUp className="w-5 h-5" />;
      case "recommendation":
        return <Lightbulb className="w-5 h-5" />;
      case "trend":
        return <BarChart3 className="w-5 h-5" />;
      default:
        return <Brain className="w-5 h-5" />;
    }
  };

  const getInsightColor = (type: string) => {
    switch (type) {
      case "usage_pattern":
        return "bg-blue-100 text-blue-600";
      case "recommendation":
        return "bg-green-100 text-green-600";
      case "trend":
        return "bg-purple-100 text-purple-600";
      default:
        return "bg-gray-100 text-gray-600";
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">
            AI Insights Dashboard
          </h2>
          <p className="text-gray-600">
            Intelligent analytics and recommendations
          </p>
        </div>
        <button
          onClick={loadData}
          className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
        >
          Refresh Data
        </button>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {[
            { id: "insights", label: "Insights", icon: Brain },
            { id: "analytics", label: "Analytics", icon: BarChart3 },
            { id: "patterns", label: "Patterns", icon: TrendingUp },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() =>
                setActiveTab(tab.id as "insights" | "analytics" | "patterns")
              }
              className={`flex items-center gap-2 py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === tab.id
                  ? "border-blue-500 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Content */}
      {activeTab === "insights" && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900">
            AI Generated Insights
          </h3>
          {insights.length === 0 ? (
            <div className="text-center py-12">
              <Brain className="w-16 h-16 mx-auto mb-4 text-gray-400" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                No AI Insights Available
              </h3>
              <p className="text-gray-500 mb-6">
                AI insights will be automatically generated based on system
                usage patterns.
              </p>

              <div className="grid gap-4 max-w-2xl mx-auto">
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <TrendingUp className="w-5 h-5 text-blue-600 mt-0.5" />
                    <div className="text-left">
                      <p className="text-sm text-blue-800 font-medium">
                        Insights are generated when:
                      </p>
                      <ul className="text-xs text-blue-700 mt-1 space-y-1">
                        <li>
                          • Users make bookings and interact with the system
                        </li>
                        <li>• Booking patterns and trends are identified</li>
                        <li>• Resource utilization data is collected</li>
                      </ul>
                    </div>
                  </div>
                </div>

                <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <Lightbulb className="w-5 h-5 text-green-600 mt-0.5" />
                    <div className="text-left">
                      <p className="text-sm text-green-800 font-medium">
                        What you'll see:
                      </p>
                      <ul className="text-xs text-green-700 mt-1 space-y-1">
                        <li>• Usage pattern recommendations</li>
                        <li>• Resource optimization suggestions</li>
                        <li>
                          • Peak time identification and capacity insights
                        </li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {insights.map((insight) => (
                <div
                  key={insight.id}
                  className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm"
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={`p-2 rounded-lg ${getInsightColor(
                        insight.insightType
                      )}`}
                    >
                      {getInsightIcon(insight.insightType)}
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold text-gray-900 mb-2">
                        {insight.title}
                      </h4>
                      <p className="text-gray-600 text-sm mb-3">
                        {insight.description}
                      </p>
                      <div className="flex items-center justify-between text-xs text-gray-500">
                        <span className="capitalize">
                          {insight.insightType.replace("_", " ")}
                        </span>
                        <span>
                          {new Date(insight.generatedAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === "analytics" && analytics && (
        <div className="space-y-6">
          <h3 className="text-lg font-semibold text-gray-900">AI Analytics</h3>

          {/* Stats Cards */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <MessageSquare className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">
                    {analytics.totalChatMessages}
                  </p>
                  <p className="text-sm text-gray-600">Chat Messages</p>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 rounded-lg">
                  <Lightbulb className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">
                    {analytics.totalRecommendations}
                  </p>
                  <p className="text-sm text-gray-600">Recommendations</p>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <Brain className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">
                    {analytics.activeInsights}
                  </p>
                  <p className="text-sm text-gray-600">Active Insights</p>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-orange-100 rounded-lg">
                  <Users className="w-5 h-5 text-orange-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">
                    {analytics.popularTopics.length}
                  </p>
                  <p className="text-sm text-gray-600">Popular Topics</p>
                </div>
              </div>
            </div>
          </div>

          {/* Popular Topics */}
          <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
            <h4 className="text-lg font-semibold text-gray-900 mb-4">
              Popular Topics
            </h4>
            <div className="flex flex-wrap gap-2">
              {analytics.popularTopics.map((topic, index) => (
                <span
                  key={index}
                  className="px-3 py-1 bg-blue-50 text-blue-600 rounded-full text-sm"
                >
                  {topic}
                </span>
              ))}
            </div>
          </div>

          {/* Usage by Hour */}
          <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
            <h4 className="text-lg font-semibold text-gray-900 mb-4">
              Usage by Hour
            </h4>
            <div className="space-y-2">
              {Object.entries(analytics.usageByHour)
                .sort(([a], [b]) => parseInt(a) - parseInt(b))
                .map(([hour, count]) => (
                  <div key={hour} className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">{hour}:00</span>
                    <div className="flex-1 mx-4">
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-blue-500 h-2 rounded-full"
                          style={{
                            width: `${
                              (count /
                                Math.max(
                                  ...Object.values(analytics.usageByHour)
                                )) *
                              100
                            }%`,
                          }}
                        ></div>
                      </div>
                    </div>
                    <span className="text-sm font-medium text-gray-900">
                      {count}
                    </span>
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === "patterns" && (
        <div className="space-y-6">
          <h3 className="text-lg font-semibold text-gray-900">
            Booking Pattern Analysis
          </h3>

          {patternAnalysis ? (
            <div className="space-y-6">
              {/* Parse and display structured data */}
              {(() => {
                try {
                  // Extract structured information from the analysis text

                  // Find sections
                  const totalBookingsMatch = patternAnalysis.match(
                    /Total Bookings[:\s]*(\d+)/i
                  );
                  const popularResourcesMatch = patternAnalysis.match(
                    /Popular Resources[:\s]*([\s\S]*?)(?=\d+\.|$)/i
                  );
                  const bookingTimesMatch = patternAnalysis.match(
                    /Booking Time Insights[:\s]*([\s\S]*?)(?=\*\*Actionable|$)/i
                  );
                  const actionableMatch = patternAnalysis.match(
                    /\*\*Actionable Insights\*\*[:\s]*([\s\S]*?)(?=\*\*|$)/i
                  );

                  return (
                    <div className="grid gap-6">
                      {/* Total Bookings Card */}
                      {totalBookingsMatch && (
                        <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white p-6 rounded-lg shadow-lg">
                          <div className="flex items-center gap-4">
                            <div className="p-3 bg-white/20 rounded-lg">
                              <BarChart3 className="w-8 h-8" />
                            </div>
                            <div>
                              <h4 className="text-xl font-bold">
                                Total Bookings
                              </h4>
                              <p className="text-3xl font-bold">
                                {totalBookingsMatch[1]}
                              </p>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Popular Resources */}
                      {popularResourcesMatch && (
                        <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
                          <div className="flex items-center gap-2 mb-4">
                            <TrendingUp className="w-5 h-5 text-green-600" />
                            <h4 className="text-lg font-semibold text-gray-900">
                              Popular Resources
                            </h4>
                          </div>
                          <div className="space-y-3">
                            {(() => {
                              const resourceText = popularResourcesMatch[1];
                              const resourceMatches = resourceText.match(
                                /\*\*([^*]+)\*\*[^:]*:?\s*(\d+)/g
                              );
                              if (resourceMatches) {
                                return resourceMatches
                                  .map((match, index) => {
                                    const nameMatch =
                                      match.match(/\*\*([^*]+)\*\*/);
                                    const countMatch = match.match(/(\d+)/);
                                    if (nameMatch && countMatch) {
                                      return (
                                        <div
                                          key={index}
                                          className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                                        >
                                          <span className="font-medium text-gray-900">
                                            {nameMatch[1]}
                                          </span>
                                          <span className="px-3 py-1 bg-green-100 text-green-600 rounded-full text-sm font-medium">
                                            {countMatch[1]} bookings
                                          </span>
                                        </div>
                                      );
                                    }
                                    return null;
                                  })
                                  .filter(Boolean);
                              }
                              return null;
                            })()}
                          </div>
                        </div>
                      )}

                      {/* Booking Times */}
                      {bookingTimesMatch && (
                        <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
                          <div className="flex items-center gap-2 mb-4">
                            <Users className="w-5 h-5 text-purple-600" />
                            <h4 className="text-lg font-semibold text-gray-900">
                              Peak Booking Times
                            </h4>
                          </div>
                          <div className="space-y-3">
                            {(() => {
                              const timeText = bookingTimesMatch[1];
                              const timeMatches = timeText.match(
                                /\*\*(\d+)\s*AM\*\*[^:]*:?\s*(\d+)/g
                              );
                              if (timeMatches) {
                                return timeMatches
                                  .map((match, index) => {
                                    const hourMatch =
                                      match.match(/\*\*(\d+)\s*AM\*\*/);
                                    const countMatch = match.match(/(\d+)/g);
                                    if (
                                      hourMatch &&
                                      countMatch &&
                                      countMatch.length > 1
                                    ) {
                                      return (
                                        <div
                                          key={index}
                                          className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                                        >
                                          <span className="font-medium text-gray-900">
                                            {hourMatch[1]}:00 AM
                                          </span>
                                          <span className="px-3 py-1 bg-purple-100 text-purple-600 rounded-full text-sm font-medium">
                                            {countMatch[1]} bookings
                                          </span>
                                        </div>
                                      );
                                    }
                                    return null;
                                  })
                                  .filter(Boolean);
                              }
                              return null;
                            })()}
                          </div>
                        </div>
                      )}

                      {/* Actionable Insights */}
                      {actionableMatch && (
                        <div className="bg-gradient-to-r from-green-50 to-blue-50 p-6 rounded-lg border border-green-200">
                          <div className="flex items-center gap-2 mb-4">
                            <Lightbulb className="w-5 h-5 text-green-600" />
                            <h4 className="text-lg font-semibold text-gray-900">
                              Actionable Insights
                            </h4>
                          </div>
                          <div className="prose prose-sm max-w-none">
                            <div className="whitespace-pre-wrap text-gray-700">
                              {actionableMatch[1]}
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Raw Analysis (fallback) */}
                      {!totalBookingsMatch &&
                        !popularResourcesMatch &&
                        !bookingTimesMatch && (
                          <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
                            <div className="prose max-w-none">
                              <div className="whitespace-pre-wrap text-gray-700">
                                {patternAnalysis}
                              </div>
                            </div>
                          </div>
                        )}
                    </div>
                  );
                } catch {
                  // Fallback to raw display
                  return (
                    <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
                      <div className="prose max-w-none">
                        <div className="whitespace-pre-wrap text-gray-700">
                          {patternAnalysis}
                        </div>
                      </div>
                    </div>
                  );
                }
              })()}
            </div>
          ) : (
            <div className="text-center py-12">
              <BarChart3 className="w-16 h-16 mx-auto mb-4 text-gray-400" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                No Pattern Analysis Available
              </h3>
              <p className="text-gray-500">
                Pattern analysis will appear here once booking data is
                available.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
