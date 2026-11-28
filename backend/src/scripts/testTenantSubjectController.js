import test from "node:test";
import assert from "node:assert/strict";
import mongoose from "mongoose";

import {
  getTenantSubjects,
  getTenantSubject,
  createTenantSubject,
  updateTenantSubject,
  updateTenantSubjectStatus,
  deleteTenantSubject,
} from "../controllers/tenantSubject.controller.js";

const SUBJECT_ID = "6b098f3ecfef527d1a4a93b4";
const COURSE_ID = "6b098f3ecfef527d1a4a93b5";

const createResponse = () => ({
  statusCode: 200,
  body: null,

  status(code) {
    this.statusCode = code;
    return this;
  },

  json(body) {
    this.body = body;
    return this;
  },
});

const makeQuery = (value) => ({
  select() {
    return this;
  },
  sort() {
    return this;
  },
  skip() {
    return this;
  },
  limit() {
    return this;
  },
  lean() {
    return this;
  },
  then(resolve, reject) {
    return Promise.resolve(value).then(resolve, reject);
  },
  catch(reject) {
    return Promise.resolve(value).catch(reject);
  },
});

const createSubjectDocument = (overrides = {}) => ({
  _id: SUBJECT_ID,
  subjectName: "JavaScript",
  subjectCode: "JS101",
  description: "JavaScript fundamentals",
  status: "Active",
  course_id: undefined,
  questionBank: [
    {
      questionText: "What is JavaScript?",
      optionA: "Programming language",
      optionB: "Database",
      optionC: "Operating system",
      optionD: "Browser",
      correctAnswer: "A",
    },
  ],
  deleted: false,

  async deleteOne() {
    this.deleted = true;
  },

  ...overrides,
});

const createRequest = ({
  params = { id: SUBJECT_ID },
  query = {},
  body = {},
  subject = null,
  subjects = [],
  courseExists = true,
  courseUsesSubject = false,
  examUsesSubject = false,
} = {}) => {
  const calls = {
    subjectFind: [],
    subjectCreate: [],
    subjectUpdate: null,
    subjectStatusUpdate: null,
    courseExists: [],
    courseReferenceExists: [],
    examExists: [],
  };

  const Subject = {
    find(filter) {
      calls.subjectFind.push(filter);
      return makeQuery(subjects);
    },

    countDocuments: async () => subjects.length,

    findById(id) {
      return makeQuery(
        subject && String(subject._id) === String(id) ? subject : null
      );
    },

    async create(data) {
      calls.subjectCreate.push(data);
      return createSubjectDocument(data);
    },

    findByIdAndUpdate(id, update, options) {
      calls.subjectUpdate = { id, update, options };

      if (!subject || String(subject._id) !== String(id)) {
        return makeQuery(null);
      }

      Object.assign(subject, update.$set || {});

      if (update.$unset) {
        for (const field of Object.keys(update.$unset)) {
          delete subject[field];
        }
      }

      return makeQuery(subject);
    },
  };

  const Course = {
    exists(filter) {
      if (filter?._id) {
        calls.courseReferenceExists.push(filter);
        return Promise.resolve(courseExists ? { _id: filter._id } : null);
      }

      calls.courseExists.push(filter);
      return Promise.resolve(courseUsesSubject ? { _id: COURSE_ID } : null);
    },
  };

  const Exam = {
    exists(filter) {
      calls.examExists.push(filter);
      return Promise.resolve(examUsesSubject ? { _id: COURSE_ID } : null);
    },
  };

  const models = { Subject, Course, Exam };

  return {
    params,
    query,
    body,
    calls,

    getTenantModel(name) {
      if (!models[name]) {
        throw new Error(`Unexpected tenant model: ${name}`);
      }

      return models[name];
    },
  };
};

const failNext = (error) => {
  if (error) throw error;
};

test("lists tenant subjects with pagination metadata", async () => {
  const subject = createSubjectDocument();

  const req = createRequest({ subjects: [subject] });
  const res = createResponse();

  await getTenantSubjects(req, res, failNext);

  assert.equal(res.statusCode, 200);
  assert.equal(res.body.success, true);
  assert.equal(res.body.data.length, 1);
  assert.deepEqual(res.body.pagination, {
    page: 1,
    limit: 10,
    total: 1,
    totalPages: 1,
  });
});

test("subject list excludes Question Bank from list projection", async () => {
  const req = createRequest({
    query: { status: "Active", search: "JavaScript" },
  });
  const res = createResponse();

  await getTenantSubjects(req, res, failNext);

  assert.equal(res.statusCode, 200);
  assert.deepEqual(req.calls.subjectFind[0], {
    status: "Active",
    $or: [
      { subjectName: { $regex: "JavaScript", $options: "i" } },
      { subjectCode: { $regex: "JavaScript", $options: "i" } },
    ],
  });
});

test("rejects an invalid subject status filter", async () => {
  const req = createRequest({
    query: { status: "Pending" },
  });
  const res = createResponse();

  await getTenantSubjects(req, res, failNext);

  assert.equal(res.statusCode, 400);
  assert.equal(res.body.errorCode, "INVALID_STATUS");
});

test("returns a subject by valid tenant subject ID", async () => {
  const subject = createSubjectDocument();
  const req = createRequest({ subject });
  const res = createResponse();

  await getTenantSubject(req, res, failNext);

  assert.equal(res.statusCode, 200);
  assert.equal(res.body.data._id, SUBJECT_ID);
});

test("rejects an invalid subject ID when retrieving a subject", async () => {
  const req = createRequest({
    params: { id: "invalid-id" },
  });
  const res = createResponse();

  await getTenantSubject(req, res, failNext);

  assert.equal(res.statusCode, 400);
  assert.equal(res.body.errorCode, "INVALID_SUBJECT_ID");
});

test("returns 404 when a subject does not exist", async () => {
  const req = createRequest({ subject: null });
  const res = createResponse();

  await getTenantSubject(req, res, failNext);

  assert.equal(res.statusCode, 404);
  assert.equal(res.body.errorCode, "SUBJECT_NOT_FOUND");
});

test("creates a subject with normalized subject code", async () => {
  const req = createRequest({
    body: {
      subjectName: " JavaScript ",
      subjectCode: " js101 ",
      description: " Fundamentals ",
      status: "Active",
    },
  });
  const res = createResponse();

  await createTenantSubject(req, res, failNext);

  assert.equal(res.statusCode, 201);
  assert.equal(req.calls.subjectCreate.length, 1);

  assert.deepEqual(req.calls.subjectCreate[0], {
    subjectName: "JavaScript",
    subjectCode: "JS101",
    description: "Fundamentals",
    status: "Active",
  });
});

test("rejects subject creation without a subject name", async () => {
  const req = createRequest({
    body: { subjectCode: "JS101" },
  });
  const res = createResponse();

  await createTenantSubject(req, res, failNext);

  assert.equal(res.statusCode, 400);
  assert.equal(res.body.errorCode, "SUBJECT_NAME_REQUIRED");
  assert.equal(req.calls.subjectCreate.length, 0);
});

test("rejects subject creation without a subject code", async () => {
  const req = createRequest({
    body: { subjectName: "JavaScript" },
  });
  const res = createResponse();

  await createTenantSubject(req, res, failNext);

  assert.equal(res.statusCode, 400);
  assert.equal(res.body.errorCode, "SUBJECT_CODE_REQUIRED");
  assert.equal(req.calls.subjectCreate.length, 0);
});

test("rejects a subject name outside the allowed length", async () => {
  const req = createRequest({
    body: {
      subjectName: "A",
      subjectCode: "JS101",
    },
  });
  const res = createResponse();

  await createTenantSubject(req, res, failNext);

  assert.equal(res.statusCode, 400);
  assert.equal(res.body.errorCode, "INVALID_SUBJECT_NAME");
});

test("rejects a subject code outside the allowed length", async () => {
  const req = createRequest({
    body: {
      subjectName: "JavaScript",
      subjectCode: "A",
    },
  });
  const res = createResponse();

  await createTenantSubject(req, res, failNext);

  assert.equal(res.statusCode, 400);
  assert.equal(res.body.errorCode, "INVALID_SUBJECT_CODE");
});

test("rejects an invalid subject status", async () => {
  const req = createRequest({
    body: {
      subjectName: "JavaScript",
      subjectCode: "JS101",
      status: "Published",
    },
  });
  const res = createResponse();

  await createTenantSubject(req, res, failNext);

  assert.equal(res.statusCode, 400);
  assert.equal(res.body.errorCode, "INVALID_STATUS");
});

test("accepts an optional valid tenant course reference", async () => {
  const req = createRequest({
    body: {
      subjectName: "JavaScript",
      subjectCode: "JS101",
      course_id: COURSE_ID,
    },
  });
  const res = createResponse();

  await createTenantSubject(req, res, failNext);

  assert.equal(res.statusCode, 201);
  assert.equal(req.calls.subjectCreate[0].course_id, COURSE_ID);
  assert.equal(req.calls.courseReferenceExists.length, 1);
});

test("rejects an invalid course reference during subject creation", async () => {
  const req = createRequest({
    body: {
      subjectName: "JavaScript",
      subjectCode: "JS101",
      course_id: "invalid-id",
    },
  });
  const res = createResponse();

  await createTenantSubject(req, res, failNext);

  assert.equal(res.statusCode, 400);
  assert.equal(res.body.errorCode, "INVALID_COURSE_ID");
  assert.equal(req.calls.subjectCreate.length, 0);
});

test("does not accept Question Bank or syllabus through subject creation", async () => {
  const req = createRequest({
    body: {
      subjectName: "JavaScript",
      subjectCode: "JS101",
      syllabus: "Should not be accepted",
      questionBank: [
        {
          questionText: "Injected question",
          optionA: "A",
          optionB: "B",
          optionC: "C",
          optionD: "D",
          correctAnswer: "A",
        },
      ],
    },
  });
  const res = createResponse();

  await createTenantSubject(req, res, failNext);

  assert.equal(res.statusCode, 201);
  assert.equal(
    Object.hasOwn(req.calls.subjectCreate[0], "questionBank"),
    false
  );
  assert.equal(Object.hasOwn(req.calls.subjectCreate[0], "syllabus"), false);
});

test("updates only supplied subject fields", async () => {
  const subject = createSubjectDocument();

  const req = createRequest({
    subject,
    body: {
      subjectName: "Updated JavaScript",
      description: "Updated description",
    },
  });
  const res = createResponse();

  await updateTenantSubject(req, res, failNext);

  assert.equal(res.statusCode, 200);
  assert.equal(subject.subjectName, "Updated JavaScript");
  assert.equal(subject.description, "Updated description");
  assert.equal(req.calls.subjectUpdate.options.runValidators, true);
  assert.equal(
    Object.hasOwn(req.calls.subjectUpdate.update.$set, "subjectCode"),
    false
  );
});

test("normalizes subject code during update", async () => {
  const subject = createSubjectDocument();

  const req = createRequest({
    subject,
    body: { subjectCode: " new101 " },
  });
  const res = createResponse();

  await updateTenantSubject(req, res, failNext);

  assert.equal(res.statusCode, 200);
  assert.equal(
    req.calls.subjectUpdate.update.$set.subjectCode,
    "NEW101"
  );
});

test("rejects invalid subject update fields", async () => {
  const subject = createSubjectDocument();

  const req = createRequest({
    subject,
    body: { status: "Published" },
  });
  const res = createResponse();

  await updateTenantSubject(req, res, failNext);

  assert.equal(res.statusCode, 400);
  assert.equal(res.body.errorCode, "INVALID_STATUS");
  assert.equal(req.calls.subjectUpdate, null);
});

test("clears the optional course reference when an empty value is supplied", async () => {
  const subject = createSubjectDocument({ course_id: COURSE_ID });

  const req = createRequest({
    subject,
    body: { course_id: "" },
  });
  const res = createResponse();

  await updateTenantSubject(req, res, failNext);

  assert.equal(res.statusCode, 200);
  assert.deepEqual(req.calls.subjectUpdate.update.$unset, { course_id: 1 });
  assert.equal(Object.hasOwn(subject, "course_id"), false);
});

test("rejects an invalid course reference during subject update", async () => {
  const subject = createSubjectDocument();

  const req = createRequest({
    subject,
    body: { course_id: "invalid-id" },
  });
  const res = createResponse();

  await updateTenantSubject(req, res, failNext);

  assert.equal(res.statusCode, 400);
  assert.equal(res.body.errorCode, "INVALID_COURSE_ID");
  assert.equal(req.calls.subjectUpdate, null);
});

test("does not accept Question Bank or syllabus through subject update", async () => {
  const subject = createSubjectDocument();

  const req = createRequest({
    subject,
    body: {
      syllabus: "Injected syllabus",
      questionBank: [],
    },
  });
  const res = createResponse();

  await updateTenantSubject(req, res, failNext);

  assert.equal(res.statusCode, 200);
  assert.deepEqual(req.calls.subjectUpdate.update.$set, {});
  assert.equal(subject.questionBank.length, 1);
});

test("updates subject status to an allowed value", async () => {
  const subject = createSubjectDocument();

  const req = createRequest({
    subject,
    body: { status: "Inactive" },
  });
  const res = createResponse();

  await updateTenantSubjectStatus(req, res, failNext);

  assert.equal(res.statusCode, 200);
  assert.equal(subject.status, "Inactive");
  assert.equal(req.calls.subjectStatusUpdate, null);
});

test("rejects an invalid subject status update", async () => {
  const req = createRequest({
    body: { status: "Published" },
  });
  const res = createResponse();

  await updateTenantSubjectStatus(req, res, failNext);

  assert.equal(res.statusCode, 400);
  assert.equal(res.body.errorCode, "INVALID_STATUS");
});

test("blocks deletion when a tenant course uses the subject", async () => {
  const subject = createSubjectDocument();

  const req = createRequest({
    subject,
    courseUsesSubject: true,
  });
  const res = createResponse();

  await deleteTenantSubject(req, res, failNext);

  assert.equal(res.statusCode, 409);
  assert.equal(res.body.errorCode, "SUBJECT_IN_USE_BY_COURSE");
  assert.equal(subject.deleted, false);
  assert.equal(req.calls.examExists.length, 0);
});

test("blocks deletion when a tenant exam references the subject", async () => {
  const subject = createSubjectDocument();

  const req = createRequest({
    subject,
    examUsesSubject: true,
  });
  const res = createResponse();

  await deleteTenantSubject(req, res, failNext);

  assert.equal(res.statusCode, 409);
  assert.equal(res.body.errorCode, "SUBJECT_IN_USE_BY_EXAM");
  assert.equal(subject.deleted, false);
});

test("deletes a subject when no tenant course or exam uses it", async () => {
  const subject = createSubjectDocument();

  const req = createRequest({ subject });
  const res = createResponse();

  await deleteTenantSubject(req, res, failNext);

  assert.equal(res.statusCode, 200);
  assert.equal(subject.deleted, true);
  assert.equal(req.calls.courseExists.length, 1);
  assert.equal(req.calls.examExists.length, 1);
});

test("returns 404 when deleting a subject that does not exist", async () => {
  const req = createRequest({ subject: null });
  const res = createResponse();

  await deleteTenantSubject(req, res, failNext);

  assert.equal(res.statusCode, 404);
  assert.equal(req.calls.courseExists.length, 0);
  assert.equal(req.calls.examExists.length, 0);
});

test("rejects invalid subject ID when deleting a subject", async () => {
  const req = createRequest({
    params: { id: "invalid-id" },
  });
  const res = createResponse();

  await deleteTenantSubject(req, res, failNext);

  assert.equal(res.statusCode, 400);
  assert.equal(res.body.errorCode, "INVALID_SUBJECT_ID");
});