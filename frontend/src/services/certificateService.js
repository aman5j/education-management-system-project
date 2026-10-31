import api from "./api";

const certificateService = {
  getCertificates(params = {}) {
    return api.get("/certificates", { params });
  },

  getEligibleResults(params = {}) {
    return api.get("/certificates/eligible-students", {
      params,
    });
  },

  generateCertificate(resultId) {
    return api.post(`/certificates/generate/${resultId}`);
  },

  getCertificateById(id) {
    return api.get(`/certificates/${id}`);
  },
};

export default certificateService;