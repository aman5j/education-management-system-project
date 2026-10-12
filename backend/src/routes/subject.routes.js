
import express from "express";

import {
  createSubject,
  getSubjects,
  getSubjectById,
  updateSubject,
  updateSubjectStatus,
  deleteSubject,
} from "../controllers/subject.controller.js";

import {
  getSubjectQuestionBank,
  addSubjectQuestion,
  updateSubjectQuestion,
  deleteSubjectQuestion,
  importSubjectQuestions,
} from "../controllers/subjectQuestionBank.controller.js";


import {
  authenticate,
  authorizeRoles,
} from "../middleware/auth.middleware.js";

const router = express.Router();

// Protect every Subject Management endpoint.
// Only the existing admin role can access these routes.
router.use(authenticate);
router.use(authorizeRoles("admin"));

// GET  /api/subjects
// POST /api/subjects
router
  .route("/")
  .get(getSubjects)
  .post(createSubject);


// Embedded Question Bank: questions are stored in Subject.questionBank.
router.get("/:id/question-bank", getSubjectQuestionBank);
router.post("/:id/question-bank", addSubjectQuestion);
router.post("/:id/question-bank/import", importSubjectQuestions);
router.patch(
  "/:id/question-bank/:questionId",
  updateSubjectQuestion
);
router.delete(
  "/:id/question-bank/:questionId",
  deleteSubjectQuestion
);

// GET    /api/subjects/:id
// PATCH  /api/subjects/:id
// DELETE /api/subjects/:id
router
  .route("/:id")
  .get(getSubjectById)
  .patch(updateSubject)
  .delete(deleteSubject);

// PATCH /api/subjects/:id/status
router.patch("/:id/status", updateSubjectStatus);

export default router;
