import {
  TENANT_MODEL_NAMES,
  isTenantModel,
} from "../config/tenantCollectionRegistry.js";

const SCHEMA_ONLY_LOADERS = Object.freeze({
  Course: () =>
    import("../models/schemas/Course.schema.js"),

  Subject: () =>
    import("../models/schemas/Subject.schema.js"),

  Role: () =>
    import("../models/schemas/Role.schema.js"),

  User: () =>
    import("../models/schemas/User.schema.js"),

  Student: () =>
    import("../models/schemas/Student.schema.js"),

  Batch: () =>
    import("../models/schemas/Batch.schema.js"),

  Category: () =>
    import("../models/schemas/Category.schema.js"),

  AlertNotice: () =>
    import("../models/schemas/AlertNotice.schema.js"),

  AlertNoticeDismissal: () =>
    import("../models/schemas/AlertNoticeDismissal.schema.js"),

  Assignment: () =>
    import("../models/schemas/Assignment.schema.js"),

  AssignmentEvaluation: () =>
    import("../models/schemas/AssignmentEvaluation.schema.js"),


  Attendance: () =>
    import("../models/schemas/Attendance.schema.js"),

  Certificate: () =>
    import("../models/schemas/Certificate.schema.js"),

  CourseEnquiry: () =>
    import("../models/schemas/CourseEnquiry.schema.js"),

  Expense: () =>
    import("../models/schemas/Expense.schema.js"),


  AssignmentSubmission: () =>
    import("../models/schemas/AssignmentSubmission.schema.js"),

  AssignmentSubmissionVersion: () =>
    import("../models/schemas/AssignmentSubmissionVersion.schema.js"),

  StudentAdmission: () =>
    import("../models/schemas/StudentAdmission.schema.js"),

  Payment: () =>
    import("../models/schemas/Payment.schema.js"),


  Notification: () =>
    import("../models/schemas/Notification.schema.js"),

  SupportTicket: () =>
    import("../models/schemas/SupportTicket.schema.js"),

  SupportMessage: () =>
    import("../models/schemas/SupportMessage.schema.js"),

  SupportCounter: () =>
    import("../models/schemas/SupportCounter.schema.js"),



  LeaveRequest: () =>
    import("../models/schemas/LeaveRequest.schema.js"),

  Note: () =>
    import("../models/schemas/Note.schema.js"),

  PracticeTest: () =>
    import("../models/schemas/PracticeTest.schema.js"),

  PracticeAttempt: () =>
    import("../models/schemas/PracticeAttempt.schema.js"),


  WebsiteBannerSettings: () =>
    import("../models/schemas/WebsiteBannerSettings.schema.js"),

  WebsiteHeaderSettings: () =>
    import("../models/schemas/WebsiteHeaderSettings.schema.js"),

  WebsiteMenuSettings: () =>
    import("../models/schemas/WebsiteMenuSettings.schema.js"),

  WebsiteFooterSettings: () =>
    import("../models/schemas/WebsiteFooterSettings.schema.js"),


  WebsiteCareerSettings: () =>
    import("../models/schemas/WebsiteCareerSettings.schema.js"),

  WebsiteCategoryHighlightSettings: () =>
    import("../models/schemas/WebsiteCategoryHighlightSettings.schema.js"),

  WebsiteCertificateSectionSettings: () =>
    import("../models/schemas/WebsiteCertificateSectionSettings.schema.js"),

  WebsiteContactSettings: () =>
    import("../models/schemas/WebsiteContactSettings.schema.js"),



});

export const TENANT_SCHEMA_ONLY_MODEL_NAMES =
  Object.freeze(Object.keys(SCHEMA_ONLY_LOADERS));

let definitionsPromise = null;

const loadSchemaOnlyModule = async (modelName) => {
  const loader = SCHEMA_ONLY_LOADERS[modelName];

  if (!loader) {
    return null;
  }

  const schemaModule = await loader();
  const schema = schemaModule.default;

  if (
    !schema ||
    typeof schema.clone !== "function" ||
    typeof schema.eachPath !== "function"
  ) {
    throw new Error(
      `${modelName}: schema-only module must export a Mongoose Schema.`
    );
  }

  return schema;
};

const loadLegacyModelSchema = async (modelName) => {
  const modelModule = await import(
    `../models/${modelName}.js`
  );

  const model = modelModule.default;

  if (!model?.schema) {
    throw new Error(
      "Default export does not contain a Mongoose schema."
    );
  }

  if (model.modelName !== modelName) {
    throw new Error(
      `Expected model name "${modelName}", ` +
      `received "${model.modelName || "unknown"}".`
    );
  }

  return model.schema;
};

export const loadTenantModelDefinitions = async () => {
  if (definitionsPromise) {
    return definitionsPromise;
  }

  definitionsPromise = (async () => {
    const definitions = [];
    const failures = [];

    for (const modelName of TENANT_MODEL_NAMES) {
      if (!isTenantModel(modelName)) {
        failures.push(
          `${modelName}: not registered as a tenant model`
        );
        continue;
      }

      try {
        let schema = await loadSchemaOnlyModule(modelName);

        if (!schema) {
          schema = await loadLegacyModelSchema(modelName);
        }

        definitions.push({
          name: modelName,
          schema,
        });
      } catch (error) {
        failures.push(
          `${modelName}: ${error.message}`
        );
      }
    }

    if (failures.length) {
      throw new Error(
        "Tenant schema loading failed:\n" +
        failures.map((item) => `- ${item}`).join("\n")
      );
    }

    if (definitions.length !== TENANT_MODEL_NAMES.length) {
      throw new Error(
        `Expected ${TENANT_MODEL_NAMES.length} schemas, ` +
        `loaded ${definitions.length}.`
      );
    }

    return definitions;
  })();

  try {
    return await definitionsPromise;
  } catch (error) {
    definitionsPromise = null;
    throw error;
  }
};

export const getTenantSchemaLoaderStatus = () => ({
  expectedModels: TENANT_MODEL_NAMES.length,
  schemaOnlyModels: TENANT_SCHEMA_ONLY_MODEL_NAMES.length,
  schemaOnlyModelNames: [...TENANT_SCHEMA_ONLY_MODEL_NAMES],
  loaded: Boolean(definitionsPromise),
});