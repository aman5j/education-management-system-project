
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
};

export default staffService;
