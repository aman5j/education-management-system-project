
import api from "./api";

const practiceStudentService = {
  async getAvailableTests() {
    const response = await api.get("/practice/student/tests", {
      silent: true,
    });
    return response.data;
  },

  async getTestInstructions(testId) {
    if (!testId) {
      throw new Error("Practice test ID is required.");
    }

    const response = await api.get(
      `/practice/student/tests/${testId}`,
      { silent: true }
    );

    return response.data;
  },

  async startTest(testId) {
    if (!testId) {
      throw new Error("Practice test ID is required.");
    }

    const response = await api.post(
      `/practice/student/tests/${testId}/start`,
      {},
      { silent: true }
    );

    return response.data;
  },

  async getAttemptHistory() {
    const response = await api.get("/practice/student/attempts", {
      silent: true,
    });
    return response.data;
  },

  async getAttempt(attemptId) {
    if (!attemptId) {
      throw new Error("Attempt ID is required.");
    }

    const response = await api.get(
      `/practice/student/attempts/${attemptId}`,
      { silent: true }
    );

    return response.data;
  },

  async saveAnswers(attemptId, answers) {
    const response = await api.patch(
      `/practice/student/attempts/${attemptId}/answers`,
      { answers },
      { silent: true }
    );

    return response.data;
  },

  async submitTest(attemptId, answers) {
    const response = await api.post(
      `/practice/student/attempts/${attemptId}/submit`,
      { answers },
      { silent: true }
    );

    return response.data;
  },
};

export default practiceStudentService;
