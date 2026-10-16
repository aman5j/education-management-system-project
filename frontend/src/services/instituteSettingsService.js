
import api from "./api";

const instituteSettingsService = {
  async getSettings() {
    const response = await api.get("/institute-settings");
    return response.data.data.settings;
  },

  async updateSettings(payload) {
    const response = await api.put(
      "/institute-settings",
      payload
    );

    return response.data.data.settings;
  },

  async uploadLogo(file) {
    const formData = new FormData();
    formData.append("logo", file);

    const response = await api.post(
      "/institute-settings/logo",
      formData,
      {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      }
    );

    return response.data.data.settings;
  },
};

export default instituteSettingsService;
