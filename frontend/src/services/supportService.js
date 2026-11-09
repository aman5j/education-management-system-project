
import api from "./api";

const supportService = {
  async createTicket(payload) {
    const response = await api.post("/support/tickets", payload, {
      silent: true,
    });
    return response.data;
  },

  async getMyTickets(params = {}) {
    const response = await api.get("/support/tickets/my", {
      params,
      silent: true,
    });
    return response.data;
  },

  async getMyStats() {
    const response = await api.get("/support/tickets/my/stats", {
      silent: true,
    });
    return response.data;
  },

  async getMyTicket(ticketId) {
    const response = await api.get(`/support/tickets/${ticketId}`, {
      silent: true,
    });
    return response.data;
  },

  async getMyMessages(ticketId) {
    const response = await api.get(
      `/support/tickets/${ticketId}/messages`,
      { silent: true }
    );
    return response.data;
  },

  async sendStudentMessage(ticketId, message) {
    const response = await api.post(
      `/support/tickets/${ticketId}/messages`,
      { message },
      { silent: true }
    );
    return response.data;
  },

  async reopenMyTicket(ticketId) {
    const response = await api.patch(
      `/support/tickets/${ticketId}/reopen`,
      {},
      { silent: true }
    );
    return response.data;
  },

  async getAdminStats() {
    const response = await api.get("/support/admin/stats", {
      silent: true,
    });
    return response.data;
  },

  async getAdminTickets(params = {}) {
    const response = await api.get("/support/admin/tickets", {
      params,
      silent: true,
    });
    return response.data;
  },

  async getAdminTicket(ticketId) {
    const response = await api.get(
      `/support/admin/tickets/${ticketId}`,
      { silent: true }
    );
    return response.data;
  },

  async getAdminMessages(ticketId) {
    const response = await api.get(
      `/support/admin/tickets/${ticketId}/messages`,
      { silent: true }
    );
    return response.data;
  },

  async sendAdminMessage(ticketId, message) {
    const response = await api.post(
      `/support/admin/tickets/${ticketId}/messages`,
      { message },
      { silent: true }
    );
    return response.data;
  },

  async updateStatus(ticketId, status) {
    const response = await api.patch(
      `/support/admin/tickets/${ticketId}/status`,
      { status },
      { silent: true }
    );
    return response.data;
  },

  async updatePriority(ticketId, priority) {
    const response = await api.patch(
      `/support/admin/tickets/${ticketId}/priority`,
      { priority },
      { silent: true }
    );
    return response.data;
  },
};

export default supportService;
