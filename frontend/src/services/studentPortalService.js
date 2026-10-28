import api from "./api";

const studentPortalService = {
  async getDashboard() {
    const response = await api.get("/student-portal/dashboard");
    return response.data;
  },

  async getMyCourses() {
    const response = await api.get("/student-portal/courses");
    return response.data;
  },
};

export default studentPortalService;