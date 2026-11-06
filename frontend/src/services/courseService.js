
import api from "./api";

export const getCourses = (params = {}) =>
  api.get("/courses", {
    params,
    silent: true,
  });

export const getCourse = (id) =>
  api.get(`/courses/${id}`, {
    silent: true,
  });

export const createCourse = (formData) =>
  api.post("/courses", formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
    silent: true,
  });

export const updateCourse = (id, formData) =>
  api.put(`/courses/${id}`, formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
    silent: true,
  });

export const deleteCourse = (id) =>
  api.delete(`/courses/${id}`, {
    silent: true,
  });

export const updateCourseStatus = (id, status) =>
  api.patch(
    `/courses/${id}/status`,
    { status },
    { silent: true }
  );
