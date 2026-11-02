import api from "./api";

const studentPortalService = {
  async getDashboard() {
    const response = await api.get("/student-portal/dashboard");
    return response.data;
  },

  async getMyAdmissionDetails() {
    const response = await api.get(
      "/student-portal/admission-details"
    );

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

  async getMyExams() {
    const response = await api.get("/student-portal/exams");
    return response.data;
  },

  async getExamInstructions(ticketId) {
    const response = await api.get(
      `/student-portal/exams/${ticketId}/instructions`
    );
    return response.data;
  },

  async getMyExamAccessRequest(ticketId) {
    const response = await api.get(
      `/student-portal/exams/${ticketId}/access-request`
    );

    return response.data;
  },

  async requestMyExamAccess(ticketId) {
    const response = await api.post(
      `/student-portal/exams/${ticketId}/access-request`
    );

    return response.data;
  },

  async startMyExam(ticketId) {
    const response = await api.post(
      `/student-portal/exams/${ticketId}/start`
    );
    return response.data;
  },

  async submitMyExam(ticketId, answers) {
    const response = await api.post(
      `/student-portal/exams/${ticketId}/submit`,
      { answers }
    );
    return response.data;
  },

  async getMyExamResults() {
    const response = await api.get("/student-portal/exams/results");
    return response.data;
  },

  async getMyExamResult(resultId) {
    const response = await api.get(
      `/student-portal/exams/results/${resultId}`
    );
    return response.data;
  },

  async getMyCertificates() {
    const response = await api.get(
      "/student-portal/certificates"
    );
    return response.data;
  },


  async getMyDocuments() {
    const response = await api.get("/student-portal/documents");
    return response.data;
  },

  async viewMyDocument(documentId) {
    const response = await api.get(
      `/student-portal/documents/${documentId}/view`,
      { responseType: "blob" }
    );

    return response.data;
  },

  async downloadMyDocument(documentId) {
    const response = await api.get(
      `/student-portal/documents/${documentId}/download`,
      { responseType: "blob" }
    );

    return response.data;
  },





  async getMyProfile() {
    const response = await api.get("/student-portal/profile");
    return response.data;
  },

  async updateMyProfile(payload) {
    const response = await api.put(
      "/student-portal/profile",
      payload
    );
    return response.data;
  },

  async uploadMyProfilePhoto(file) {
    const formData = new FormData();
    formData.append("profileImage", file);

    const response = await api.post(
      "/student-portal/profile/photo",
      formData,
      {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      }
    );

    return response.data;
  },

};

export default studentPortalService;