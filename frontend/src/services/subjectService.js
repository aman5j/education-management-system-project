
import api from "./api";

const SUBJECT_API = "/subjects";

export const getSubjects = (params = {}, config = {}) => {
  return api.get(SUBJECT_API, {
    ...config,
    params,
    silent: true,
  });
};

export const getSubjectById = (id) => {
  if (!id) {
    throw new Error("Subject ID is required.");
  }

  return api.get(`${SUBJECT_API}/${id}`, {
    silent: true,
  });
};

export const createSubject = (subjectData) => {
  return api.post(SUBJECT_API, subjectData, {
    silent: true,
  });
};

export const updateSubject = (id, subjectData) => {
  if (!id) {
    throw new Error("Subject ID is required.");
  }

  return api.patch(`${SUBJECT_API}/${id}`, subjectData, {
    silent: true,
  });
};

export const updateSubjectStatus = (id, status) => {
  if (!id) {
    throw new Error("Subject ID is required.");
  }

  return api.patch(
    `${SUBJECT_API}/${id}/status`,
    { status },
    { silent: true }
  );
};

export const deleteSubject = (id) => {
  if (!id) {
    throw new Error("Subject ID is required.");
  }

  return api.delete(`${SUBJECT_API}/${id}`, {
    silent: true,
  });
};
