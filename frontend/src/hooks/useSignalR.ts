import { useEffect, useRef, useState } from "react";
import * as signalR from "@microsoft/signalr";
import { SIGNALR_HUB_URL } from "../utils/constants";

interface UseSignalROptions {
  token: string | null;
  onRefreshData: () => Promise<void>;
}

export const useSignalR = ({ token, onRefreshData }: UseSignalROptions) => {
  const connectionRef = useRef<signalR.HubConnection | null>(null);
  const isConnectingRef = useRef<boolean>(false);
  const onRefreshDataRef = useRef(onRefreshData);
  const tokenRef = useRef(token);
  const connectionTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [isConnected, setIsConnected] = useState<boolean>(false);

  // Update refs when props change
  useEffect(() => {
    onRefreshDataRef.current = onRefreshData;
    tokenRef.current = token;
  }, [onRefreshData, token]);

  // Polling to check connection state
  useEffect(() => {
    if (!token) {
      setIsConnected(false);
      return;
    }

    const checkConnection = () => {
      if (connectionRef.current) {
        const currentState = connectionRef.current.state;
        const shouldBeConnected = currentState === signalR.HubConnectionState.Connected;
        
        if (shouldBeConnected !== isConnected) {
          setIsConnected(shouldBeConnected);
        }
      }
    };

    const interval = setInterval(checkConnection, 1000); // Check every second
    return () => clearInterval(interval);
  }, [token, isConnected]);

  useEffect(() => {
    if (!token) return;

    // Clear any existing timeout
    if (connectionTimeoutRef.current) {
      clearTimeout(connectionTimeoutRef.current);
    }

    // Debounce connection attempts (500ms delay)
    connectionTimeoutRef.current = setTimeout(() => {
      // Prevent multiple connections
      if (isConnectingRef.current) {
        console.log("SignalR connection already in progress, skipping");
        return;
      }

      if (
        connectionRef.current &&
        connectionRef.current.state !== signalR.HubConnectionState.Disconnected
      ) {
        console.log("SignalR connection already exists, skipping creation");
        return;
      }

      // Set connecting flag
      isConnectingRef.current = true;

    // Clean up existing connection first
    if (connectionRef.current) {
      connectionRef.current.stop();
      connectionRef.current = null;
    }

    const connection = new signalR.HubConnectionBuilder()
      .withUrl(SIGNALR_HUB_URL, {
        accessTokenFactory: () => tokenRef.current || "",
        skipNegotiation: true,
        transport: signalR.HttpTransportType.WebSockets,
      })
      .withAutomaticReconnect({
        nextRetryDelayInMilliseconds: (retryContext) => {
          if (retryContext.previousRetryCount < 3) {
            return Math.min(
              1000 * Math.pow(2, retryContext.previousRetryCount),
              30000
            );
          } else {
            return null; // Stop retrying
          }
        },
      })
      .build();

    connectionRef.current = connection;

    const start = async () => {
      try {
        if (connection.state === signalR.HubConnectionState.Disconnected) {
          await connection.start();
          console.log("SignalR connected");
          setIsConnected(true);

          connection.on("BookingCreated", () => onRefreshDataRef.current());
          connection.on("BookingUpdated", () => onRefreshDataRef.current());
          connection.on("BookingCancelled", () => onRefreshDataRef.current());
          connection.on("BookingDeleted", () => onRefreshDataRef.current());
          connection.on("ResourceUpdated", () => onRefreshDataRef.current());
        }
      } catch (err) {
        console.error("SignalR connect error:", err);
        setIsConnected(false);
        // Don't retry immediately, let automatic reconnect handle it
      } finally {
        isConnectingRef.current = false;
      }
    };

    // Add connection state change handlers
    connection.onclose((error) => {
      setIsConnected(false);
      if (error) {
        console.log("SignalR connection closed due to error:", error);
      } else {
        console.log("SignalR connection closed");
      }
    });

    connection.onreconnecting((error) => {
      setIsConnected(false);
      console.log("SignalR reconnecting due to error:", error);
    });

    connection.onreconnected((connectionId) => {
      setIsConnected(true);
      console.log("SignalR reconnected with connection ID:", connectionId);
    });

    start();
    }, 500); // 500ms debounce delay

    return () => {
      // Clear timeout
      if (connectionTimeoutRef.current) {
        clearTimeout(connectionTimeoutRef.current);
        connectionTimeoutRef.current = null;
      }
      
      setIsConnected(false);
      isConnectingRef.current = false;
      if (connectionRef.current) {
        connectionRef.current.off("BookingCreated");
        connectionRef.current.off("BookingUpdated");
        connectionRef.current.off("BookingCancelled");
        connectionRef.current.off("BookingDeleted");
        connectionRef.current.off("ResourceUpdated");

        if (
          connectionRef.current.state !==
          signalR.HubConnectionState.Disconnected
        ) {
          connectionRef.current.stop();
        }
        connectionRef.current = null;
      }
    };
  }, [token]);

  return {
    connection: connectionRef.current,
    isConnected: connectionRef.current?.state === signalR.HubConnectionState.Connected,
  };
};
