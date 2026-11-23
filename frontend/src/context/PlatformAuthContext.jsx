
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

import { platformAuthService } from "../services/platformAuthService";
import { clearPlatformAccessToken } from "../services/platformApi";

const PlatformAuthContext = createContext(null);

export const PlatformAuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const login = useCallback(async (credentials) => {
    const loggedInUser =
      await platformAuthService.login(credentials);

    if (loggedInUser?.role !== "super_admin") {
      clearPlatformAccessToken();
      throw new Error("This account is not a Platform Super Admin.");
    }

    setUser(loggedInUser);
    return loggedInUser;
  }, []);

  const logout = useCallback(async () => {
    try {
      await platformAuthService.logout();
    } finally {
      setUser(null);
    }
  }, []);

  const refreshSession = useCallback(async () => {
    try {
      const currentUser = await platformAuthService.refresh();

      if (currentUser?.role !== "super_admin") {
        throw new Error("Invalid platform account.");
      }

      setUser(currentUser);
      return currentUser;
    } catch (error) {
      clearPlatformAccessToken();
      setUser(null);
      throw error;
    }
  }, []);

  useEffect(() => {
    let mounted = true;

    const initialize = async () => {
      try {
        const currentUser =
          await platformAuthService.refresh();

        if (
          mounted &&
          currentUser?.role === "super_admin"
        ) {
          setUser(currentUser);
        } else if (mounted) {
          clearPlatformAccessToken();
          setUser(null);
        }
      } catch {
        if (mounted) {
          clearPlatformAccessToken();
          setUser(null);
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    initialize();

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    const handleExpired = () => {
      clearPlatformAccessToken();
      setUser(null);
    };

    window.addEventListener(
      "ems:platform-session-expired",
      handleExpired
    );

    return () => {
      window.removeEventListener(
        "ems:platform-session-expired",
        handleExpired
      );
    };
  }, []);

  return (
    <PlatformAuthContext.Provider
      value={{
        user,
        loading,
        isAuthenticated: Boolean(user),
        login,
        logout,
        refreshSession,
      }}
    >
      {children}
    </PlatformAuthContext.Provider>
  );
};

export const usePlatformAuth = () => {
  const context = useContext(PlatformAuthContext);

  if (!context) {
    throw new Error(
      "usePlatformAuth must be used inside PlatformAuthProvider."
    );
  }

  return context;
};
