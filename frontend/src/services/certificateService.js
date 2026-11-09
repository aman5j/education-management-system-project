
import api from "./api";

const certificateService = {
  getCertificates(params = {}) {
    return api.get("/certificates", {
      params,
      silent: true,
    });
  },

  getEligibleResults(params = {}) {
    return api.get("/certificates/eligible-students", {
      params,
      silent: true,
    });
  },

  generateCertificate(resultId) {
    return api.post(
      `/certificates/generate/${resultId}`,
      {},
      { silent: true }
    );
  },

  getCertificateById(id) {
    return api.get(`/certificates/${id}`, {
      silent: true,
    });
  },

  shareCertificate(id) {
    return api.patch(
      `/certificates/${id}/share`,
      {},
      { silent: true }
    );
  },
};

export default certificateService;