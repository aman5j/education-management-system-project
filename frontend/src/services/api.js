
import axios from "axios";
import { getApiErrorMessage } from "../utils/notification";

// const API_URL =
//   import.meta.env.VITE_API_URL ||
//   "http://localhost:5000/api";

const API_URL = (
  import.meta.env.VITE_API_URL ||
  import.meta.env.VITE_API_BASE_URL ||
  "http://localhost:5000/api"
).replace(/\/+$/, "");

const api = axios.create({
  baseURL: API_URL,
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});

let accessToken = null;
let authExpiryHandled = false;

export const setAccessToken = (token) => {
  accessToken = token || null;

  if (token) {
    authExpiryHandled = false;
  }
};

export const clearAccessToken = () => {
  accessToken = null;
};

api.interceptors.request.use(
  (config) => {
    if (accessToken) {
      config.headers = config.headers || {};
      config.headers.Authorization = `Bearer ${accessToken}`;
    }

    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => response,

  (error) => {
    const config = error.config || {};
    const responseData = error.response?.data;

    const isAccessTokenExpired =
      error.response?.status === 401 &&
      responseData?.code === "ACCESS_TOKEN_EXPIRED";

    if (isAccessTokenExpired && !authExpiryHandled) {
      authExpiryHandled = true;
      clearAccessToken();

      window.dispatchEvent(
        new CustomEvent("ems:session-expired", {
          detail: {
            message:
              "Your login session has expired after 24 hours.",
          },
        })
      );

      return Promise.reject(error);
    }

    const shouldShowGlobalError =
      !config.skipGlobalErrorToast &&
      !config.silent &&
      !isAccessTokenExpired &&
      error.code !== "ERR_CANCELED" &&
      !axios.isCancel(error);

    if (shouldShowGlobalError) {
      import("react-hot-toast").then(({ default: toast }) => {
        toast.error(getApiErrorMessage(error), {
          duration: 5000,
          id: `api-error-${config.url || "request"}-${error.response?.status || error.code || "network"}`,
        });
      });
    }

    return Promise.reject(error);
  }
);

export default api;
