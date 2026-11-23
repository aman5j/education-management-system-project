
import axios from "axios";

const API_URL = (
  import.meta.env.VITE_API_URL ||
  import.meta.env.VITE_API_BASE_URL ||
  "http://localhost:5000/api"
).replace(/\/+$/, "");

const PLATFORM_URL = `${API_URL}/platform`;

let platformAccessToken = null;
let refreshPromise = null;

export const setPlatformAccessToken = (token) => {
  platformAccessToken = token || null;
};

export const getPlatformAccessToken = () => platformAccessToken;

export const clearPlatformAccessToken = () => {
  platformAccessToken = null;
};

const platformApi = axios.create({
  baseURL: PLATFORM_URL,
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});

const refreshPlatformToken = async () => {
  if (!refreshPromise) {
    refreshPromise = axios
      .post(
        `${PLATFORM_URL}/auth/refresh`,
        {},
        { withCredentials: true }
      )
      .then((response) => {
        const token = response.data?.data?.accessToken;

        if (!token) {
          throw new Error(
            "Platform refresh did not return an access token."
          );
        }

        setPlatformAccessToken(token);
        return token;
      })
      .finally(() => {
        refreshPromise = null;
      });
  }

  return refreshPromise;
};

platformApi.interceptors.request.use((config) => {
  if (platformAccessToken) {
    config.headers = config.headers || {};
    config.headers.Authorization =
      `Bearer ${platformAccessToken}`;
  }

  return config;
});

platformApi.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    const isPlatformAuthRequest =
      originalRequest?.url?.includes("/auth/login") ||
      originalRequest?.url?.includes("/auth/refresh") ||
      originalRequest?.url?.includes("/auth/logout");

    if (
      error.response?.status === 401 &&
      originalRequest &&
      !originalRequest._platformRetry &&
      !isPlatformAuthRequest
    ) {
      originalRequest._platformRetry = true;

      try {
        const newToken = await refreshPlatformToken();

        originalRequest.headers =
          originalRequest.headers || {};

        originalRequest.headers.Authorization =
          `Bearer ${newToken}`;

        return platformApi(originalRequest);
      } catch (refreshError) {
        clearPlatformAccessToken();

        window.dispatchEvent(
          new CustomEvent("ems:platform-session-expired")
        );

        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export default platformApi;
