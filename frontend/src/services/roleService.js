
import api from "./api";

const roleService = {
  // Fetch custom staff roles
  getRoles: async () => {
    const response = await api.get("/roles");
    return response.data;
  },

  // Fetch permissions available for assignment
  getPermissions: async () => {
    const response = await api.get("/roles/permissions");
    return response.data;
  },

  // Create a staff role
  createRole: async (roleData) => {
    const response = await api.post("/roles", roleData);
    return response.data;
  },

  // Update an existing staff role
  updateRole: async (roleId, roleData) => {
    const response = await api.put(`/roles/${roleId}`, roleData);
    return response.data;
  },

  // Delete a staff role
  deleteRole: async (roleId) => {
    const response = await api.delete(`/roles/${roleId}`);
    return response.data;
  },
};

export default roleService;
