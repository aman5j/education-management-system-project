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

  async getRecommendedCourses() {
    const response = await api.get(
      "/student-portal/recommended-courses"
    );

    return response.data;
  },

  async getMyAttendance(month) {
    const response = await api.get("/student-portal/attendance", {
      params: month ? { month } : {},
    });

    return response.data;
  },

  async getMyFees() {
    const response = await api.get("/student-portal/fees");
    return response.data;
  },

};

export default studentPortalService;