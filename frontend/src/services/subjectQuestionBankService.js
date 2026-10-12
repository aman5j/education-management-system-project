import api from "./api";

const questionBankUrl = (subjectId) =>
  `/subjects/${subjectId}/question-bank`;

export const getSubjectQuestionBank = (subjectId, params = {}) =>
  api.get(questionBankUrl(subjectId), { params });

export const addSubjectQuestion = (subjectId, question) =>
  api.post(questionBankUrl(subjectId), question);

export const updateSubjectQuestion = (subjectId, questionId, question) =>
  api.patch(`${questionBankUrl(subjectId)}/${questionId}`, question);

export const deleteSubjectQuestion = (subjectId, questionId) =>
  api.delete(`${questionBankUrl(subjectId)}/${questionId}`);

export const importSubjectQuestions = (subjectId, questions) =>
  api.post(`${questionBankUrl(subjectId)}/import`, { questions });