import express from "express";

import studentUpload from "../middleware/studentUpload.middleware.js";

import {
  getMyProfile,
  updateMyProfile,
  uploadMyProfilePhoto,
} from "../controllers/studentProfile.controller.js";

import {
  getMyDocuments,
  viewMyDocument,
  downloadMyDocument,
} from "../controllers/studentPortalDocument.controller.js";

import {
  getMyExamAccessRequest,
  requestMyExamAccess,
} from "../controllers/studentExamAccess.controller.js";

import {
  getMyAdmissionDetails,
} from "../controllers/studentAdmissionDetails.controller.js";

import {
  getMyExams,
  getMyExamInstructions,
  startMyExam,
  submitMyExam,
  getMyExamResults,
  getMyExamResultById,
} from "../controllers/studentExam.controller.js";

import {
  createStudentAccount,
  getStudentDashboard,
  getMyCourses,
  getRecommendedCourses,
  getStudentLoginStatus,
  linkStudentAccount,
  resetStudentLoginPassword,
  getMyAttendance,
  getMyFees,
} from "../controllers/studentPortal.controller.js";

import {
  getMySharedCertificates,
} from "../controllers/certificateSharing.controller.js";

import {
  authenticate,
  authorizeRoles,
} from "../middleware/auth.middleware.js";

const router = express.Router();

// Admin-only account linking.
// These routes must be registered before student-only middleware.
router.post(
  "/admin/link-account",
  authenticate,
  authorizeRoles("admin"),
  linkStudentAccount
);

router.post(
  "/admin/create-account",
  authenticate,
  authorizeRoles("admin"),
  createStudentAccount
);

router.get(
  "/admin/account/:studentId",
  authenticate,
  authorizeRoles("admin"),
  getStudentLoginStatus
);

router.patch(
  "/admin/account/:studentId/password",
  authenticate,
  authorizeRoles("admin"),
  resetStudentLoginPassword
);

// Student-only portal routes.
router.use(authenticate);
router.use(authorizeRoles("student"));

router.get("/dashboard", getStudentDashboard);


// Student profile — always uses the authenticated student's own record.
router.get("/profile", getMyProfile);

router.put("/profile", updateMyProfile);

router.post(
  "/profile/photo",
  studentUpload.single("profileImage"),
  uploadMyProfilePhoto
);


// Student can access only documents belonging to their own account.
router.get("/documents", getMyDocuments);

router.get(
  "/documents/:documentId/view",
  viewMyDocument
);

router.get(
  "/documents/:documentId/download",
  downloadMyDocument
);

router.get(
  "/admission-details",
  getMyAdmissionDetails
);
router.get("/courses", getMyCourses);
router.get("/recommended-courses", getRecommendedCourses);
router.get("/attendance", getMyAttendance);
router.get("/fees", getMyFees);

// Shared certificates belonging only to the authenticated student.
router.get(
  "/certificates",
  getMySharedCertificates
);

router.get("/exams", getMyExams);
router.get("/exams/results", getMyExamResults);
router.get("/exams/results/:resultId", getMyExamResultById);

router.get(
  "/exams/:ticketId/access-request",
  getMyExamAccessRequest
);

router.post(
  "/exams/:ticketId/access-request",
  requestMyExamAccess
);

router.get(
  "/exams/:ticketId/instructions",
  getMyExamInstructions
);

router.post(
  "/exams/:ticketId/start",
  startMyExam
);

router.post(
  "/exams/:ticketId/submit",
  submitMyExam
);

export default router;