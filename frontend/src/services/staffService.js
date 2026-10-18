
import api from "./api";

const staffService = {
  getStaff: async (params = {}) => {
    const response = await api.get("/staff", { params });
    return response.data;
  },

  createStaff: async (staffData) => {
    const response = await api.post("/staff", staffData);
    return response.data;
  },

  updateStatus: async (staffId, status) => {
    const response = await api.patch(
      `/staff/${staffId}/status`,
      { status }
    );
    return response.data;
  },

  resetPassword: async (staffId, newPassword) => {
    const response = await api.patch(
      `/staff/${staffId}/password`,
      { newPassword }
    );
    return response.data;
  },
};

export default staffService;
