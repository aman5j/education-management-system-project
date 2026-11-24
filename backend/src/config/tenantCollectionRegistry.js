
/**
 * Tenant collection registry
 *
 * All institute data remains in education_management_system.
 * Each institute receives its own collection prefix.
 *
 * Example:
 *   inst_65abc123_students
 *   inst_65abc123_courses
 *
 * Never accept collection names or prefixes from browser input.
 */

export const TENANT_MODEL_REGISTRY = Object.freeze({
  AlertNotice: "alertnotices",
  AlertNoticeDismissal: "alertnoticedismissals",
  Assignment: "assignments",
  AssignmentEvaluation: "assignmentevaluations",
  AssignmentSubmission: "assignmentsubmissions",
  AssignmentSubmissionVersion: "assignmentsubmissionversions",
  Attendance: "attendances",
  Batch: "batches",
  Category: "categories",
  Certificate: "certificates",
  Course: "courses",
  CourseEnquiry: "courseenquiries",
  Exam: "exams",
  ExamAccessRequest: "examaccessrequests",
  ExamResult: "examresults",
  Expense: "expenses",
  HallTicket: "halltickets",
  InstituteLogo: "institutelogos",
  InstituteSettings: "institutesettings",
  LeaveRequest: "leaverequests",
  Note: "notes",
  Notification: "notifications",
  Payment: "payments",
  PracticeAttempt: "practiceattempts",
  PracticeTest: "practicetests",
  Role: "roles",
  Student: "students",
  StudentAdmission: "studentadmissions",
  Subject: "subjects",
  SupportCounter: "supportcounters",
  SupportMessage: "supportmessages",
  SupportTicket: "supporttickets",
  User: "users",
  WebsiteBannerImage: "websitebannerimages",
  WebsiteBannerSettings: "websitebannersettings",
  WebsiteCareerSettings: "websitecareersettings",
  WebsiteCategoryHighlightSettings: "websitecategoryhighlightsettings",
  WebsiteCertificateSectionSettings: "websitecertificatesectionsettings",
  WebsiteContactSettings: "websitecontactsettings",
  WebsiteCourseCategorySettings: "websitecoursecategorysettings",
  WebsiteFooterSettings: "websitefootersettings",
  WebsiteFreeVideoSettings: "websitefreevideosettings",
  WebsiteHeaderSettings: "websiteheadersettings",
  WebsiteMenuSettings: "websitemenusettings",
  WebsitePartnerSettings: "websitepartnersettings",
  WebsitePlacementSettings: "websiteplacementsettings",
  WebsiteStudyResourceSettings: "websitestudyresourcesettings",
  WebsiteTeamSettings: "websiteteamsettings",
  WebsiteTestimonialSettings: "websitetestimonialsettings",
  WebsiteTrendingCourseSettings: "websitetrendingcoursesettings",
});

export const CENTRAL_MODEL_NAMES = Object.freeze([
  "Institute",
  "PlatformUser",
]);

export const TENANT_MODEL_NAMES = Object.freeze(
  Object.keys(TENANT_MODEL_REGISTRY)
);

export const TENANT_COLLECTION_PREFIX_PATTERN =
  /^inst_[a-f0-9]{24}$/i;

export const getTenantCollectionPrefix = (institute) => {
  if (!institute?._id) {
    throw new Error("A valid institute record is required.");
  }

  const id = String(institute._id).toLowerCase();

  if (!/^[a-f0-9]{24}$/.test(id)) {
    throw new Error("Invalid institute identifier.");
  }

  const expectedPrefix = `inst_${id}`;

  if (
    institute.collectionPrefix &&
    institute.collectionPrefix !== expectedPrefix
  ) {
    throw new Error("Institute collection prefix is invalid.");
  }

  return expectedPrefix;
};

export const getTenantCollectionName = (
  institute,
  modelName
) => {
  const baseCollection = TENANT_MODEL_REGISTRY[modelName];

  if (!baseCollection) {
    throw new Error(
      `Model "${modelName}" is not registered as tenant data.`
    );
  }

  const prefix = getTenantCollectionPrefix(institute);

  return `${prefix}_${baseCollection}`;
};

export const isTenantModel = (modelName) =>
  Object.prototype.hasOwnProperty.call(
    TENANT_MODEL_REGISTRY,
    modelName
  );
