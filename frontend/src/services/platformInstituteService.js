
import platformApi from "./platformApi";

const platformInstituteService = {
  async getInstitutes(params = {}) {
    const response = await platformApi.get("/institutes", {
      params,
    });

    return response.data.data;
  },

  async getInstitute(id) {
    const response = await platformApi.get(
      `/institutes/${id}`
    );

    return response.data.data.institute;
  },

  async createInstitute(payload) {
    const response = await platformApi.post(
      "/institutes",
      payload
    );

    return response.data.data.institute;
  },

  async updateInstitute(id, payload) {
    const response = await platformApi.put(
      `/institutes/${id}`,
      payload
    );

    return response.data.data.institute;
  },

  async updateStatus(id, status) {
    const response = await platformApi.patch(
      `/institutes/${id}/status`,
      { status }
    );

    return response.data.data.institute;
  },
};

export default platformInstituteService;
