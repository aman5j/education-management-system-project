import api from "./api";

// ----------------------------------------------------
// ADMIN NOTES API
// ----------------------------------------------------

export const getNotes = (params = {}) =>
  api.get("/notes", {
    params,
    silent: true,
  });

export const createNote = (formData) =>
  api.post("/notes", formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
    silent: true,
  });

export const updateNote = (id, payload) =>
  api.put(`/notes/${id}`, payload, {
    silent: true,
  });

export const addNoteAttachments = (id, formData) =>
  api.post(`/notes/${id}/attachments`, formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
    silent: true,
  });

export const removeNoteAttachment = (id, fileId) =>
  api.delete(`/notes/${id}/attachments/${fileId}`, {
    silent: true,
  });

export const updateNoteStatus = (id, status) =>
  api.patch(
    `/notes/${id}/status`,
    { status },
    { silent: true }
  );

export const deleteNote = (id) =>
  api.delete(`/notes/${id}`, {
    silent: true,
  });

export const getNoteFile = (
  id,
  fileId,
  action = "view"
) =>
  api.get(`/notes/${id}/files/${fileId}/${action}`, {
    responseType: "blob",
    silent: true,
  });

// ----------------------------------------------------
// STUDENT NOTES API
// Existing student endpoints preserved.
// ----------------------------------------------------

export const getStudentNotes = (params = {}) =>
  api.get("/notes/student", {
    params,
    silent: true,
  });

export const getStudentNote = (id) =>
  api.get(`/notes/student/${id}`, {
    silent: true,
  });

export const getStudentNoteFile = (
  id,
  fileId,
  action = "view"
) =>
  api.get(`/notes/student/${id}/files/${fileId}/${action}`, {
    responseType: "blob",
    silent: true,
  });