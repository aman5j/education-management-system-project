
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import api, {
  clearAccessToken,
  setAccessToken,
} from "../services/api";

import notification from "../utils/notification";

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState("");

  const refreshSession = useCallback(async () => {
    try {
      const response = await api.post("/auth/refresh");

      const { accessToken, user: refreshedUser } =
        response.data.data;

      setAccessToken(accessToken);
      setUser(refreshedUser);

      return refreshedUser;
    } catch {
      clearAccessToken();
      setUser(null);

      return null;
    }
  }, []);

  const updateUser = useCallback((updatedUser) => {
    setUser((currentUser) => {
      if (!currentUser || !updatedUser) {
        return currentUser;
      }

      return {
        ...currentUser,
        ...updatedUser,
        assignedRole:
          updatedUser.assignedRole?.isActive !== undefined
            ? updatedUser.assignedRole
            : currentUser.assignedRole,
      };
    });
  }, []);

  useEffect(() => {
    const initializeAuthentication = async () => {
      await refreshSession();
      setLoading(false);
    };

    initializeAuthentication();
  }, [refreshSession]);

  // Handle expired access tokens from every protected API request.
  useEffect(() => {
    let handlingExpiration = false;

    const handleSessionExpired = async (event) => {
      if (handlingExpiration) return;

      handlingExpiration = true;

      await notification.alert({
        title: "Session Expired",
        text:
          event.detail?.message ||
          "Your login session has expired. Please sign in again to continue.",
        icon: "warning",
        confirmText: "Login Again",
      });

      clearAccessToken();
      setUser(null);
      setAuthError("");

      window.location.replace("/login");
    };

    window.addEventListener(
      "ems:session-expired",
      handleSessionExpired
    );

    return () => {
      window.removeEventListener(
        "ems:session-expired",
        handleSessionExpired
      );
    };
  }, []);

  const login = useCallback(async (email, password, role) => {
    setAuthError("");

    try {
      const response = await api.post("/auth/login", {
        email,
        password,
        role,
      });

      const { accessToken, user: loggedInUser } =
        response.data.data;

      setAccessToken(accessToken);
      setUser(loggedInUser);

      return loggedInUser;
    } catch (error) {
      const message =
        error.response?.data?.message ||
        "Unable to sign in.";

      setAuthError(message);

      throw new Error(message);
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await api.post("/auth/logout");
    } catch {
      // Continue clearing the frontend session.
    } finally {
      clearAccessToken();
      setUser(null);
      setAuthError("");
    }
  }, []);

  const register = useCallback(async (payload) => {
    const response = await api.post(
      "/auth/register",
      payload
    );

    return response.data;
  }, []);

  const forgotPassword = useCallback(async (email) => {
    const response = await api.post(
      "/auth/forgot-password",
      { email }
    );

    return response.data;
  }, []);

  const resetPassword = useCallback(async (token, newPassword) => {
    const response = await api.post(
      "/auth/reset-password",
      { token, newPassword }
    );

    return response.data;
  }, []);

  
  const changePassword = useCallback(
    async (currentPassword, newPassword, options = {}) => {
      const response = await api.put(
        "/auth/change-password",
        { currentPassword, newPassword },
        { silent: Boolean(options.silent) }
      );

      clearAccessToken();
      setUser(null);

      return response.data;
    },
    []
  );


  const value = useMemo(
    () => ({
      user,
      loading,
      authError,
      isAuthenticated: Boolean(user),
      login,
      logout,
      register,
      forgotPassword,
      resetPassword,
      changePassword,
      refreshSession,
      updateUser,
    }),
    [
      user,
      loading,
      authError,
      login,
      logout,
      register,
      forgotPassword,
      resetPassword,
      changePassword,
      refreshSession,
      updateUser,
    ]
  );

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error(
      "useAuth must be used inside AuthProvider."
    );
  }

  return context;
};

export default AuthContext;
