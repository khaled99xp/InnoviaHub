import React, { useState, useContext, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  CreditCard,
  Calendar,
  Users,
  Clock,
  MapPin,
  ArrowLeft,
  CheckCircle,
} from "lucide-react";
import { UserContext } from "@/context/UserContext";
import {
  processPayment,
  calculatePrice,
  type PaymentRequest,
} from "@/api/paymentApi";
import toast from "react-hot-toast";

interface BookingDetails {
  resourceId: number;
  resourceName: string;
  resourceType: string;
  date: string;
  timeSlot: string;
  numberOfPeople: number;
  price: number;
  isBooked?: boolean;
}

const Payment: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { token } = useContext(UserContext);
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState("card");
  const [cardDetails, setCardDetails] = useState({
    cardNumber: "",
    expiryDate: "",
    cvv: "",
    cardholderName: "",
  });
  // Get booking details from navigation state
  const bookingDetails: BookingDetails = location.state?.bookingDetails || {
    resourceId: 1,
    resourceName: "Mötesrum 3",
    resourceType: "Mötesrum",
    date: "2024-11-10",
    timeSlot: "Eftermiddag",
    numberOfPeople: 6,
    price: 150,
  };

  const [calculatedPrice, setCalculatedPrice] = useState(bookingDetails.price);

  // Calculate price when component mounts
  useEffect(() => {
    const fetchPrice = async () => {
      if (token) {
        try {
          const result = await calculatePrice(
            token,
            bookingDetails.resourceId,
            bookingDetails.timeSlot
          );
          if (result.success && result.data) {
            setCalculatedPrice(result.data.price);
          }
        } catch (error) {
          console.error("Error calculating price:", error);
        }
      }
    };
    fetchPrice();
  }, [token, bookingDetails.resourceId, bookingDetails.timeSlot]);

  const handlePayment = async () => {
    if (!token) {
      toast.error("Du måste vara inloggad för att betala");
      return;
    }

    setIsProcessing(true);

    try {
      const paymentRequest: PaymentRequest = {
        resourceId: bookingDetails.resourceId,
        bookingDate: bookingDetails.date,
        timeslot: bookingDetails.timeSlot,
        paymentMethod: paymentMethod,
        cardNumber: cardDetails.cardNumber,
        expiryDate: cardDetails.expiryDate,
        cvv: cardDetails.cvv,
        cardholderName: cardDetails.cardholderName,
      };

      const result = await processPayment(token, paymentRequest);

      if (result.success) {
        setPaymentSuccess(true);
        toast.success("Betalning lyckades! Din bokning är bekräftad.");

        // Redirect to booking confirmation after 2 seconds
        setTimeout(() => {
          navigate("/my-bookings", {
            state: {
              message: "Bokning bekräftad! Du får en bekräftelse via e-post.",
            },
          });
        }, 2000);
      } else {
        toast.error(result.message || "Betalning misslyckades");
      }
    } catch (error) {
      console.error("Payment error:", error);
      toast.error("Ett fel uppstod under betalningen");
    } finally {
      setIsProcessing(false);
    }
  };

  const formatCardNumber = (value: string) => {
    return value
      .replace(/\s/g, "")
      .replace(/(.{4})/g, "$1 ")
      .trim();
  };

  const formatExpiryDate = (value: string) => {
    return value.replace(/\D/g, "").replace(/(.{2})/, "$1/");
  };

  if (paymentSuccess) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full text-center">
          <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Betalning lyckades!
          </h2>
          <p className="text-gray-600 mb-4">
            Din bokning har bekräftats och du får en bekräftelse via e-post.
          </p>
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500 mx-auto"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center text-blue-600 hover:text-blue-800 mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Tillbaka till bokning
          </button>
          <h1 className="text-3xl font-bold text-gray-900">
            Slutför din bokning
          </h1>
          <p className="text-gray-600 mt-2">
            Bekräfta dina uppgifter och betala för din bokning
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Booking Summary */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
              <Calendar className="w-5 h-5 mr-2 text-blue-600" />
              Bokningssammanfattning
            </h2>

            <div className="space-y-4">
              <div className="flex items-center justify-between py-3 border-b border-gray-200">
                <div className="flex items-center">
                  <MapPin className="w-4 h-4 text-gray-500 mr-2" />
                  <span className="text-gray-600">Resurs:</span>
                </div>
                <span className="font-medium">
                  {bookingDetails.resourceName}
                </span>
              </div>

              <div className="flex items-center justify-between py-3 border-b border-gray-200">
                <div className="flex items-center">
                  <Calendar className="w-4 h-4 text-gray-500 mr-2" />
                  <span className="text-gray-600">Datum:</span>
                </div>
                <span className="font-medium">{bookingDetails.date}</span>
              </div>

              <div className="flex items-center justify-between py-3 border-b border-gray-200">
                <div className="flex items-center">
                  <Clock className="w-4 h-4 text-gray-500 mr-2" />
                  <span className="text-gray-600">Tid:</span>
                </div>
                <span className="font-medium">
                  {bookingDetails.timeSlot === "FM"
                    ? "08:00-12:00"
                    : bookingDetails.timeSlot === "EF"
                    ? "12:00-16:00"
                    : bookingDetails.timeSlot}
                </span>
              </div>

              <div className="flex items-center justify-between py-3 border-b border-gray-200">
                <div className="flex items-center">
                  <Users className="w-4 h-4 text-gray-500 mr-2" />
                  <span className="text-gray-600">Antal personer:</span>
                </div>
                <span className="font-medium">
                  {bookingDetails.numberOfPeople}
                </span>
              </div>

              <div className="flex items-center justify-between py-3">
                <span className="text-lg font-semibold">Total:</span>
                <span className="text-xl font-bold text-blue-600">
                  {calculatedPrice} SEK
                </span>
              </div>
            </div>
          </div>

          {/* Payment Form */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
              <CreditCard className="w-5 h-5 mr-2 text-blue-600" />
              Betalningsuppgifter
            </h2>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                handlePayment();
              }}
              className="space-y-6"
            >
              {/* Payment Method Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Betalningsmetod
                </label>
                <div className="space-y-2">
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="paymentMethod"
                      value="card"
                      checked={paymentMethod === "card"}
                      onChange={(e) => setPaymentMethod(e.target.value)}
                      className="mr-2"
                    />
                    <CreditCard className="w-4 h-4 mr-2" />
                    Kreditkort
                  </label>
                </div>
              </div>

              {/* Card Details */}
              {paymentMethod === "card" && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Kortnummer
                    </label>
                    <input
                      type="text"
                      value={cardDetails.cardNumber}
                      onChange={(e) =>
                        setCardDetails({
                          ...cardDetails,
                          cardNumber: formatCardNumber(e.target.value),
                        })
                      }
                      placeholder="1234 5678 9012 3456"
                      maxLength={19}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Utgångsdatum
                      </label>
                      <input
                        type="text"
                        value={cardDetails.expiryDate}
                        onChange={(e) =>
                          setCardDetails({
                            ...cardDetails,
                            expiryDate: formatExpiryDate(e.target.value),
                          })
                        }
                        placeholder="MM/ÅÅ"
                        maxLength={5}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        CVV
                      </label>
                      <input
                        type="text"
                        value={cardDetails.cvv}
                        onChange={(e) =>
                          setCardDetails({
                            ...cardDetails,
                            cvv: e.target.value.replace(/\D/g, ""),
                          })
                        }
                        placeholder="123"
                        maxLength={4}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Kortinnehavarens namn
                    </label>
                    <input
                      type="text"
                      value={cardDetails.cardholderName}
                      onChange={(e) =>
                        setCardDetails({
                          ...cardDetails,
                          cardholderName: e.target.value,
                        })
                      }
                      placeholder="Namn som står på kortet"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>
                </div>
              )}

              {/* Terms and Conditions */}
              <div className="flex items-start">
                <input
                  type="checkbox"
                  id="terms"
                  className="mt-1 mr-2"
                  required
                />
                <label htmlFor="terms" className="text-sm text-gray-600">
                  Jag accepterar{" "}
                  <a href="#" className="text-blue-600 hover:underline">
                    användarvillkoren
                  </a>{" "}
                  och{" "}
                  <a href="#" className="text-blue-600 hover:underline">
                    integritetspolicyn
                  </a>
                </label>
              </div>

              {/* Payment Button */}
              <button
                type="submit"
                disabled={isProcessing}
                className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium flex items-center justify-center"
              >
                {isProcessing ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Bearbetar betalning...
                  </>
                ) : (
                  `Bekräfta och betala ${calculatedPrice} SEK`
                )}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Payment;
