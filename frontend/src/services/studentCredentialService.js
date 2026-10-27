
import api from "./api";

const studentCredentialService = {
  async getStatus(studentId) {
    const response = await api.get(
      `/student-portal/admin/account/${studentId}`
    );
    return response.data;
  },

  async createAccount(studentId, password) {
    const response = await api.post(
      "/student-portal/admin/create-account",
      { studentId, password }
    );
    return response.data;
  },

  async resetPassword(studentId, password) {
    const response = await api.patch(
      `/student-portal/admin/account/${studentId}/password`,
      { password }
    );
    return response.data;
  },
};

export default studentCredentialService;
