import api from "./api";

const websiteEditorService = {
  async getHeaderSettings() {
    const response = await api.get(
      "/website-editor/header",
      { silent: true }
    );

    return response.data?.data?.settings || {};
  },

  async updateHeaderSettings(payload) {
    const response = await api.put(
      "/website-editor/header",
      payload,
      { silent: true }
    );

    return response.data?.data?.settings || {};
  },
};

export default websiteEditorService;