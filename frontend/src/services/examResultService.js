import api from "./api";

/*
|--------------------------------------------------------------------------
| Admin Update Marks
|--------------------------------------------------------------------------
*/

// Get submitted exam results.
export const getAdminUpdateMarksList = (params = {}) =>
  api.get("/exam-results/admin/update-marks", {
    params,
  });

// Get one result for the marks editor.
export const getAdminFinalResult = (resultId) => {
  if (!resultId) {
    throw new Error("Result ID is required.");
  }

  return api.get(
    `/exam-results/admin/update-marks/${resultId}`
  );
};

// Update only obtained marks.
export const updateAdminFinalResult = (
  resultId,
  payload
) => {
  if (!resultId) {
    throw new Error("Result ID is required.");
  }

  return api.patch(
    `/exam-results/admin/update-marks/${resultId}`,
    payload
  );
};

// Publish the final result.
export const publishAdminFinalResult = (resultId) => {
  if (!resultId) {
    throw new Error("Result ID is required.");
  }

  return api.patch(
    `/exam-results/admin/update-marks/${resultId}/publish`
  );
};

/*
|--------------------------------------------------------------------------
| Admin Exam Answer Sheet
|--------------------------------------------------------------------------
*/

// Read-only submitted answer sheet.
export const getExamResultReview = (resultId) => {
  if (!resultId) {
    throw new Error("Result ID is required.");
  }

  return api.get(
    `/exam-results/${resultId}/review`
  );
};

/*
|--------------------------------------------------------------------------
| Single Exam Result
|--------------------------------------------------------------------------
*/

// Retained for compatibility with existing Admin consumers.
export const getExamResult = (resultId) => {
  if (!resultId) {
    throw new Error("Result ID is required.");
  }

  return api.get(`/exam-results/${resultId}`);
};