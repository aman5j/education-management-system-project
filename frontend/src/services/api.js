
import axios from "axios";
import { getApiErrorMessage } from "../utils/notification";

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

let accessToken = null;

export const setAccessToken = (token) => {
  accessToken = token || null;
};

export const clearAccessToken = () => {
  accessToken = null;
};

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

api.interceptors.response.use(
  (response) => response,

  (error) => {
    const config = error.config || {};

    const shouldShowGlobalError =
      !config.skipGlobalErrorToast &&
      !config.silent &&
      error.code !== "ERR_CANCELED" &&
      !axios.isCancel(error);

    if (shouldShowGlobalError) {
      // Lazy import avoids unnecessary notification
      // utility initialization during API module setup.
      import("react-hot-toast").then(({ default: toast }) => {
        toast.error(getApiErrorMessage(error), {
          duration: 5000,
          id: `api-error-${error.config?.url || "request"}-${error.response?.status || error.code || "network"}`,
        });
      });
    }

    return Promise.reject(error);
  }
);

export default api;
