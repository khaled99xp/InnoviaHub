import { API_BASE_URL } from "../utils/constants";
import type { ApiResult } from "../types/ApiResult";

export interface PaymentRequest {
  resourceId: number;
  bookingDate: string;
  timeslot: string;
  paymentMethod: string;
  cardNumber: string;
  expiryDate: string;
  cvv: string;
  cardholderName: string;
}

export interface PaymentResponse {
  success: boolean;
  message: string;
  bookingId?: number;
}

export interface PriceCalculation {
  price: number;
  basePrice: number;
  timeslotMultiplier: number;
  resourceMultiplier: number;
}

export const processPayment = async (
  token: string,
  paymentRequest: PaymentRequest
): Promise<ApiResult<PaymentResponse>> => {
  try {
    console.log(
      "Processing payment with token:",
      token ? "Token present" : "No token"
    );
    console.log("Payment request:", paymentRequest);
    console.log("API URL:", `${API_BASE_URL}/payment/process`);

    const response = await fetch(`${API_BASE_URL}/payment/process`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(paymentRequest),
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        success: false,
        message: data.message || "Payment processing failed",
      };
    }

    return {
      success: true,
      data: data,
    };
  } catch (error) {
    console.error("Payment processing error:", error);
    return {
      success: false,
      message: "Network error during payment processing",
    };
  }
};

export const calculatePrice = async (
  token: string,
  resourceId: number,
  timeslot: string
): Promise<ApiResult<PriceCalculation>> => {
  try {
    const response = await fetch(
      `${API_BASE_URL}/payment/calculate-price?resourceId=${resourceId}&timeslot=${encodeURIComponent(
        timeslot
      )}`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    const data = await response.json();

    if (!response.ok) {
      return {
        success: false,
        message: data.message || "Price calculation failed",
      };
    }

    return {
      success: true,
      data: data,
    };
  } catch (error) {
    console.error("Price calculation error:", error);
    return {
      success: false,
      message: "Network error during price calculation",
    };
  }
};
