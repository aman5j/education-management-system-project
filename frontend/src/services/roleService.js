
import api from "./api";

const roleService = {
  getRoles: async (config = {}) => {
    const response = await api.get("/roles", {
      ...config,
      silent: true,
    });

    return response.data;
  },

  getPermissions: async () => {
    const response = await api.get("/roles/permissions", {
      silent: true,
    });

    return response.data;
  },

  createRole: async (roleData) => {
    const response = await api.post("/roles", roleData, {
      silent: true,
    });

    return response.data;
  },

  updateRole: async (roleId, roleData) => {
    const response = await api.put(`/roles/${roleId}`, roleData, {
      silent: true,
    });

    return response.data;
  },

  deleteRole: async (roleId) => {
    const response = await api.delete(`/roles/${roleId}`, {
      silent: true,
    });

    return response.data;
  },
};

export default roleService;
