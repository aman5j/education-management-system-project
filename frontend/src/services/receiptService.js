import api from "./api";

export const getStudentPayments = (studentId) => {
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

export const verifyReceipt = async (receiptNo) => {
  const API_BASE_URL =
    import.meta.env.VITE_API_BASE_URL ||
    "http://localhost:5000/api";

  const url =
    `${API_BASE_URL}/public/receipts/verify/${encodeURIComponent(
      receiptNo
    )}`;

  const response = await fetch(url);

  const data = await response.json();

  if (!response.ok) {
    const error = new Error(
      data?.message || "Unable to verify receipt."
    );

    error.response = {
      data,
      status: response.status,
    };

    throw error;
  }

  return data;
};