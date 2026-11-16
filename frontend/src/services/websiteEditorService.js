
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

  // Menu Services
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

  // Banner Services
  async getBannerSettings() {
    const response = await api.get(
      "/website-editor/banner",
      { silent: true }
    );

    return response.data?.data?.settings || { slides: [] };
  },

  async uploadBannerSlide(file, slideKey = "") {
    const formData = new FormData();
    formData.append("image", file);

    if (slideKey) {
      formData.append("slideKey", slideKey);
    }

    const response = await api.post(
      "/website-editor/banner/slides",
      formData,
      {
        headers: {
          "Content-Type": undefined,
        },
        silent: true,
      }
    );

    return response.data?.data?.settings || { slides: [] };
  },

  async deleteBannerSlide(slideKey) {
    const response = await api.delete(
      `/website-editor/banner/slides/${encodeURIComponent(slideKey)}`,
      { silent: true }
    );

    return response.data?.data?.settings || { slides: [] };
  },

  async reorderBannerSlides(slideKeys) {
    const response = await api.put(
      "/website-editor/banner/reorder",
      { slideKeys },
      { silent: true }
    );

    return response.data?.data?.settings || { slides: [] };
  },

  
  // Category Highlights Services
  async getCategoryHighlights() {
    const response = await api.get(
      "/website-editor/category-highlights",
      { silent: true }
    );

    return response.data?.data?.settings || { items: [] };
  },

  async updateCategoryHighlights(payload) {
    const response = await api.put(
      "/website-editor/category-highlights",
      payload,
      { silent: true }
    );

    return response.data?.data?.settings || { items: [] };
  },

  async uploadCategoryHighlightIcon(file) {
    const formData = new FormData();
    formData.append("image", file);

    const response = await api.post(
      "/website-editor/category-highlights/icons",
      formData,
      {
        headers: {
          "Content-Type": undefined,
        },
        silent: true,
      }
    );

    return response.data?.data || {};
  },

};

export default websiteEditorService;
