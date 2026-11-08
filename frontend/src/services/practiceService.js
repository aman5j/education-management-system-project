import api from "./api";

const BASE_URL = "/practice/admin";

const silentConfig = {
  silent: true,
};

export const getPracticeTests = (params = {}) =>
  api.get(`${BASE_URL}/tests`, {
    params,
    ...silentConfig,
  });

export const getPracticeTest = (id) => {
  if (!id) {
    throw new Error("Practice test ID is required.");
  }

  return api.get(`${BASE_URL}/tests/${id}`, silentConfig);
};

export const createPracticeTest = (data) =>
  api.post(`${BASE_URL}/tests`, data, silentConfig);

export const updatePracticeTest = (id, data) => {
  if (!id) {
    throw new Error("Practice test ID is required.");
  }

  return api.patch(`${BASE_URL}/tests/${id}`, data, silentConfig);
};

export const updatePracticeTestStatus = (id, status) => {
  if (!id) {
    throw new Error("Practice test ID is required.");
  }

  return api.patch(
    `${BASE_URL}/tests/${id}/status`,
    { status },
    silentConfig
  );
};

export const deletePracticeTest = (id) => {
  if (!id) {
    throw new Error("Practice test ID is required.");
  }

  return api.delete(`${BASE_URL}/tests/${id}`, silentConfig);
};

// export const getPracticeAttempts = (params = {}) =>
//   api.get(`${BASE_URL}/attempts`, {
//     params,
//     ...silentConfig,
//   });

// export const getPracticeAttempt = (id) => {
//   if (!id) {
//     throw new Error("Practice attempt ID is required.");
//   }

//   return api.get(`${BASE_URL}/attempts/${id}`, silentConfig);
// };


export const getPracticeAttempts = (params = {}) =>
  api.get(`${BASE_URL}/attempts`, { params });

export const getPracticeAttempt = (id) => {
  if (!id) {
    throw new Error("Practice attempt ID is required.");
  }

  return api.get(`${BASE_URL}/attempts/${id}`);
};