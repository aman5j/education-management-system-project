import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import morgan from "morgan";
import cookieParser from "cookie-parser";
import path from "path";
import { fileURLToPath } from "url"; // Needed for ES modules path resolution
import platformRoutes from "./routes/platform.routes.js";

// superadmin part urls 
import tenantAuthRoutes from "./routes/tenantAuth.routes.js";
import tenantStudentDocumentRoutes from "./routes/tenantStudentDocument.routes.js";
import tenantInstituteSettingsRoutes from "./routes/tenantInstituteSettings.routes.js";
import tenantCategoryRoutes from "./routes/tenantCategory.routes.js";
import tenantCourseRoutes from "./routes/tenantCourse.routes.js";
import tenantSubjectRoutes from "./routes/tenantSubject.routes.js";


import { resolveTenant } from "./middleware/tenantResolver.middleware.js";
import { attachTenantModels } from "./middleware/tenantModelContext.middleware.js";


import authRoutes from "./routes/auth.routes.js";

import roleRoutes from "./routes/role.routes.js";
import staffRoutes from "./routes/staff.routes.js";


import dashboardRoutes from "./routes/dashboard.routes.js";
import studentRoutes from "./routes/student.routes.js";
import studentDocumentRoutes from "./routes/studentDocument.routes.js";
// import admissionRoutes from "./routes/admission.routes.js";
import admissionRoutes from "./routes/admission.routes.js";
import courseRoutes from "./routes/course.routes.js";
import categoryRoutes from "./routes/category.routes.js";
import batchRoutes from "./routes/batch.routes.js";
import paymentRoutes from "./routes/payment.routes.js";
// import receiptRoutes from "./routes/receipt.routes.js";
// import receiptRoutes from "./routes/receipt.routes.js";

import receiptRoutes from "./routes/receipt.routes.js";

import paymentReportRoutes from "./routes/paymentReport.routes.js";
import studentReportRoutes from "./routes/studentReport.routes.js";
import admissionReportRoutes from "./routes/admissionReport.routes.js";
import courseReportRoutes from "./routes/courseReport.routes.js";
import batchReportRoutes from "./routes/batchReport.routes.js";
import feeReportRoutes from "./routes/feeReport.routes.js";
import pendingFeeReportRoutes from "./routes/pendingFeeReport.routes.js";
import expenseReportRoutes from "./routes/expenseReport.routes.js";
import attendanceReportRoutes from "./routes/attendanceReport.routes.js";
import alertNoticeRoutes from "./routes/alertNotice.routes.js";


import notificationRoutes from "./routes/notification.routes.js";

import subjectRoutes from "./routes/subject.routes.js";
import attendanceRoutes from "./routes/attendance.routes.js";

import examRoutes from "./routes/exam.routes.js";
import hallTicketRoutes from "./routes/hallTicket.routes.js";
import publicHallTicketRoutes from "./routes/publicHallTicket.routes.js";
import examResultRoutes from "./routes/examResult.routes.js";

import expenseRoutes from "./routes/expense.routes.js";

import instituteSettingsRoutes from "./routes/instituteSettings.routes.js";


import studentPortalRoutes from "./routes/studentPortal.routes.js";

import examAccessRoutes from "./routes/examAccess.routes.js";

import certificateRoutes from "./routes/certificate.routes.js";
import publicCertificateRoutes from "./routes/publicCertificate.routes.js";


import leaveRequestRoutes from "./routes/leaveRequest.routes.js";
import supportRoutes from "./routes/support.routes.js";
import practiceRoutes from "./routes/practice.routes.js";
import notesRoutes from "./routes/notes.routes.js";
import assignmentRoutes from "./routes/assignment.routes.js";

/* Website Editor routes */
import websiteHeaderRoutes from "./routes/websiteHeader.routes.js";
import websiteMenuRoutes from "./routes/websiteMenu.routes.js";
import websiteBannerRoutes from "./routes/websiteBanner.routes.js";
import websiteCategoryHighlightRoutes from "./routes/websiteCategoryHighlight.routes.js";
import websiteCourseCategoryRoutes from "./routes/websiteCourseCategory.routes.js";
import websiteTrendingCourseRoutes from "./routes/websiteTrendingCourse.routes.js";
import websiteStudyResourceRoutes from "./routes/websiteStudyResource.routes.js";
import websiteCertificateSectionRoutes from "./routes/websiteCertificateSection.routes.js";
import websitePartnerRoutes from "./routes/websitePartner.routes.js";
import websitePlacementRoutes from "./routes/websitePlacement.routes.js";
import websiteTeamRoutes from "./routes/websiteTeam.routes.js";
import websiteFreeVideoRoutes from "./routes/websiteFreeVideo.routes.js";
import websiteCareerRoutes from "./routes/websiteCareer.routes.js";
import websiteTestimonialRoutes from "./routes/websiteTestimonial.routes.js";
import websiteContactRoutes from "./routes/websiteContact.routes.js";
import courseEnquiryRoutes from "./routes/courseEnquiry.routes.js";
import websiteFooterRoutes from "./routes/websiteFooter.routes.js";




// import receiptUploadRoutes from
//   "./routes/receiptUpload.routes.js";

// import { verifyReceipt } from "./controllers/receipt.controller.js";

// app.get(
//   "/api/verify-receipt/:receiptNo",
//   verifyReceipt
// );



// Setup __dirname equivalent for ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();


const trustProxySetting = process.env.TRUST_PROXY?.trim();

if (trustProxySetting) {
  let trustProxyValue;

  if (trustProxySetting === "true") {
    if (process.env.NODE_ENV === "production") {
      throw new Error(
        "TRUST_PROXY=true is not allowed in production. " +
        "Configure a specific trusted proxy hop count or IP range."
      );
    }

    trustProxyValue = true;
  } else if (trustProxySetting === "false") {
    trustProxyValue = false;
  } else if (/^\d+$/.test(trustProxySetting)) {
    trustProxyValue = Number(trustProxySetting);

    if (trustProxyValue > 10) {
      throw new Error(
        "TRUST_PROXY hop count cannot exceed 10."
      );
    }
  } else {
    trustProxyValue = trustProxySetting;
  }

  app.set("trust proxy", trustProxyValue);
}


// app.use(
//   "/uploads",
//   express.static(
//     path.resolve(
//       process.cwd(),
//       "uploads"
//     )
//   )
// );

// app.use(
//   helmet({
//     crossOriginResourcePolicy: false,
//   })
// );

app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" }, // Allow images to be loaded across origins
    contentSecurityPolicy: false, // Disable if it interferes with local asset loading during development
  })
);

// app.use(
//   cors({
//     origin: process.env.FRONTEND_URL || "http://localhost:5173",
//     credentials: true,
//   })
// );

// app.use(
//   cors({
//     origin: [
//       "http://localhost:5173",
//       "https://education-management-frontend.netlify.app",
//       process.env.FRONTEND_URL // keeps support for any environment variable you set later
//     ].filter(Boolean), // safely removes undefined values if the env variable isn't set
//     credentials: true,
//   })
// );

const normalizeOrigin = (value) => {
  if (!value) return null;

  try {
    return new URL(value.trim()).origin;
  } catch {
    throw new Error(
      `Invalid frontend origin configured: ${value}`
    );
  }
};

const allowedOrigins = new Set(
  [
    "http://localhost:5173",
    "https://education-management-frontend.netlify.app",
    normalizeOrigin(process.env.FRONTEND_URL),
    normalizeOrigin(process.env.FRONTEND_PUBLIC_URL),
  ].filter(Boolean)
);

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.has(origin)) {
        return callback(null, true);
      }

      return callback(
        new Error(`CORS blocked this origin: ${origin}`)
      );
    },
    credentials: true,
  })
);

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 300,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many requests. Please try again later.",
  },
});

app.use(apiLimiter);

// app.use(express.json({ limit: "1mb" }));
app.use(express.json({ limit: "12mb" }));
app.use(express.urlencoded({ extended: true }));
// ==========================================
// FIX: Serve Uploaded Files Correctly
// ==========================================
// This ensures images inside the root 'uploads' folder are publicly accessible 
// via http://localhost:<port>/uploads/filename.jpg

// app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));

app.use(
  "/uploads",
  express.static(path.join(__dirname, "../uploads")) // Adjust "../uploads" based on where app.js is relative to your uploads folder
);

// app.use(
//   "/uploads",
//   express.static(
//     path.resolve(
//       process.cwd(),
//       "uploads"
//     )
//   )
// );
// Serve uploaded files
// app.use(
//   "/uploads",
//   express.static(path.join(__dirname, "uploads"))
// );

app.use(cookieParser());

if (process.env.NODE_ENV !== "test") {
  app.use(morgan("dev"));
}

app.get("/api/health", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Education Management System API is running.",
    environment: process.env.NODE_ENV,
  });
});

/*
 * Phase 4B — Tenant Authentication
 *
 * 1. Resolve institute from trusted hostname.
 * 2. Register only that institute's model set.
 * 3. Handle tenant authentication routes.
 */
app.use(
  "/api/tenant/auth",
  resolveTenant,
  attachTenantModels,
  tenantAuthRoutes
);


/*
 * Phase 4E — Batch 2F-1
 * Tenant Course Management APIs
 *
 * Must be mounted before the generic /api/tenant
 * Student Document router to avoid duplicate
 * tenant resolution and authentication.
 */
app.use(
  "/api/tenant/courses",
  tenantCourseRoutes
);

/*
 * Phase 4E — Batch 2F-1
 * Tenant Subject Management APIs
 */
app.use(
  "/api/tenant/subjects",
  tenantSubjectRoutes
);


/*
 * Phase 4D — Batch 3B-3C
 * Tenant Student Document APIs
 *
 * Tenant resolver, model accessor and authentication
 * are applied inside tenantStudentDocument.routes.js.
 */
app.use(
  "/api/tenant",
  tenantStudentDocumentRoutes
);

/*
 * Phase 4E — Batch 1A
 * Tenant Institute Settings APIs
 */
app.use(
  "/api/tenant/institute-settings",
  tenantInstituteSettingsRoutes
);

/*
 * Phase 4E — Batch 1B
 * Tenant Category Management APIs
 */
app.use(
  "/api/tenant/categories",
  tenantCategoryRoutes
);

app.use("/api/auth", authRoutes);
// !!!!! INSERTION START: CENTRAL PLATFORM ROUTES !!!!!
app.use("/api/platform", platformRoutes);
// !!!!! INSERTION END: CENTRAL PLATFORM ROUTES !!!!!
app.use("/api/roles", roleRoutes);
app.use("/api/staff", staffRoutes);

app.use(
  "/api/dashboard",
  dashboardRoutes
);

app.use(
  "/api/students",
  studentRoutes
);

app.use(
  "/api/students",
  studentDocumentRoutes
);

app.use(
  "/api/admissions",
  admissionRoutes
);

app.use(
  "/api/courses",
  courseRoutes
);

app.use(
  "/api/categories",
  categoryRoutes
);

app.use(
  "/api/batches",
  batchRoutes
);

app.use(
  "/api/payments",
  paymentRoutes
);

app.use(
  "/api/notifications",
  notificationRoutes
);

app.use(
  "/api/alert-notices",
  alertNoticeRoutes
);


app.use("/api/subjects", subjectRoutes);

app.use(
  "/api/attendance",
  attendanceRoutes
);

app.use("/api/leave-requests", leaveRequestRoutes);

app.use("/api/support", supportRoutes);


// app.use(
//   "/api/public/receipts",
//   receiptRoutes
// );

// app.use("/api/public/receipts", receiptRoutes);
app.use("/api/public/receipts", receiptRoutes);

app.use(
  "/api/reports",
  paymentReportRoutes
);

app.use(
  "/api/reports",
  studentReportRoutes
);

app.use(
  "/api/reports",
  admissionReportRoutes
);

app.use(
  "/api/reports",
  courseReportRoutes
);

app.use(
  "/api/reports",
  batchReportRoutes
);

app.use(
  "/api/reports",
  feeReportRoutes
);

app.use(
  "/api/reports",
  pendingFeeReportRoutes
);

app.use("/api/reports", expenseReportRoutes);


app.use("/api/exams", examRoutes);
app.use("/api/practice", practiceRoutes);

app.use("/api/hall-tickets", hallTicketRoutes);
app.use("/api/public/hall-tickets", publicHallTicketRoutes);
app.use("/api/exam-results", examResultRoutes);

app.use("/api/certificates", certificateRoutes);
app.use(
  "/api/public/certificates",
  publicCertificateRoutes
);


app.use(
  "/api/expenses",
  expenseRoutes
);

app.use("/api/reports", attendanceReportRoutes);

app.use(
  "/api/institute-settings",
  instituteSettingsRoutes
);

/* Website Editor routes */
app.use(
  "/api/website-editor",
  websiteHeaderRoutes
);

app.use(
  "/api/website-editor",
  websiteMenuRoutes
);

app.use(
  "/api/website-editor",
  websiteBannerRoutes
);

app.use(
  "/api/website-editor",
  websiteCategoryHighlightRoutes
);

app.use(
  "/api/website-editor",
  websiteCourseCategoryRoutes
);

app.use(
  "/api/website-editor",
  websiteTrendingCourseRoutes
);

app.use(
  "/api/website-editor",
  websiteStudyResourceRoutes
);

app.use(
  "/api/website-editor",
  websiteCertificateSectionRoutes
);

app.use(
  "/api/website-editor",
  websitePartnerRoutes
);

app.use(
  "/api/website-editor",
  websitePlacementRoutes
);

app.use(
  "/api/website-editor",
  websiteTeamRoutes
);

app.use(
  "/api/website-editor",
  websiteFreeVideoRoutes
);

app.use(
  "/api/website-editor",
  websiteCareerRoutes
);

app.use(
  "/api/website-editor",
  websiteTestimonialRoutes
);

app.use(
  "/api/website-editor",
  websiteContactRoutes
);

app.use(
  "/api/course-enquiries",
  courseEnquiryRoutes
);

app.use(
  "/api/website-editor",
  websiteFooterRoutes
);


app.use("/api/student-portal", studentPortalRoutes);
app.use("/api/exam-access-requests", examAccessRoutes);
app.use("/api/notes", notesRoutes);
app.use("/api/assignments", assignmentRoutes);





// app.use(
//   "/api/receipts",
//   receiptUploadRoutes
// );



import { verifyReceipt } from "./controllers/receipt.controller.js";

// app.use("/api/public/receipts", receiptRoutes);

// Compatibility route for old QR codes
app.get("/api/verify-receipt/:receiptNo", (req, res) => {
  const frontendUrl =
    
    "https://education-management-frontend.netlify.app/" ||
    process.env.FRONTEND_URL
    ||
    process.env.CLIENT_URL;

  if (!frontendUrl) {
    return res.status(500).json({
      success: false,
      message: "FRONTEND_URL is not configured on the backend.",
    });
  }

  const cleanFrontendUrl = frontendUrl.replace(/\/+$/, "");

  const verificationUrl =
    `${cleanFrontendUrl}/verify-receipt/${encodeURIComponent(
      req.params.receiptNo
    )}`;

  return res.redirect(verificationUrl);
});


app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.method} ${req.originalUrl} not found.`,
  });
});

app.use((error, req, res, next) => {
  console.error(error);

  if (error.name === "ValidationError") {
    return res.status(400).json({
      success: false,
      message: "Validation failed.",
      errors: Object.values(error.errors).map(
        (item) => item.message
      ),
    });
  }

  if (error.code === 11000) {
    return res.status(409).json({
      success: false,
      message: "A record with the same unique value already exists.",
    });
  }

  return res.status(error.statusCode || 500).json({
    success: false,
    message:
      error.message || "Internal server error.",
  });
});

export default app;