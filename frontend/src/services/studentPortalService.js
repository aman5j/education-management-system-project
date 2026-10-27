import api from "./api";

const studentPortalService = {
  async getDashboard() {
    const response = await api.get("/student-portal/dashboard");
    return response.data;
  },
};

export default studentPortalService;