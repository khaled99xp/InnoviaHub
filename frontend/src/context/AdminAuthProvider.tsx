import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  type ReactNode,
} from "react";
import { loginUser } from "../api/authApi";
import type { User } from "../types/admin";
import toast from "react-hot-toast";

interface AdminAuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AdminAuthContext = createContext<AdminAuthContextType | undefined>(
  undefined
);

interface AdminAuthProviderProps {
  children: ReactNode;
}

export const AdminAuthProvider: React.FC<AdminAuthProviderProps> = ({
  children,
}) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const isAuthenticated = !!user;

  // Check if user is already logged in on app start
  useEffect(() => {
    const checkAuth = async () => {
      console.log("AdminAuthProvider: Starting auth check");
      const token = localStorage.getItem("token");
      const userData = localStorage.getItem("user");

      console.log(
        "AdminAuthProvider: Checking auth - token:",
        !!token,
        "userData:",
        !!userData
      );

      if (token && userData) {
        try {
          const parsedUser = JSON.parse(userData);
          console.log("AdminAuthProvider: Parsed user:", parsedUser);

          // Check if user is Admin
          if (parsedUser.role === "Admin") {
            // Try to refresh token to ensure it's valid
            try {
              const refreshResponse = await fetch(
                `${
                  (
                    await import("@/utils/constants")
                  ).API_BASE_URL
                }/auth/refresh-token`,
                {
                  method: "POST",
                  headers: {
                    "Content-Type": "application/json",
                  },
                  body: JSON.stringify({ token }),
                }
              );

              if (refreshResponse.ok) {
                const refreshData = await refreshResponse.json();
                if (refreshData.token) {
                  localStorage.setItem("token", refreshData.token);
                  console.log(
                    "AdminAuthProvider: Token refreshed successfully"
                  );
                }
              } else {
                console.log(
                  "AdminAuthProvider: Token refresh failed, clearing auth data"
                );
                localStorage.removeItem("token");
                localStorage.removeItem("user");
                setIsLoading(false);
                return;
              }
            } catch (refreshError) {
              console.error(
                "AdminAuthProvider: Token refresh error:",
                refreshError
              );
              localStorage.removeItem("token");
              localStorage.removeItem("user");
              setIsLoading(false);
              return;
            }

            const adminUser: User = {
              id: parsedUser.id,
              email: parsedUser.email,
              firstName: parsedUser.firstName,
              lastName: parsedUser.lastName,
              role: parsedUser.role,
              isActive: parsedUser.isActive,
              createdAt: parsedUser.createdAt,
              updatedAt: parsedUser.updatedAt,
              roles: parsedUser.roles,
              totalBookings: 0,
              activeBookings: 0,
            };
            setUser(adminUser);
            console.log(
              "AdminAuthProvider: Admin user restored from localStorage:",
              adminUser
            );
          } else {
            // User is not Admin, don't set user but don't clear data
            console.log(
              "AdminAuthProvider: User is not Admin, not setting admin user"
            );
          }
        } catch (error) {
          console.error("AdminAuthProvider: Auth check failed:", error);
          localStorage.removeItem("token");
          localStorage.removeItem("user");
        }
      } else {
        console.log(
          "AdminAuthProvider: No token or user data found in localStorage"
        );
      }
      console.log(
        "AdminAuthProvider: Auth check completed, setting isLoading to false"
      );
      setIsLoading(false);
    };

    checkAuth();
  }, []);

  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      setIsLoading(true);
      console.log("AdminAuthProvider: Starting login process");
      const response = await loginUser(email, password);

      if (response.success && response.data?.user) {
        // Check if user is Admin
        if (response.data.user.role === "Admin") {
          const adminUser: User = {
            id: response.data.user.id,
            email: response.data.user.email,
            firstName: response.data.user.firstName,
            lastName: response.data.user.lastName,
            role: response.data.user.role,
            isActive: response.data.user.isActive,
            createdAt: response.data.user.createdAt,
            updatedAt: response.data.user.updatedAt,
            roles: response.data.user.roles,
            totalBookings: 0,
            activeBookings: 0,
          };

          // Save token and user data to localStorage
          localStorage.setItem("token", response.data.token);
          localStorage.setItem("user", JSON.stringify(response.data.user));

          setUser(adminUser);
          console.log(
            "AdminAuthProvider: Login successful, user saved:",
            adminUser
          );
          toast.success("Login successful!");
          return true;
        } else {
          toast.error("Access denied. Admin privileges required.");
          return false;
        }
      } else {
        toast.error(response.message || "Login failed");
        return false;
      }
    } catch (error) {
      console.error("Login error:", error);
      toast.error(error instanceof Error ? error.message : "Login failed");
      return false;
    } finally {
      console.log(
        "AdminAuthProvider: Login process completed, setting isLoading to false"
      );
      setIsLoading(false);
    }
  };

  const logout = async (): Promise<void> => {
    try {
      // Clear all authentication data
      setUser(null);
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      localStorage.removeItem("admin-token"); // Clear any admin-specific tokens
      console.log("AdminAuthProvider: Logout successful, all data cleared");
      toast.success("Logged out successfully");
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  const refreshUser = async (): Promise<void> => {
    try {
      // In a real app, you would call an endpoint like /me to get current user info
      // For now, we'll just keep the current user
      console.log("User refreshed");
    } catch (error) {
      console.error("Refresh user error:", error);
    }
  };

  const value: AdminAuthContextType = {
    user,
    isAuthenticated,
    isLoading,
    login,
    logout,
    refreshUser,
  };

  return (
    <AdminAuthContext.Provider value={value}>
      {children}
    </AdminAuthContext.Provider>
  );
};

export const useAdminAuth = (): AdminAuthContextType => {
  const context = useContext(AdminAuthContext);
  if (context === undefined) {
    throw new Error("useAdminAuth must be used within an AdminAuthProvider");
  }
  return context;
};
