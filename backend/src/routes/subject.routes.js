
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

import { authenticate } from "../middleware/auth.middleware.js";
import { requirePermission } from "../middleware/permission.middleware.js";

const router = express.Router();

// Every endpoint requires authentication.
// Admin access is retained by requirePermission middleware.
router.use(authenticate);

// Subject listing and creation
router
  .route("/")
  .get(requirePermission("subjects.view"), getSubjects)
  .post(requirePermission("subjects.create"), createSubject);

// Subject Question Bank
router.get(
  "/:id/question-bank",
  requirePermission("question_bank.view"),
  getSubjectQuestionBank
);

router.post(
  "/:id/question-bank",
  requirePermission("question_bank.manage"),
  addSubjectQuestion
);

router.post(
  "/:id/question-bank/import",
  requirePermission("question_bank.manage"),
  importSubjectQuestions
);

router.patch(
  "/:id/question-bank/:questionId",
  requirePermission("question_bank.manage"),
  updateSubjectQuestion
);

router.delete(
  "/:id/question-bank/:questionId",
  requirePermission("question_bank.manage"),
  deleteSubjectQuestion
);

// View, update, and delete a subject
router
  .route("/:id")
  .get(requirePermission("subjects.view"), getSubjectById)
  .patch(requirePermission("subjects.update"), updateSubject)
  .delete(requirePermission("subjects.delete"), deleteSubject);

// Update subject status
router.patch(
  "/:id/status",
  requirePermission("subjects.update"),
  updateSubjectStatus
);

export default router;




// import express from "express";

// import {
//   createSubject,
//   getSubjects,
//   getSubjectById,
//   updateSubject,
//   updateSubjectStatus,
//   deleteSubject,
// } from "../controllers/subject.controller.js";

// import {
//   getSubjectQuestionBank,
//   addSubjectQuestion,
//   updateSubjectQuestion,
//   deleteSubjectQuestion,
//   importSubjectQuestions,
// } from "../controllers/subjectQuestionBank.controller.js";

// import { authenticate } from "../middleware/auth.middleware.js";
// import { requirePermission } from "../middleware/permission.middleware.js";

// const router = express.Router();

// // Authenticate every endpoint before checking permissions.
// router.use(authenticate);

// // Subject CRUD
// router
//   .route("/")
//   .get(requirePermission("subjects.view"), getSubjects)
//   .post(requirePermission("subjects.create"), createSubject);

// router
//   .route("/:id")
//   .get(requirePermission("subjects.view"), getSubjectById)
//   .patch(requirePermission("subjects.update"), updateSubject)
//   .delete(requirePermission("subjects.delete"), deleteSubject);

// router.patch(
//   "/:id/status",
//   requirePermission("subjects.update"),
//   updateSubjectStatus
// );

// // Subject-specific Question Bank
// router.get(
//   "/:id/question-bank",
//   requirePermission("question_bank.view"),
//   getSubjectQuestionBank
// );

// router.post(
//   "/:id/question-bank",
//   requirePermission("question_bank.manage"),
//   addSubjectQuestion
// );

// router.post(
//   "/:id/question-bank/import",
//   requirePermission("question_bank.manage"),
//   importSubjectQuestions
// );

// router.patch(
//   "/:id/question-bank/:questionId",
//   requirePermission("question_bank.manage"),
//   updateSubjectQuestion
// );

// router.delete(
//   "/:id/question-bank/:questionId",
//   requirePermission("question_bank.manage"),
//   deleteSubjectQuestion
// );

// export default router;
