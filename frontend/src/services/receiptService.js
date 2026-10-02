import api from "./api";

/*
 * Get verified payments belonging to a student.
 */
export const getStudentPayments = (
  studentId
) => {
  return api.get("/payments", {
    params: {
      student_id: studentId,
      status: "Verified",
      page: 1,
      limit: 100,
      sortBy: "payment_date",
      sortOrder: "desc",
    },
  });
};

/*
 * Public receipt verification.
 *
 * This endpoint does NOT require authentication.
 */
export const verifyReceipt = (
  receiptNo
) => {
  const API_BASE_URL =
    import.meta.env.VITE_API_BASE_URL ||
    "http://localhost:5000/api";

  return fetch(
    `${API_BASE_URL}/public/receipts/verify/${encodeURIComponent(
      receiptNo
    )}`
  ).then(async (response) => {
    const data = await response.json();

    if (!response.ok) {
      const error = new Error(
        data?.message ||
          "Unable to verify receipt."
      );

      error.response = {
        data,
        status: response.status,
      };

      throw error;
    }

    return data;
  });
};