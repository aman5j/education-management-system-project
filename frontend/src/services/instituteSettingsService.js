
import api from "./api";

const instituteSettingsService = {
  async getPublicBranding() {
    const response = await api.get(
      "/institute-settings/public-branding",
      { silent: true }
    );

    return response.data?.data?.branding || { logoUrl: "" };
  },

  async getSettings() {
    const response = await api.get("/institute-settings", {
      silent: true,
    });

    return response.data?.data?.settings;
  },

  async updateSettings(payload) {
    const response = await api.put(
      "/institute-settings",
      payload,
      { silent: true }
    );

    return response.data?.data?.settings;
  },

  async uploadLogo(file) {
    const formData = new FormData();
    formData.append("logo", file);

    const response = await api.post(
      "/institute-settings/logo",
      formData,
      {
        headers: {
          "Content-Type": undefined,
        },
        silent: true,
      }
    );

    return response.data?.data?.settings;
  },

  async uploadAsset(assetType, file) {
    const allowedAssets = [
      "stamp",
      "controllerSignature",
      "ownerPhoto",
      "ownerSignature",
    ];

    if (!allowedAssets.includes(assetType)) {
      throw new Error("Unsupported image type.");
    }

    const formData = new FormData();
    formData.append("image", file);

    const response = await api.post(
      `/institute-settings/assets/${assetType}`,
      formData,
      {
        headers: {
          "Content-Type": undefined,
        },
        silent: true,
      }
    );

    return response.data?.data?.settings;
  },
};

export default instituteSettingsService;
