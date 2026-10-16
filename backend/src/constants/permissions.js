
export const PERMISSIONS = Object.freeze({
  // Dashboard
  DASHBOARD_VIEW: "dashboard.view",

  // User and account management
  USERS_VIEW: "users.view",
  USERS_CREATE: "users.create",
  USERS_UPDATE: "users.update",
  USERS_SUSPEND: "users.suspend",
  USERS_RESET_PASSWORD: "users.reset_password",

  // Role and permission management
  ROLES_VIEW: "roles.view",
  ROLES_CREATE: "roles.create",
  ROLES_UPDATE: "roles.update",
  ROLES_DELETE: "roles.delete",
  ROLES_MANAGE_PERMISSIONS: "roles.manage_permissions",

  // Students
  STUDENTS_VIEW: "students.view",
  STUDENTS_CREATE: "students.create",
  STUDENTS_UPDATE: "students.update",
  STUDENTS_DELETE: "students.delete",

  // Admissions
  ADMISSIONS_VIEW: "admissions.view",
  ADMISSIONS_CREATE: "admissions.create",
  ADMISSIONS_UPDATE: "admissions.update",
  ADMISSIONS_APPROVE: "admissions.approve",

  // Courses
  COURSES_VIEW: "courses.view",
  COURSES_CREATE: "courses.create",
  COURSES_UPDATE: "courses.update",
  COURSES_DELETE: "courses.delete",

  // Batches
  BATCHES_VIEW: "batches.view",
  BATCHES_CREATE: "batches.create",
  BATCHES_UPDATE: "batches.update",
  BATCHES_DELETE: "batches.delete",

  // Attendance
  ATTENDANCE_VIEW: "attendance.view",
  ATTENDANCE_MANAGE: "attendance.manage",

  // Fees and payments
  FEES_VIEW: "fees.view",
  FEES_MANAGE: "fees.manage",
  PAYMENTS_VIEW: "payments.view",
  PAYMENTS_MANAGE: "payments.manage",

  // Examinations
  EXAMS_VIEW: "exams.view",
  EXAMS_CREATE: "exams.create",
  EXAMS_UPDATE: "exams.update",
  EXAMS_DELETE: "exams.delete",
  EXAMS_APPROVE: "exams.approve",

  // Results and certificates
  RESULTS_VIEW: "results.view",
  RESULTS_MANAGE: "results.manage",
  CERTIFICATES_VIEW: "certificates.view",
  CERTIFICATES_MANAGE: "certificates.manage",

  // Website editing — Admin manages this
  WEBSITE_VIEW: "website.view",
  WEBSITE_MANAGE: "website.manage",
  WEBSITE_PUBLISH: "website.publish",

  // Reports and expenses
  REPORTS_VIEW: "reports.view",
  REPORTS_EXPORT: "reports.export",
  EXPENSES_VIEW: "expenses.view",
  EXPENSES_MANAGE: "expenses.manage",

  // Institute settings
  SETTINGS_MANAGE: "settings.manage",
});

export const ALL_PERMISSION_KEYS = Object.freeze(
  Object.values(PERMISSIONS)
);

// Student self-service permissions.
// These do not grant access to Admin Student Management APIs.
export const STUDENT_PERMISSIONS = Object.freeze([
  "student.dashboard.view",
  "student.profile.view",
  "student.profile.update",
  "student.courses.view",
  "student.attendance.view",
  "student.fees.view",
  "student.payments.view",
  "student.exams.view",
  "student.results.view",
  "student.certificates.view",
  "student.documents.view",
  "student.notifications.view",
]);

export const hasPermission = (
  permissions = [],
  requiredPermission
) => {
  return (
    permissions.includes("*") ||
    permissions.includes(requiredPermission)
  );
};
