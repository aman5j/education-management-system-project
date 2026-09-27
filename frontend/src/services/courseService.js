import api from "./api";

export const getCourses = (params = {}) =>
  api.get("/courses", {
    params,
  });

export const getCourse = (id) =>
  api.get(`/courses/${id}`);

export const createCourse = (formData) =>
  api.post("/courses", formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });

export const updateCourse = (id, formData) =>
  api.put(`/courses/${id}`, formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });

export const deleteCourse = (id) =>
  api.delete(`/courses/${id}`);

export const updateCourseStatus = (id, status) =>
  api.patch(`/courses/${id}/status`, {
    status,
  });