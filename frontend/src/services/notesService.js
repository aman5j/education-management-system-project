
import api from "./api";

export const getNotes = (params = {}) =>
  api.get("/notes", { params });

export const createNote = (formData) =>
  api.post("/notes", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });

export const updateNote = (id, payload) =>
  api.put(`/notes/${id}`, payload);

export const addNoteAttachments = (id, formData) =>
  api.post(`/notes/${id}/attachments`, formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });

export const removeNoteAttachment = (id, fileId) =>
  api.delete(`/notes/${id}/attachments/${fileId}`);

export const updateNoteStatus = (id, status) =>
  api.patch(`/notes/${id}/status`, { status });

export const deleteNote = (id) =>
  api.delete(`/notes/${id}`);

export const getNoteFile = (id, fileId, action = "view") =>
  api.get(`/notes/${id}/files/${fileId}/${action}`, {
    responseType: "blob",
  });


// ----------------------------------------------------
// STUDENT NOTES API
// ----------------------------------------------------

export const getStudentNotes = (params = {}) =>
  api.get("/notes/student", { params });

export const getStudentNote = (id) =>
  api.get(`/notes/student/${id}`);

export const getStudentNoteFile = (id, fileId, action = "view") =>
  api.get(`/notes/student/${id}/files/${fileId}/${action}`, {
    responseType: "blob",
  });

