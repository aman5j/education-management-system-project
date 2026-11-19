
import api from "./api";

const websiteEditorService = {
  // Header Services
  async getHeaderSettings() {
    const response = await api.get("/website-editor/header", {
      silent: true,
    });
    return response.data?.data?.settings || {};
  },

  async updateHeaderSettings(payload) {
    const response = await api.put("/website-editor/header", payload, {
      silent: true,
    });
    return response.data?.data?.settings || {};
  },

  // Menu Services
  async getMenuSettings() {
    const response = await api.get("/website-editor/menu", {
      silent: true,
    });
    return response.data?.data?.settings || {};
  },

  async updateMenuSettings(payload) {
    const response = await api.put("/website-editor/menu", payload, {
      silent: true,
    });
    return response.data?.data?.settings || {};
  },

  // Banner Services
  async getBannerSettings() {
    const response = await api.get("/website-editor/banner", {
      silent: true,
    });
    return response.data?.data?.settings || { slides: [] };
  },

  async uploadBannerSlide(file, slideKey = "") {
    const formData = new FormData();
    formData.append("image", file);

    if (slideKey) formData.append("slideKey", slideKey);

    const response = await api.post(
      "/website-editor/banner/slides",
      formData,
      {
        headers: { "Content-Type": undefined },
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
        headers: { "Content-Type": undefined },
        silent: true,
      }
    );

    return response.data?.data || {};
  },

  // Phase 6: Course Categories
  async getCourseCategorySettings() {
    const response = await api.get(
      "/website-editor/course-categories",
      { silent: true }
    );

    return response.data?.data || {
      settings: { selectedCategoryIds: [] },
      categories: [],
    };
  },

  async updateCourseCategorySettings(payload) {
    const response = await api.put(
      "/website-editor/course-categories",
      payload,
      { silent: true }
    );

    return response.data?.data?.settings || {
      selectedCategoryIds: [],
    };
  },

  async getPublicCourseCategories() {
    const response = await api.get(
      "/website-editor/public/course-categories",
      { silent: true }
    );

    return response.data?.data?.categories || [];
  },

  // Phase 7: Trending Courses
  async getTrendingCourseSettings() {
    const response = await api.get(
      "/website-editor/trending-courses",
      { silent: true }
    );

    return response.data?.data || {
      settings: { selectedCourseIds: [] },
      courses: [],
    };
  },

  async updateTrendingCourseSettings(payload) {
    const response = await api.put(
      "/website-editor/trending-courses",
      payload,
      { silent: true }
    );

    return response.data?.data?.settings || {
      selectedCourseIds: [],
    };
  },

  async getPublicTrendingCourses() {
    const response = await api.get(
      "/website-editor/public/trending-courses",
      { silent: true }
    );

    return response.data?.data?.courses || [];
  },

  // Phase 8: Study Resources
  async getStudyResourcesSettings() {
    const response = await api.get(
      "/website-editor/study-resources",
      { silent: true }
    );

    return response.data?.data?.settings || { items: [] };
  },

  async updateStudyResourcesSettings(payload) {
    const response = await api.put(
      "/website-editor/study-resources",
      payload,
      { silent: true }
    );

    return response.data?.data?.settings || { items: [] };
  },

  async uploadStudyResourceImage(file) {
    const formData = new FormData();
    formData.append("image", file);

    const response = await api.post(
      "/website-editor/study-resources/images",
      formData,
      {
        headers: { "Content-Type": undefined },
        silent: true,
      }
    );

    return response.data?.data || {};
  },

  async getPublicStudyResources() {
    const response = await api.get(
      "/website-editor/public/study-resources",
      { silent: true }
    );

    return response.data?.data?.items || [];
  },

  
  // Phase 9: Certificate Section
  async getCertificateSectionSettings() {
    const response = await api.get(
      "/website-editor/certificate-section",
      { silent: true }
    );

    return response.data?.data?.settings || {
      enabled: false,
      imageUrl: "",
      imageVersion: "",
      title: "",
      highlightText: "",
      description: "",
      listItems: [],
      buttonText: "View Full Certificate",
      buttonAction: "image",
      externalUrl: "",
    };
  },

  async updateCertificateSectionSettings(payload) {
    const response = await api.put(
      "/website-editor/certificate-section",
      payload,
      { silent: true }
    );

    return response.data?.data?.settings || payload;
  },

  async uploadCertificateSectionImage(file) {
    const formData = new FormData();
    formData.append("image", file);

    const response = await api.post(
      "/website-editor/certificate-section/image",
      formData,
      {
        headers: { "Content-Type": undefined },
        silent: true,
      }
    );

    return response.data?.data || {};
  },

  async getPublicCertificateSection() {
    const response = await api.get(
      "/website-editor/public/certificate-section",
      { silent: true }
    );

    return response.data?.data?.settings || null;
  },



  // Phase 10: Partners
  async getPartnerSettings() {
    const response = await api.get(
      "/website-editor/partners",
      { silent: true }
    );

    return response.data?.data?.settings || {
      enabled: true,
      heading:
        "Trusted by industry leaders and valued partners worldwide",
      highlightText: "industry leaders and valued partners",
      visibleCount: 5,
      autoSlide: true,
      logos: [],
    };
  },

  async updatePartnerSettings(payload) {
    const response = await api.put(
      "/website-editor/partners",
      payload,
      { silent: true }
    );

    return response.data?.data?.settings || payload;
  },

  async uploadPartnerLogo(file) {
    const formData = new FormData();
    formData.append("image", file);

    const response = await api.post(
      "/website-editor/partners/logos",
      formData,
      {
        headers: { "Content-Type": undefined },
        silent: true,
      }
    );

    return response.data?.data || {};
  },

  async getPublicPartnerSettings() {
    const response = await api.get(
      "/website-editor/public/partners",
      { silent: true }
    );

    return response.data?.data?.settings || null;
  },




  // Phase 11: Placement Stories
  async getPlacementStoriesSettings() {
    const response = await api.get(
      "/website-editor/placement-stories",
      { silent: true }
    );

    return response.data?.data?.settings || {
      enabled: true,
      heading: "Our Success Placement Story",
      highlightText: "Placement Story",
      stories: [],
    };
  },

  async updatePlacementStoriesSettings(payload) {
    const response = await api.put(
      "/website-editor/placement-stories",
      payload,
      { silent: true }
    );

    return response.data?.data?.settings || payload;
  },

  async uploadPlacementStoryImage(file) {
    const formData = new FormData();
    formData.append("image", file);

    const response = await api.post(
      "/website-editor/placement-stories/images",
      formData,
      {
        headers: { "Content-Type": undefined },
        silent: true,
      }
    );

    return response.data?.data || {};
  },

  async getPublicPlacementStories() {
    const response = await api.get(
      "/website-editor/public/placement-stories",
      { silent: true }
    );

    return response.data?.data?.settings || null;
  },



};

export default websiteEditorService;
