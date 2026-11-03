
import api from "./api";

const practiceStudentService = {
  async getAvailableTests() {
    const response = await api.get("/practice/student/tests");
    return response.data;
  },

  async getTestInstructions(testId) {
    if (!testId) {
      throw new Error("Practice test ID is required.");
    }

    const response = await api.get(
      `/practice/student/tests/${testId}`
    );

    return response.data;
  },

  async startTest(testId) {
    if (!testId) {
      throw new Error("Practice test ID is required.");
    }

    const response = await api.post(
      `/practice/student/tests/${testId}/start`
    );

    return response.data;
  },

  async getAttemptHistory() {
    const response = await api.get("/practice/student/attempts");
    return response.data;
  },

  async getAttempt(attemptId) {
    if (!attemptId) {
      throw new Error("Attempt ID is required.");
    }

    const response = await api.get(
      `/practice/student/attempts/${attemptId}`
    );

    return response.data;
  },

  async saveAnswers(attemptId, answers) {
    const response = await api.patch(
      `/practice/student/attempts/${attemptId}/answers`,
      { answers }
    );

    return response.data;
  },

  async submitTest(attemptId, answers) {
    const response = await api.post(
      `/practice/student/attempts/${attemptId}/submit`,
      { answers }
    );

    return response.data;
  },
};

export default practiceStudentService;
