import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import morgan from "morgan";
import cookieParser from "cookie-parser";
import path from "path";
import { fileURLToPath } from "url"; // Needed for ES modules path resolution

import authRoutes from "./routes/auth.routes.js";
import dashboardRoutes from "./routes/dashboard.routes.js";
import studentRoutes from "./routes/student.routes.js";
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

import receiptUploadRoutes from
  "./routes/receiptUpload.routes.js";

// import { verifyReceipt } from "./controllers/receipt.controller.js";

// app.get(
//   "/api/verify-receipt/:receiptNo",
//   verifyReceipt
// );



// Setup __dirname equivalent for ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

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

app.use(
  cors({
    origin: [
      "http://localhost:5173",
      "https://education-management-frontend.netlify.app",
      process.env.FRONTEND_URL // keeps support for any environment variable you set later
    ].filter(Boolean), // safely removes undefined values if the env variable isn't set
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

app.use(express.json({ limit: "1mb" }));
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

app.use("/api/auth", authRoutes);

app.use(
  "/api/dashboard",
  dashboardRoutes
);

app.use(
  "/api/students",
  studentRoutes
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
  "/api/receipts",
  receiptUploadRoutes
);



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