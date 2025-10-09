import React, { useState, useContext } from "react";
import { Calendar, Users, Clock, MapPin, X, CreditCard } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { UserContext } from "@/context/UserContext";
import {
  searchResources,
  fetchResources,
  checkResourceAvailability,
} from "@/api/resourceApi";
import { calculatePrice } from "@/api/paymentApi";
import toast from "react-hot-toast";

interface BookingHelperProps {
  onNavigateToBooking: () => void;
  onDismiss: () => void;
  resourceType?: string;
  conversationData?: {
    numberOfPeople?: number;
    date?: string;
    timeSlot?: string;
  };
  onUpdateConversationData?: (data: any) => void;
}

export const BookingHelper: React.FC<BookingHelperProps> = ({
  onNavigateToBooking,
  onDismiss,
  resourceType,
  conversationData,
  onUpdateConversationData,
}) => {
  const navigate = useNavigate();
  const { token } = useContext(UserContext);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedResource, setSelectedResource] = useState<any>(null);
  const [calculatedPrice, setCalculatedPrice] = useState<number | null>(null);

  const handleDirectToPayment = async () => {
    console.log("BookingHelper - conversationData:", conversationData);
    if (!token || !conversationData) {
      toast.error("Missing booking information");
      return;
    }

    setIsLoading(true);
    try {
      // Search for suitable resources
      let resources = await searchResources(token, resourceType || "mötesrum");

      // If no resources found for specific type, try broader search
      if (resources.length === 0) {
        console.log(
          "No resources found for type:",
          resourceType,
          "trying broader search"
        );
        // Try different variations
        const variations = ["mötesrum", "meeting", "rum", "room"];
        for (const variation of variations) {
          resources = await searchResources(token, variation);
          if (resources.length > 0) {
            console.log("Found resources with variation:", variation);
            break;
          }
        }
      }

      if (resources.length === 0) {
        console.log("No resources found at all, trying to get all resources");
        // Last resort: get all resources
        const allResources = await fetchResources(token);
        if (allResources.length > 0) {
          resources = allResources.slice(0, 3); // Take first 3
          console.log("Using all resources as fallback:", resources);
        } else {
          console.log("No resources found at all");
          toast.error("Inga lämpliga resurser hittades. Försök igen senare.");
          return;
        }
      }

      console.log("Found resources:", resources);

      // Find an available resource
      let selectedResource = null;
      for (const resource of resources) {
        console.log("Checking availability for resource:", resource.name);

        // Check if resource is available for the specific date and time
        const isAvailable = await checkResourceAvailability(
          token,
          resource.resourceId,
          conversationData.date || new Date().toISOString().split("T")[0],
          conversationData.timeSlot || "Förmiddag"
        );

        console.log(`Resource ${resource.name} availability:`, isAvailable);

        if (isAvailable) {
          selectedResource = resource;
          break;
        }
      }

      if (!selectedResource) {
        console.log("No available resources found, trying alternative times");

        // Try alternative times (if morning, try afternoon and vice versa)
        const alternativeTimes =
          conversationData.timeSlot === "Förmiddag"
            ? ["Eftermiddag"]
            : ["Förmiddag"];

        for (const altTime of alternativeTimes) {
          console.log(`Trying alternative time: ${altTime}`);

          for (const resource of resources) {
            const isAvailable = await checkResourceAvailability(
              token,
              resource.resourceId,
              conversationData.date || new Date().toISOString().split("T")[0],
              altTime
            );

            if (isAvailable) {
              selectedResource = resource;
              // Update conversation data with alternative time
              if (onUpdateConversationData) {
                onUpdateConversationData({
                  ...conversationData,
                  timeSlot: altTime,
                });
              }
              toast.success(`Hittade tillgänglig tid: ${altTime}`);
              break;
            }
          }

          if (selectedResource) break;
        }

        if (!selectedResource) {
          toast.error(
            "Inga tillgängliga resurser hittades för den valda tiden. Försök med en annan tid eller datum."
          );
          return;
        }
      }

      setSelectedResource(selectedResource);

      // Calculate price
      const priceResult = await calculatePrice(
        token,
        selectedResource.resourceId,
        conversationData.timeSlot || "Förmiddag"
      );

      if (!priceResult.success) {
        console.log("Price calculation failed:", priceResult.message);
        toast.error("Kunde inte beräkna pris. Använder standardpris.");
      } else {
        setCalculatedPrice(priceResult.data?.price || null);
      }

      // Prepare booking details for payment page
      const bookingDetails = {
        resourceId: selectedResource.resourceId,
        resourceName: selectedResource.name,
        resourceType: selectedResource.resourceTypeName || "Mötesrum",
        bookingDate:
          conversationData.date ||
          (() => {
            // If no date provided, use tomorrow as fallback
            const tomorrow = new Date();
            tomorrow.setDate(tomorrow.getDate() + 1);
            return tomorrow.toISOString().split("T")[0];
          })(),
        timeslot: conversationData.timeSlot || "Förmiddag",
        numberOfPeople: conversationData.numberOfPeople || 1,
        price: priceResult.data?.price || 150,
      };

      console.log("Prepared booking details:", bookingDetails);

      // Navigate to payment page with prepared data
      navigate("/payment", { state: { bookingDetails } });
    } catch (error) {
      console.error("Error preparing booking:", error);
      toast.error("Failed to prepare booking");
    } finally {
      setIsLoading(false);
    }
  };
  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4 relative">
      <button
        onClick={onDismiss}
        className="absolute top-2 right-2 p-1 hover:bg-blue-100 rounded-full transition-colors"
        aria-label="Dismiss"
      >
        <X className="w-4 h-4 text-blue-600" />
      </button>

      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
          <Calendar className="w-4 h-4 text-white" />
        </div>
        <div className="flex-1">
          <h4 className="font-semibold text-blue-900 mb-2">Redo att boka?</h4>
          <p className="text-blue-700 text-sm mb-3">
            Jag har hittat en lämplig resurs baserat på dina behov. Du kan
            slutföra bokningen direkt här.
          </p>

          {selectedResource && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
              <div className="flex items-center gap-2 text-blue-800 text-sm">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span>Resursen är tillgänglig och redo för bokning</span>
              </div>
            </div>
          )}

          {/* Selected resource info */}
          {selectedResource && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-4">
              <div className="flex items-center gap-2 text-green-800 mb-2">
                <MapPin className="w-4 h-4" />
                <span className="font-medium">Vald resurs:</span>
              </div>
              <div className="text-green-700 text-sm">
                <div className="font-medium">{selectedResource.name}</div>
                <div className="text-green-600">
                  {selectedResource.resourceTypeName}
                </div>
                <div className="text-green-600 text-xs mt-1">
                  ✅ Tillgänglig för vald tid
                </div>
                {calculatedPrice && (
                  <div className="text-green-800 font-medium mt-1">
                    Pris: {calculatedPrice} SEK
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Dynamic booking details */}
          {conversationData && (
            <div className="bg-white rounded-lg p-3 mb-4 border border-blue-200">
              <h5 className="font-medium text-blue-900 mb-2">Din bokning:</h5>
              <div className="space-y-1 text-sm text-blue-700">
                {conversationData.numberOfPeople && (
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4" />
                    <span>{conversationData.numberOfPeople} personer</span>
                  </div>
                )}
                {conversationData.date && (
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    <span>
                      {new Date(conversationData.date).toLocaleDateString(
                        "sv-SE"
                      )}
                    </span>
                  </div>
                )}
                {conversationData.timeSlot && (
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    <span>{conversationData.timeSlot}</span>
                  </div>
                )}
                {resourceType && (
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4" />
                    <span className="capitalize">{resourceType}</span>
                  </div>
                )}
                {calculatedPrice && (
                  <div className="flex items-center gap-2">
                    <CreditCard className="w-4 h-4" />
                    <span className="font-medium">{calculatedPrice} SEK</span>
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="space-y-2 mb-4">
            {resourceType === "mötesrum" && (
              <div className="flex items-center gap-2 text-sm text-blue-600">
                <Users className="w-4 h-4" />
                <span>Mötesrum: Rum 1, 2, 3, 4</span>
              </div>
            )}
            {resourceType === "skrivbord" && (
              <div className="flex items-center gap-2 text-sm text-blue-600">
                <MapPin className="w-4 h-4" />
                <span>Skrivbord: Skrivbord 1-15</span>
              </div>
            )}
            {resourceType === "vr" && (
              <div className="flex items-center gap-2 text-sm text-blue-600">
                <Clock className="w-4 h-4" />
                <span>VR-utrustning: VR Headset 1-4</span>
              </div>
            )}
            {!resourceType && (
              <>
                <div className="flex items-center gap-2 text-sm text-blue-600">
                  <Users className="w-4 h-4" />
                  <span>Mötesrum: Rum 1, 2, 3, 4</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-blue-600">
                  <MapPin className="w-4 h-4" />
                  <span>Skrivbord: Skrivbord 1-15</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-blue-600">
                  <Clock className="w-4 h-4" />
                  <span>VR-utrustning: VR Headset 1-4</span>
                </div>
              </>
            )}
          </div>

          <div className="space-y-2">
            <button
              onClick={handleDirectToPayment}
              disabled={isLoading}
              className="w-full bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600 transition-colors text-sm font-medium flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Förbereder bokning...
                </>
              ) : (
                <>
                  <CreditCard className="w-4 h-4" />
                  Slutför bokning direkt
                </>
              )}
            </button>

            <button
              onClick={onNavigateToBooking}
              className="w-full bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors text-sm font-medium"
            >
              Gå till bokningssida
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
