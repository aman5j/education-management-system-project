
import api from "./api";

const websiteEditorService = {

  // Header Services
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

  // Menus services

  async getMenuSettings() {
    const response = await api.get(
      "/website-editor/menu",
      { silent: true }
    );

    return response.data?.data?.settings || {};
  },

  async updateMenuSettings(payload) {
    const response = await api.put(
      "/website-editor/menu",
      payload,
      { silent: true }
    );

    return response.data?.data?.settings || {};
  },
};

export default websiteEditorService;
