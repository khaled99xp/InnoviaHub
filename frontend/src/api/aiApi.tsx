import { API_BASE_URL } from "@/utils/constants";

// AI Chat Types
export interface ChatMessage {
  message: string;
  sessionId?: string;
  context?: string;
}

export interface ChatResponse {
  response: string;
  sessionId: string;
  timestamp: string;
  suggestions?: string[];
}

export interface AIInsight {
  id: number;
  title: string;
  description: string;
  insightType: string;
  data?: string;
  generatedAt: string;
  isActive: boolean;
}

export interface ResourceRecommendation {
  id: number;
  resourceId: number;
  resourceName: string;
  resourceType: string;
  recommendationType: string;
  reason: string;
  confidenceScore: number;
  generatedAt: string;
  isViewed: boolean;
}

export interface AIAnalytics {
  totalChatMessages: number;
  totalRecommendations: number;
  activeInsights: number;
  popularTopics: string[];
  usageByHour: Record<string, number>;
  recentInsights: AIInsight[];
}

// AI Chat API
export const sendChatMessage = async (
  message: ChatMessage,
  token: string
): Promise<ChatResponse> => {
  const response = await fetch(`${API_BASE_URL}/ai/chat`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(message),
  });

  if (!response.ok) {
    throw new Error("Failed to send chat message");
  }

  return await response.json();
};

// Get AI Insights
export const getAIInsights = async (token: string): Promise<AIInsight[]> => {
  const response = await fetch(`${API_BASE_URL}/ai/insights`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error("Failed to get insights");
  }

  return await response.json();
};

// Get Resource Recommendations
export const getResourceRecommendations = async (
  token: string
): Promise<ResourceRecommendation[]> => {
  const response = await fetch(`${API_BASE_URL}/ai/recommendations`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error("Failed to get recommendations");
  }

  return await response.json();
};

// Generate Resource Recommendation
export const generateRecommendation = async (
  context: string,
  token: string
): Promise<{ recommendation: string }> => {
  const response = await fetch(`${API_BASE_URL}/ai/generate-recommendation`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(context),
  });

  if (!response.ok) {
    throw new Error("Failed to generate recommendation");
  }

  return await response.json();
};

// Get AI Analytics (Admin only)
export const getAIAnalytics = async (token: string): Promise<AIAnalytics> => {
  const response = await fetch(`${API_BASE_URL}/ai/analytics`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error("Failed to get analytics");
  }

  return await response.json();
};

// Analyze Booking Patterns (Admin only)
export const analyzeBookingPatterns = async (
  token: string
): Promise<{ analysis: string }> => {
  const response = await fetch(`${API_BASE_URL}/ai/analyze-patterns`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error("Failed to analyze patterns");
  }

  return await response.json();
};

// Get Chat Suggestions
export const getChatSuggestions = async (token: string): Promise<string[]> => {
  const response = await fetch(`${API_BASE_URL}/ai/suggestions`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error("Failed to get suggestions");
  }

  return await response.json();
};



