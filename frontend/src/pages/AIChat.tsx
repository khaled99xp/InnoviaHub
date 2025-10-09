import React from "react";
import { AIChat } from "@/components/AI/AIChat";
import ProtectedRoute from "@/components/Auth/ProtectedRoute";

const AIChatPage: React.FC = () => {
  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-4xl mx-auto px-4">
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              AI Assistant
            </h1>
            <p className="text-gray-600">
              Get personalized help with resource booking and recommendations
            </p>
          </div>

          <div className="h-[600px]">
            <AIChat />
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
};

export default AIChatPage;
