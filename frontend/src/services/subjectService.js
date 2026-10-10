
import api from "./api";

// =====================================================
// SUBJECT API SERVICE
// Uses the existing centralized Axios instance.
// Base URL and authentication are handled by api.js.
// =====================================================

const SUBJECT_API = "/subjects";

// =====================================================
// GET ALL SUBJECTS
// Supports search, filters, sorting and pagination.
// =====================================================

export const getSubjects = (params = {}) => {
  return api.get(SUBJECT_API, {
    params,
  });
};

// =====================================================
// GET SUBJECT BY ID
// =====================================================

export const getSubjectById = (id) => {
  if (!id) {
    throw new Error("Subject ID is required.");
  }

  return api.get(`${SUBJECT_API}/${id}`);
};

// =====================================================
// CREATE SUBJECT
// =====================================================

export const createSubject = (subjectData) => {
  return api.post(SUBJECT_API, subjectData);
};

// =====================================================
// UPDATE SUBJECT
// =====================================================

export const updateSubject = (id, subjectData) => {
  if (!id) {
    throw new Error("Subject ID is required.");
  }

  return api.patch(
    `${SUBJECT_API}/${id}`,
    subjectData
  );
};

// =====================================================
// UPDATE SUBJECT STATUS
// =====================================================

export const updateSubjectStatus = (id, status) => {
  if (!id) {
    throw new Error("Subject ID is required.");
  }

  return api.patch(`${SUBJECT_API}/${id}/status`, {
    status,
  });
};

// =====================================================
// DELETE SUBJECT
// =====================================================

export const deleteSubject = (id) => {
  if (!id) {
    throw new Error("Subject ID is required.");
  }

  return api.delete(`${SUBJECT_API}/${id}`);
};
