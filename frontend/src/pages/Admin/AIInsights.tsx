import React from "react";
import { AIInsights } from "@/components/AI/AIInsights";
import AdminProtectedRoute from "@/components/Admin/AdminProtectedRoute";

const AIInsightsPage: React.FC = () => {
  return (
    <AdminProtectedRoute>
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-7xl mx-auto px-4">
          <AIInsights />
        </div>
      </div>
    </AdminProtectedRoute>
  );
};

export default AIInsightsPage;
