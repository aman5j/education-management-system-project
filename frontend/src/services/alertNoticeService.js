
import api from "./api";

export const getAdminAlertNotices = () =>
  api.get("/alert-notices/admin");

export const createAlertNotice = (formData) =>
  api.post("/alert-notices/admin", formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });

export const updateAlertNotice = (id, formData) =>
  api.put(`/alert-notices/admin/${id}`, formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });

export const updateAlertNoticeStatus = (id, status) =>
  api.patch(`/alert-notices/admin/${id}/status`, {
    status,
  });

export const deleteAlertNotice = (id) =>
  api.delete(`/alert-notices/admin/${id}`);

export const getStudentAlertNotices = () =>
  api.get("/alert-notices/student/active", {
    silent: true,
  });

export const dismissStudentAlertNotice = (id) =>
  api.post(
    `/alert-notices/student/${id}/dismiss`,
    {},
    { silent: true }
  );
