
import axios from "axios";

import notification, {
  getApiErrorMessage,
} from "../utils/notification";

// --------------------------------------------------
// API configuration
// --------------------------------------------------

const API_URL =
  import.meta.env.VITE_API_URL ||
  "http://localhost:5000/api";

const api = axios.create({
  baseURL: API_URL,
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});

// --------------------------------------------------
// Access token management
// --------------------------------------------------

let accessToken = null;

export const setAccessToken = (token) => {
  accessToken = token;
};

export const clearAccessToken = () => {
  accessToken = null;
};

// --------------------------------------------------
// Request interceptor
// --------------------------------------------------

api.interceptors.request.use(
  (config) => {
    if (accessToken) {
      config.headers = config.headers || {};

      config.headers.Authorization =
        `Bearer ${accessToken}`;
    }

    return config;
  },

  (error) => Promise.reject(error)
);

// --------------------------------------------------
// Response interceptor
// --------------------------------------------------

api.interceptors.response.use(
  (response) => response,

  (error) => {
    const config = error.config || {};

    const isCanceled =
      error.code === "ERR_CANCELED" ||
      axios.isCancel(error);

    // Pages can handle errors themselves by passing
    // skipGlobalErrorToast: true or silent: true.

    const shouldShowGlobalToast =
      !config.skipGlobalErrorToast &&
      !config.silent &&
      !isCanceled;

    if (shouldShowGlobalToast) {
      notification.error(
        getApiErrorMessage(error),
        {
          duration: 5000,
          id: `api-error-${
            error.response?.status ||
            error.code ||
            "network"
          }`,
        }
      );
    }

    return Promise.reject(error);
  }
);

export default api;
