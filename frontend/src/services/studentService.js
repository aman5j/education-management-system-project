import api from "./api";

// Get all students (with optional query parameters like filters/pagination)
export const getStudents = async (params) => {
  const response = await api.get("/students", { params });
  return response.data;
};

// Get a single student by ID
export const getStudent = async (id) => {
  const response = await api.get(`/students/${id}`);
  return response.data;
};

// Create a new student (supports multipart/form-data for files like profileImage and signature)
export const createStudent = async (studentData) => {
  const response = await api.post("/students", studentData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });
  return response.data;
};

// Update an existing student
export const updateStudent = async (id, studentData) => {
  const response = await api.put(`/students/${id}`, studentData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });
  return response.data;
};

// Update student status
export const updateStudentStatus = async (id, statusData) => {
  const response = await api.patch(`/students/${id}/status`, statusData);
  return response.data;
};

// Delete a student
export const deleteStudent = async (id) => {
  const response = await api.delete(`/students/${id}`);
  return response.data;
};