
import api from "./api";

const contactUsService = {
  async getPublicContactData() {
    const response = await api.get(
      "/website-editor/public/contact",
      { silent: true }
    );

    return response.data?.data || {};
  },

  async getContactSettings() {
    const response = await api.get(
      "/website-editor/contact",
      { silent: true }
    );

    return response.data?.data?.settings || {};
  },

  async updateContactSettings(payload) {
    const response = await api.put(
      "/website-editor/contact",
      payload,
      { silent: true }
    );

    return response.data?.data?.settings || payload;
  },

  async submitEnquiry(payload) {
    const response = await api.post(
      "/course-enquiries",
      payload,
      { silent: true }
    );

    return response.data;
  },

  async getEnquiries(params = {}) {
    const response = await api.get(
      "/course-enquiries",
      {
        params,
        silent: true,
      }
    );

    return response.data?.data || {};
  },

  async getEnquiryById(id) {
    const response = await api.get(
      `/course-enquiries/${id}`,
      { silent: true }
    );

    return response.data?.data?.enquiry || null;
  },

  async updateEnquiryStatus(id, status) {
    const response = await api.patch(
      `/course-enquiries/${id}/status`,
      { status },
      { silent: true }
    );

    return response.data?.data?.enquiry || null;
  },

  async deleteEnquiry(id) {
    const response = await api.delete(
      `/course-enquiries/${id}`,
      { silent: true }
    );

    return response.data;
  },
};

export default contactUsService;
