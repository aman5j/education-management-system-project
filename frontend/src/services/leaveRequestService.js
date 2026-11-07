
import api from "./api";

const leaveRequestService = {
  async getRequests(params = {}) {
    const response = await api.get("/leave-requests", {
      params,
      silent: true,
    });

    return response.data;
  },

  async reviewRequest(requestId, payload) {
    const response = await api.patch(
      `/leave-requests/${requestId}/review`,
      payload,
      { silent: true }
    );

    return response.data;
  },
};

export default leaveRequestService;
