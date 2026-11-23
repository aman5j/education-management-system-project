
import platformApi, {
  setPlatformAccessToken,
  clearPlatformAccessToken,
} from "./platformApi";

export const platformAuthService = {
  async login(credentials) {
    const response = await platformApi.post(
      "/auth/login",
      credentials
    );

    const token = response.data?.data?.accessToken;

    if (!token) {
      throw new Error(
        "Platform login did not return an access token."
      );
    }

    setPlatformAccessToken(token);

    return response.data.data.user;
  },

  async refresh() {
    const response = await platformApi.post(
      "/auth/refresh",
      {}
    );

    const token = response.data?.data?.accessToken;

    if (!token) {
      throw new Error(
        "Unable to restore the platform session."
      );
    }

    setPlatformAccessToken(token);

    return response.data.data.user;
  },

  async getMe() {
    const response = await platformApi.get("/auth/me");

    return response.data.data.user;
  },

  async logout() {
    try {
      await platformApi.post("/auth/logout");
    } finally {
      clearPlatformAccessToken();
    }
  },

  async getDashboard() {
    const response = await platformApi.get("/dashboard");

    return response.data.data;
  },
};

export default platformAuthService;
