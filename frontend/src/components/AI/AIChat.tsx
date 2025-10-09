import React, { useState, useEffect, useRef, useContext } from "react";
import {
  Send,
  Bot,
  User,
  Loader2,
  Target,
  Sun,
  Sunset,
  Moon,
  Clock3,
  Building,
  Laptop,
  Headphones,
  Cpu,
  CalendarDays,
  HelpCircle,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import {
  sendChatMessage,
  getChatSuggestions,
  type ChatMessage,
  type ChatResponse,
} from "@/api/aiApi";
import { searchResources, checkResourceAvailability } from "@/api/resourceApi";
import { calculatePrice } from "@/api/paymentApi";
import { UserContext } from "@/context/UserContext";
import toast from "react-hot-toast";

interface AIChatProps {
  className?: string;
}

export const AIChat: React.FC<AIChatProps> = ({ className = "" }) => {
  const [messages, setMessages] = useState<
    Array<{ id: string; content: string; isUser: boolean; timestamp: Date }>
  >([]);
  const [inputMessage, setInputMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [sessionId, setSessionId] = useState<string>("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { token } = useContext(UserContext);
  const navigate = useNavigate();

  useEffect(() => {
    if (token) {
      loadSuggestions();
    }
  }, [token]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const extractConversationData = (
    messages: Array<{
      id: string;
      content: string;
      isUser: boolean;
      timestamp: Date;
    }>,
    currentMessage: string
  ) => {
    const allMessages = [
      ...messages,
      {
        id: "current",
        content: currentMessage,
        isUser: true,
        timestamp: new Date(),
      },
    ];

    let numberOfPeople: number | undefined;
    let date: string | undefined;
    let timeSlot: string | undefined;

    // Extract number of people
    for (const msg of allMessages) {
      if (msg.isUser) {
        const content = msg.content.toLowerCase();
        // Look for numbers followed by people-related words
        const numberMatch = content.match(
          /(\d+)\s*(personer?|person|människor?|people|personer)/
        );
        if (numberMatch) {
          numberOfPeople = parseInt(numberMatch[1]);
        } else {
          // Also check for just numbers (in case user just says "2" or "5")
          const simpleNumberMatch = content.match(/^(\d+)$/);
          if (simpleNumberMatch) {
            numberOfPeople = parseInt(simpleNumberMatch[1]);
          }
        }
      }
    }

    // Extract date
    for (const msg of allMessages) {
      if (msg.isUser) {
        const content = msg.content.toLowerCase();
        // Look for date patterns with fuzzy matching for typos
        const dateMatch = content.match(
          /(\d+)\s*(november|novmber|novmber|december|decembr|januari|januar|februari|februar|mars|april|maj|juni|juli|augusti|august|september|septembr|oktober|oktobr)/
        );
        if (dateMatch) {
          const day = dateMatch[1];
          const month = dateMatch[2];

          // Normalize month names (handle typos)
          const normalizeMonth = (month: string) => {
            if (month.includes("novmber") || month.includes("novmber"))
              return "november";
            if (month.includes("decembr")) return "december";
            if (month.includes("januar")) return "januari";
            if (month.includes("februar")) return "februari";
            if (month.includes("august")) return "augusti";
            if (month.includes("septembr")) return "september";
            if (month.includes("oktobr")) return "oktober";
            return month;
          };

          const normalizedMonth = normalizeMonth(month);

          // Convert to ISO date format (simplified)
          const monthMap: { [key: string]: string } = {
            januari: "01",
            februari: "02",
            mars: "03",
            april: "04",
            maj: "05",
            juni: "06",
            juli: "07",
            augusti: "08",
            september: "09",
            oktober: "10",
            november: "11",
            december: "12",
          };
          const currentYear = new Date().getFullYear();
          date = `${currentYear}-${monthMap[normalizedMonth]}-${day.padStart(
            2,
            "0"
          )}`;
        }
      }
    }

    // Extract time slot
    for (const msg of allMessages) {
      if (msg.isUser) {
        const content = msg.content.toLowerCase();
        if (content.includes("förmiddag") || content.includes("morning")) {
          timeSlot = "Förmiddag";
        } else if (
          content.includes("eftermiddag") ||
          content.includes("afternoon")
        ) {
          timeSlot = "Eftermiddag";
        }
      }
    }

    console.log("Extracted conversation data:", {
      numberOfPeople,
      date,
      timeSlot,
    });
    return { numberOfPeople, date, timeSlot };
  };

  const loadSuggestions = async () => {
    try {
      const suggestionsData = await getChatSuggestions(token);
      setSuggestions(suggestionsData);
    } catch (error) {
      console.error("Failed to load suggestions:", error);
    }
  };

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || isLoading || !token) return;

    const userMessage = inputMessage.trim();
    setInputMessage("");
    setIsLoading(true);

    // Add user message to chat
    const newUserMessage = {
      id: Date.now().toString(),
      content: userMessage,
      isUser: true,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, newUserMessage]);

    try {
      const chatRequest: ChatMessage = {
        message: userMessage,
        sessionId: sessionId || undefined,
        context: "user_chat",
      };

      const response: ChatResponse = await sendChatMessage(chatRequest, token);

      // Update session ID if provided
      if (response.sessionId && !sessionId) {
        setSessionId(response.sessionId);
      }

      // Check if this is a booking recommendation response
      const isBookingRecommendation =
        response.response &&
        (response.response.toLowerCase().includes("rekommenderar jag") ||
          response.response.toLowerCase().includes("gå till bokningssidan") ||
          response.response
            .toLowerCase()
            .includes("du kan gå till bokningssidan") ||
          response.response.toLowerCase().includes("slutföra din bokning") ||
          response.response.toLowerCase().includes("bokningssidan"));

      // Only add AI response if it's NOT a booking recommendation
      if (!isBookingRecommendation) {
        const aiMessage = {
          id: (Date.now() + 1).toString(),
          content: response.response,
          isUser: false,
          timestamp: new Date(response.timestamp),
        };
        setMessages((prev) => [...prev, aiMessage]);
      }

      // Update suggestions if provided
      if (response.suggestions && response.suggestions.length > 0) {
        setSuggestions(response.suggestions);
      }

      // Only show booking helper when AI has given final recommendations and is ready to proceed with booking
      const isReadyForBooking =
        response.response &&
        (response.response.toLowerCase().includes("rekommenderar jag") ||
          response.response.toLowerCase().includes("passar bäst för dig") ||
          response.response.toLowerCase().includes("gå till bokningssidan") ||
          response.response
            .toLowerCase()
            .includes("du kan gå till bokningssidan") ||
          response.response.toLowerCase().includes("slutföra din bokning") ||
          response.response.toLowerCase().includes("bokningssidan") ||
          response.response
            .toLowerCase()
            .includes("kan gå till bokningssidan") ||
          response.response
            .toLowerCase()
            .includes("för att slutföra din bokning")) &&
        !response.response.toLowerCase().includes("behöver du hjälp") &&
        !response.response.toLowerCase().includes("kan jag hjälpa dig");

      console.log("AI Response:", response.response);
      console.log("isReadyForBooking:", isReadyForBooking);

      // Additional fallback detection
      const hasRecommendation = response.response
        .toLowerCase()
        .includes("rekommenderar jag");
      const hasBookingDirection = response.response
        .toLowerCase()
        .includes("bokningssidan");
      const hasSlutföra = response.response.toLowerCase().includes("slutföra");

      console.log("hasRecommendation:", hasRecommendation);
      console.log("hasBookingDirection:", hasBookingDirection);
      console.log("hasSlutföra:", hasSlutföra);

      // Fallback detection if main logic fails
      const fallbackReady =
        hasRecommendation && (hasBookingDirection || hasSlutföra);
      console.log("fallbackReady:", fallbackReady);

      // Add booking helper message directly to chat when AI is ready
      if (isReadyForBooking || fallbackReady) {
        console.log("Adding booking helper to chat!");
        // Extract conversation data
        const extractedData = extractConversationData(messages, userMessage);
        console.log("Extracted data:", extractedData);

        // Detect resource type from conversation context
        let resourceType = "";
        if (
          userMessage.toLowerCase().includes("mötesrum") ||
          messages.some((msg) => msg.content.toLowerCase().includes("mötesrum"))
        ) {
          resourceType = "mötesrum";
        } else if (
          userMessage.toLowerCase().includes("skrivbord") ||
          messages.some((msg) =>
            msg.content.toLowerCase().includes("skrivbord")
          )
        ) {
          resourceType = "skrivbord";
        } else if (
          userMessage.toLowerCase().includes("vr") ||
          messages.some((msg) => msg.content.toLowerCase().includes("vr"))
        ) {
          resourceType = "vr";
        }

        // Add combined booking helper message to chat
        const bookingHelperMessage = {
          id: (Date.now() + 2).toString(),
          content: `**Redo att boka!**

Jag har hittat en lämplig resurs baserat på dina behov. Du kan slutföra bokningen direkt här.

**Din bokning:**
${
  extractedData.numberOfPeople ? `${extractedData.numberOfPeople} personer` : ""
}
${
  extractedData.date
    ? `${new Date(extractedData.date).toLocaleDateString("sv-SE")}`
    : ""
}
${extractedData.timeSlot ? `${extractedData.timeSlot}` : ""}
${resourceType ? `${resourceType}` : ""}

**Tillgängliga resurser:**
Verifierar tillgänglighet...`,
          isUser: false,
          timestamp: new Date(),
        };

        setMessages((prev) => [...prev, bookingHelperMessage]);

        // Enrich the chat with actually available resources for the selected date/timeslot
        (async () => {
          try {
            const token = localStorage.getItem("token");
            if (!token) return;

            // Map UI resource type to backend search type
            let searchType = "";
            if (resourceType === "mötesrum") searchType = "MeetingRoom";
            else if (resourceType === "skrivbord") searchType = "DropInDesk";
            else if (resourceType === "vr") searchType = "VRset";

            const dateStr =
              extractedData.date || new Date().toISOString().split("T")[0];
            const normalizedSlot = extractedData.timeSlot
              ? /förmiddag|morning/i.test(extractedData.timeSlot)
                ? "FM"
                : /eftermiddag|afternoon/i.test(extractedData.timeSlot)
                ? "EF"
                : extractedData.timeSlot
              : "FM";

            const candidates = await searchResources(token, searchType);
            const checks = await Promise.all(
              candidates.map(async (r) => ({
                r,
                ok: await checkResourceAvailability(
                  token,
                  r.resourceId,
                  dateStr,
                  normalizedSlot
                ),
              }))
            );
            const available = checks.filter((x) => x.ok).map((x) => x.r);

            // Update the existing message with the complete content
            const completeContent = `**Redo att boka!**

**Din bokning:**
${
  extractedData.numberOfPeople ? `${extractedData.numberOfPeople} personer` : ""
}
${
  extractedData.date
    ? new Date(extractedData.date).toLocaleDateString("sv-SE")
    : ""
}
${extractedData.timeSlot ? `${extractedData.timeSlot}` : ""}
${resourceType ? `${resourceType}` : ""}

${
  available.length > 0
    ? `**Tillgängliga resurser:**\n${available
        .map((r) => `- ${r.name}`)
        .join(
          "\n"
        )}\n\n**Vad vill du göra?**\n1. Slutför bokning direkt\n2. Gå till bokningssida\n3. Behöver du hjälp med något annat?`
    : `**Inga resurser tillgängliga för valt datum/tid.**`
}`;

            // Update the existing message instead of adding a new one
            setMessages((prev) =>
              prev.map((msg) =>
                msg.id === bookingHelperMessage.id
                  ? { ...msg, content: completeContent }
                  : msg
              )
            );
          } catch (e) {
            console.warn("Failed to enrich availability list", e);
          }
        })();
      }

      // Only show booking helper when AI asks specific questions, not for general mentions
      // This logic is now handled by the AI response detection above
    } catch (error) {
      console.error("Failed to send message:", error);
      const errorMessage = {
        id: (Date.now() + 1).toString(),
        content: "Sorry, I encountered an error. Please try again.",
        isUser: false,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    setInputMessage(suggestion);
  };

  const handleBookingAction = (action: string) => {
    if (action === "1") {
      // Slutför bokning direkt
      // Extract booking details from the current conversation
      const extractedData = extractConversationData(messages, inputMessage);
      console.log("Extracted data for payment:", extractedData);

      // Search for resources based on the conversation
      const searchResourcesAsync = async () => {
        try {
          const token = localStorage.getItem("token");
          if (!token) {
            console.error("No token found");
            return;
          }

          // Determine resource type from conversation
          let resourceType = "";
          if (
            messages.some((msg) =>
              msg.content.toLowerCase().includes("mötesrum")
            )
          ) {
            resourceType = "MeetingRoom";
          } else if (
            messages.some((msg) =>
              msg.content.toLowerCase().includes("skrivbord")
            )
          ) {
            resourceType = "DropInDesk";
          } else if (
            messages.some((msg) => msg.content.toLowerCase().includes("vr"))
          ) {
            resourceType = "VRset";
          } else if (
            messages.some((msg) =>
              msg.content.toLowerCase().includes("ai server")
            )
          ) {
            resourceType = "AIserver";
          }

          console.log("Resource type:", resourceType);

          // Search for resources
          const resources = await searchResources(token, resourceType);
          console.log("Found resources:", resources);

          // Filter by availability via backend endpoint
          const desiredDate =
            extractedData.date || new Date().toISOString().split("T")[0];
          const desiredTimeslot = extractedData.timeSlot || "FM"; // FM/EF

          // Guard: prevent booking in an already-started slot for the same day (Europe/Stockholm)
          try {
            const now = new Date();
            const stockholmFormatter = new Intl.DateTimeFormat("sv-SE", {
              timeZone: "Europe/Stockholm",
              year: "numeric",
              month: "2-digit",
              day: "2-digit",
              hour: "2-digit",
              minute: "2-digit",
              hour12: false,
            });
            const nowStr = stockholmFormatter.format(now); // yyyy-mm-dd HH:mm
            const [todayKey, timePart] = nowStr.split(" ");
            const desiredKey = new Date(desiredDate).toLocaleDateString(
              "sv-SE",
              {
                timeZone: "Europe/Stockholm",
                year: "numeric",
                month: "2-digit",
                day: "2-digit",
              }
            );

            if (desiredKey === todayKey) {
              const currentHour = parseInt(timePart.split(":")[0], 10);
              if (desiredTimeslot === "FM" && currentHour >= 8) {
                toast.error(
                  "Förmiddag idag har redan börjat. Välj Eftermiddag eller ett annat datum."
                );
                return;
              }
              if (desiredTimeslot === "EF" && currentHour >= 12) {
                toast.error(
                  "Eftermiddag idag har redan börjat. Välj ett annat datum."
                );
                return;
              }
            }
          } catch (e) {
            console.warn("Same-day slot guard failed:", e);
          }

          const availabilityChecks = await Promise.all(
            resources.map(async (r) => ({
              resource: r,
              available: await checkResourceAvailability(
                token,
                r.resourceId,
                desiredDate,
                desiredTimeslot
              ),
            }))
          );

          const availableResources = availabilityChecks
            .filter((x) => x.available)
            .map((x) => x.resource);
          console.log("Available filtered resources:", availableResources);

          if (availableResources.length > 0) {
            const selectedResource = availableResources[0]; // pick first available
            console.log("Selected resource:", selectedResource);

            // Calculate price
            const priceResult = await calculatePrice(
              token,
              selectedResource.resourceId,
              desiredTimeslot
            );
            console.log("Price result:", priceResult);

            if (priceResult.success && priceResult.data) {
              const bookingDetails = {
                resourceId: selectedResource.resourceId,
                resourceName: selectedResource.name,
                resourceType: selectedResource.resourceTypeName,
                date: desiredDate,
                timeSlot: desiredTimeslot,
                numberOfPeople: extractedData.numberOfPeople || 1,
                price: priceResult.data.price,
                isBooked: false,
              };

              console.log("Booking details:", bookingDetails);

              navigate("/payment", {
                state: {
                  bookingDetails: bookingDetails,
                },
              });
            } else {
              console.error("Price calculation failed:", priceResult.message);
              toast.error("Kunde inte beräkna pris. Försök igen.");
            }
          } else {
            console.error("No available resources for desired date/timeslot");
            toast.error(
              "Inga resurser är tillgängliga för valt datum/tid. Välj ett annat datum eller tid."
            );
          }
        } catch (error) {
          console.error("Error in searchResources:", error);
          toast.error("Ett fel uppstod. Försök igen.");
        }
      };

      searchResourcesAsync();
    } else if (action === "2") {
      // Gå till bokningssida
      navigate("/booking");
    } else if (action === "3") {
      // Behöver du hjälp med något annat?
      setInputMessage("Behöver du hjälp med något annat?");
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div
      className={`flex flex-col h-full bg-white rounded-lg shadow-lg ${className}`}
    >
      {/* Chat Header */}
      <div className="flex items-center gap-3 p-4 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50">
        <div className="flex items-center justify-center w-10 h-10 bg-blue-500 rounded-full">
          <Bot className="w-6 h-6 text-white" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-gray-900">AI Assistant</h3>
          <p className="text-sm text-gray-600">
            Ask me about resources and bookings
          </p>
        </div>
      </div>

      {/* Messages Container */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="text-center text-gray-500 py-8">
            <Bot className="w-12 h-12 mx-auto mb-4 text-gray-400" />
            <p className="text-lg font-medium mb-2">
              Välkommen till AI-assistenten!
            </p>
            <p className="text-sm">
              Jag kan hjälpa dig hitta resurser, göra bokningar och svara på
              frågor.
            </p>
          </div>
        )}

        {messages.map((message, index) => (
          <div key={message.id}>
            <div
              className={`flex ${
                message.isUser ? "justify-end" : "justify-start"
              }`}
            >
              <div
                className={`flex items-start gap-3 max-w-xs lg:max-w-md ${
                  message.isUser ? "flex-row-reverse" : "flex-row"
                }`}
              >
                <div
                  className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                    message.isUser ? "bg-blue-500" : "bg-gray-100"
                  }`}
                >
                  {message.isUser ? (
                    <User className="w-4 h-4 text-white" />
                  ) : (
                    <Bot className="w-4 h-4 text-gray-600" />
                  )}
                </div>
                <div
                  className={`px-4 py-2 rounded-lg ${
                    message.isUser
                      ? "bg-blue-500 text-white"
                      : "bg-gray-100 text-gray-900"
                  }`}
                >
                  <p className="text-sm">{message.content}</p>
                  <p
                    className={`text-xs mt-1 ${
                      message.isUser ? "text-blue-100" : "text-gray-500"
                    }`}
                  >
                    {message.timestamp.toLocaleTimeString()}
                  </p>
                </div>
              </div>
            </div>

            {/* Show interactive buttons after AI messages */}
            {!message.isUser && index === messages.length - 1 && (
              <div className="mt-2 ml-11">
                {/* Time Slot Options - Only show when asking about time */}
                {message.content
                  .toLowerCase()
                  .includes("vilken tid föredrar du") ||
                message.content
                  .toLowerCase()
                  .includes("förmiddag eller eftermiddag") ? (
                  <div className="mb-3">
                    <p className="text-xs text-gray-500 mb-2">Välj tid:</p>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => handleSuggestionClick("Förmiddag")}
                        className="px-3 py-2 text-xs bg-green-50 text-green-700 rounded-lg hover:bg-green-100 transition-colors border border-green-200 hover:border-green-300 font-medium flex items-center gap-1"
                      >
                        <Sun className="w-3 h-3" />
                        Förmiddag
                      </button>
                      <button
                        onClick={() => handleSuggestionClick("Eftermiddag")}
                        className="px-3 py-2 text-xs bg-orange-50 text-orange-700 rounded-lg hover:bg-orange-100 transition-colors border border-orange-200 hover:border-orange-300 font-medium flex items-center gap-1"
                      >
                        <Sunset className="w-3 h-3" />
                        Eftermiddag
                      </button>
                    </div>
                  </div>
                ) : null}

                {/* Extended Time Options - Only show when asking about all time options */}
                {message.content
                  .toLowerCase()
                  .includes("förmiddag, eftermiddag, kväll eller heldag") ||
                message.content
                  .toLowerCase()
                  .includes("vilken tid på dagen") ? (
                  <div className="mb-3">
                    <p className="text-xs text-gray-500 mb-2">Välj tid:</p>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => handleSuggestionClick("Förmiddag")}
                        className="px-3 py-2 text-xs bg-green-50 text-green-700 rounded-lg hover:bg-green-100 transition-colors border border-green-200 hover:border-green-300 font-medium flex items-center gap-1"
                      >
                        <Sun className="w-3 h-3" />
                        Förmiddag
                      </button>
                      <button
                        onClick={() => handleSuggestionClick("Eftermiddag")}
                        className="px-3 py-2 text-xs bg-orange-50 text-orange-700 rounded-lg hover:bg-orange-100 transition-colors border border-orange-200 hover:border-orange-300 font-medium flex items-center gap-1"
                      >
                        <Sunset className="w-3 h-3" />
                        Eftermiddag
                      </button>
                      <button
                        onClick={() => handleSuggestionClick("Kväll")}
                        className="px-3 py-2 text-xs bg-purple-50 text-purple-700 rounded-lg hover:bg-purple-100 transition-colors border border-purple-200 hover:border-purple-300 font-medium flex items-center gap-1"
                      >
                        <Moon className="w-3 h-3" />
                        Kväll
                      </button>
                      <button
                        onClick={() => handleSuggestionClick("Heldag")}
                        className="px-3 py-2 text-xs bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors border border-blue-200 hover:border-blue-300 font-medium flex items-center gap-1"
                      >
                        <Clock3 className="w-3 h-3" />
                        Heldag
                      </button>
                    </div>
                  </div>
                ) : null}

                {/* Resource Type Options - Only show when asking about resource type */}
                {message.content
                  .toLowerCase()
                  .includes("vilken typ av resurs") ||
                message.content.toLowerCase().includes("vilken resurs") ||
                message.content.toLowerCase().includes("vilken utrustning") ? (
                  <div className="mb-3">
                    <p className="text-xs text-gray-500 mb-2">
                      Välj resurstyp:
                    </p>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => handleSuggestionClick("Mötesrum")}
                        className="px-3 py-2 text-xs bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors border border-blue-200 hover:border-blue-300 font-medium flex items-center gap-1"
                      >
                        <Building className="w-3 h-3" />
                        Mötesrum
                      </button>
                      <button
                        onClick={() => handleSuggestionClick("Skrivbord")}
                        className="px-3 py-2 text-xs bg-green-50 text-green-700 rounded-lg hover:bg-green-100 transition-colors border border-green-200 hover:border-green-300 font-medium flex items-center gap-1"
                      >
                        <Laptop className="w-3 h-3" />
                        Skrivbord
                      </button>
                      <button
                        onClick={() => handleSuggestionClick("VR Headset")}
                        className="px-3 py-2 text-xs bg-purple-50 text-purple-700 rounded-lg hover:bg-purple-100 transition-colors border border-purple-200 hover:border-purple-300 font-medium flex items-center gap-1"
                      >
                        <Headphones className="w-3 h-3" />
                        VR Headset
                      </button>
                      <button
                        onClick={() => handleSuggestionClick("AI Server")}
                        className="px-3 py-2 text-xs bg-red-50 text-red-700 rounded-lg hover:bg-red-100 transition-colors border border-red-200 hover:border-red-300 font-medium flex items-center gap-1"
                      >
                        <Cpu className="w-3 h-3" />
                        AI Server
                      </button>
                    </div>
                  </div>
                ) : null}

                {/* Number of People Options - Only show when asking about number of people */}
                {message.content.toLowerCase().includes("hur många personer") ||
                message.content.toLowerCase().includes("antal personer") ||
                message.content.toLowerCase().includes("personer planerar") ||
                message.content.toLowerCase().includes("personer behöver") ||
                message.content
                  .toLowerCase()
                  .includes("för hur många personer") ? (
                  <div className="mb-3">
                    <p className="text-xs text-gray-500 mb-2">
                      Antal personer:
                    </p>
                    <div className="grid grid-cols-4 gap-1">
                      {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((num) => (
                        <button
                          key={num}
                          onClick={() => handleSuggestionClick(num.toString())}
                          className="px-2 py-1 text-xs bg-gray-50 text-gray-700 rounded hover:bg-gray-100 transition-colors border border-gray-200 hover:border-gray-300 font-medium"
                        >
                          {num}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : null}

                {/* Booking Action Options - Only show when booking helper is displayed */}
                {message.content.includes("**Vad vill du göra?**") ? (
                  <div className="mb-3">
                    <p className="text-xs text-gray-500 mb-2">
                      Välj en åtgärd:
                    </p>
                    <div className="space-y-2">
                      <button
                        onClick={() => handleBookingAction("1")}
                        className="w-full px-4 py-2 text-sm bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors font-medium flex items-center justify-center gap-2"
                      >
                        <Target className="w-4 h-4" />
                        Slutför bokning direkt
                      </button>
                      <button
                        onClick={() => handleBookingAction("2")}
                        className="w-full px-4 py-2 text-sm bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors font-medium flex items-center justify-center gap-2"
                      >
                        <CalendarDays className="w-4 h-4" />
                        Gå till bokningssida
                      </button>
                      <button
                        onClick={() => handleBookingAction("3")}
                        className="w-full px-4 py-2 text-sm bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors font-medium flex items-center justify-center gap-2"
                      >
                        <HelpCircle className="w-4 h-4" />
                        Behöver du hjälp med något annat?
                      </button>
                    </div>
                  </div>
                ) : null}
              </div>
            )}
          </div>
        ))}

        {isLoading && (
          <div className="flex justify-start">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
                <Bot className="w-4 h-4 text-gray-600" />
              </div>
              <div className="bg-gray-100 px-4 py-2 rounded-lg">
                <div className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span className="text-sm text-gray-600">AI tänker...</span>
                </div>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Suggestions */}
      {suggestions.length > 0 && (
        <div className="p-4 border-t border-gray-200">
          <p className="text-sm text-gray-600 mb-2">Snabbförslag:</p>
          <div className="flex flex-wrap gap-2">
            {suggestions.map((suggestion, index) => (
              <button
                key={index}
                onClick={() => handleSuggestionClick(suggestion)}
                className="px-4 py-2 text-sm bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors border border-blue-200 hover:border-blue-300 font-medium"
              >
                {suggestion}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input Area */}
      <div className="p-4 border-t border-gray-200">
        <div className="flex gap-2">
          <input
            type="text"
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Fråga mig om resurser..."
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            disabled={isLoading}
          />
          <button
            onClick={handleSendMessage}
            disabled={!inputMessage.trim() || isLoading}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
