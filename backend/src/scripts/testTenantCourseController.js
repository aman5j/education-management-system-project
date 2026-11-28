
import test from "node:test";
import assert from "node:assert/strict";
import mongoose from "mongoose";

import {
  getTenantCourses,
  getTenantCourse,
  createTenantCourse,
  updateTenantCourse,
  updateTenantCourseStatus,
  deleteTenantCourse,
} from "../controllers/tenantCourse.controller.js";

const COURSE_ID = "6b098f3ecfef527d1a4a93b4";
const SUBJECT_ID = "6b098f3ecfef527d1a4a93b5";

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

const makeQuery = (value) => {
  const query = {
    populate() { return this; },
    select() { return this; },
    sort() { return this; },
    skip() { return this; },
    limit() { return this; },
    lean() { return this; },
    then(resolve, reject) {
      return Promise.resolve(value).then(resolve, reject);
    },
    catch(reject) {
      return Promise.resolve(value).catch(reject);
    },
  };

  return query;
};

const createCourseDocument = (overrides = {}) => ({
  _id: COURSE_ID,
  courseTitle: "MERN Development",
  courseType: "Online",
  courseCategory: "Technology",
  mrp: 10000,
  price: 8000,
  displayOrder: 1,
  duration: 6,
  durationUnit: "Months",
  courseImage: "",
  previewVideo: "",
  totalLectures: 20,
  practicalMarks: 0,
  objectiveMarks: 0,
  description: "",
  syllabus: "",
  eligibility: "",
  certificateSubject: "",
  popular: false,
  recommended: false,
  mrpVisible: true,
  hideExamResult: false,
  status: "Draft",
  subjects: [],
  saved: false,
  deleted: false,

  async save() {
    this.saved = true;
    return this;
  },

  async deleteOne() {
    this.deleted = true;
  },

  ...overrides,
});

const createRequest = ({
  params = { id: COURSE_ID },
  query = {},
  body = {},
  course = null,
  category = { categoryName: "Technology", status: "Active" },
  subjectCount = 0,
  dependencyCounts = {},
} = {}) => {
  const calls = {
    courseFind: [],
    courseCreate: [],
    categoryFind: [],
    subjectCount: [],
    dependencyCount: [],
  };

  const models = {
    Course: {
      find(filter) {
        calls.courseFind.push(filter);
        return makeQuery([course].filter(Boolean));
      },

      countDocuments: async () => course ? 1 : 0,

      findById(id) {
        return makeQuery(course && String(course._id) === String(id) ? course : null);
      },

      async create(data) {
        calls.courseCreate.push(data);
        return createCourseDocument(data);
      },

      findByIdAndUpdate(id, update, options) {
        calls.statusUpdate = { id, update, options };
        if (!course || String(course._id) !== String(id)) {
          return makeQuery(null);
        }

        Object.assign(course, update.$set || {});
        return makeQuery(course);
      },
    },

    Category: {
      findOne(filter) {
        calls.categoryFind.push(filter);
        return {
          select() {
            return Promise.resolve(category);
          },
        };
      },
    },

    Subject: {
      countDocuments(filter) {
        calls.subjectCount.push(filter);
        return Promise.resolve(subjectCount);
      },
    },
  };

  const dependencyNames = [
    "StudentAdmission",
    "Batch",
    "Attendance",
    "Exam",
    "Certificate",
    "PracticeTest",
    "Assignment",
    "HallTicket",
  ];

  for (const name of dependencyNames) {
    models[name] = {
      countDocuments(filter) {
        calls.dependencyCount.push({ name, filter });
        return Promise.resolve(dependencyCounts[name] || 0);
      },
    };
  }

  return {
    params,
    query,
    body,
    calls,

    getTenantModel(modelName) {
      if (!models[modelName]) {
        throw new Error(`Unexpected tenant model: ${modelName}`);
      }

      return models[modelName];
    },
  };
};

const failNext = (error) => {
  if (error) throw error;
};

test("lists tenant courses with pagination metadata", async () => {
  const course = createCourseDocument();

  const req = createRequest({ course });
  const res = createResponse();

  await getTenantCourses(req, res, failNext);

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

test("applies supported course filters and safe sorting", async () => {
  const req = createRequest({
    query: {
      status: "Published",
      courseType: "online",
      courseCategory: "Technology",
      search: "MERN",
      page: "2",
      limit: "5",
      sortBy: "courseTitle",
      sortOrder: "desc",
    },
  });

  const res = createResponse();

  await getTenantCourses(req, res, failNext);

  assert.equal(res.statusCode, 200);
  assert.deepEqual(req.calls.courseFind[0].status, "Published");
  assert.deepEqual(req.calls.courseFind[0].courseType, "Online");
  assert.deepEqual(req.calls.courseFind[0].courseCategory, {
    $regex: "Technology",
    $options: "i",
  });
  assert.equal(req.calls.courseFind[0].$or.length, 3);
  assert.equal(res.body.pagination.page, 2);
  assert.equal(res.body.pagination.limit, 5);
});

test("rejects an invalid course status filter", async () => {
  const req = createRequest({
    query: { status: "Pending" },
  });
  const res = createResponse();

  await getTenantCourses(req, res, failNext);

  assert.equal(res.statusCode, 400);
  assert.equal(res.body.success, false);
});

test("rejects an invalid course type filter", async () => {
  const req = createRequest({
    query: { courseType: "Hybrid" },
  });
  const res = createResponse();

  await getTenantCourses(req, res, failNext);

  assert.equal(res.statusCode, 400);
});

test("returns a course by valid tenant course ID", async () => {
  const course = createCourseDocument();
  const req = createRequest({ course });
  const res = createResponse();

  await getTenantCourse(req, res, failNext);

  assert.equal(res.statusCode, 200);
  assert.equal(res.body.data._id, COURSE_ID);
});

test("rejects an invalid course ID when retrieving a course", async () => {
  const req = createRequest({
    params: { id: "invalid-id" },
  });
  const res = createResponse();

  await getTenantCourse(req, res, failNext);

  assert.equal(res.statusCode, 400);
  assert.equal(res.body.errorCode, "INVALID_COURSE_ID");
});

test("returns 404 when a course does not exist", async () => {
  const req = createRequest({ course: null });
  const res = createResponse();

  await getTenantCourse(req, res, failNext);

  assert.equal(res.statusCode, 404);
  assert.equal(res.body.errorCode, "COURSE_NOT_FOUND");
});

test("creates a course with valid tenant category and subjects", async () => {
  const req = createRequest({
    subjectCount: 1,
    body: {
      courseTitle: "MERN Development",
      courseType: "online",
      courseCategory: "Technology",
      mrp: 10000,
      price: 8000,
      subjects: [SUBJECT_ID],
      status: "Published",
    },
  });

  const res = createResponse();

  await createTenantCourse(req, res, failNext);

  assert.equal(res.statusCode, 201);
  assert.equal(res.body.success, true);
  assert.equal(req.calls.courseCreate.length, 1);

  const saved = req.calls.courseCreate[0];

  assert.equal(saved.courseTitle, "MERN Development");
  assert.equal(saved.courseType, "Online");
  assert.equal(saved.courseCategory, "Technology");
  assert.deepEqual(saved.subjects, [SUBJECT_ID]);
  assert.equal(saved.courseImage, "");
});

test("rejects course creation without a title", async () => {
  const req = createRequest({
    body: {
      courseType: "Online",
      courseCategory: "Technology",
      mrp: 10000,
      price: 8000,
    },
  });
  const res = createResponse();

  await createTenantCourse(req, res, failNext);

  assert.equal(res.statusCode, 400);
  assert.equal(req.calls.courseCreate.length, 0);
});

test("rejects unsupported course type", async () => {
  const req = createRequest({
    body: {
      courseTitle: "MERN Development",
      courseType: "Hybrid",
      courseCategory: "Technology",
      mrp: 10000,
      price: 8000,
    },
  });
  const res = createResponse();

  await createTenantCourse(req, res, failNext);

  assert.equal(res.statusCode, 400);
  assert.equal(req.calls.courseCreate.length, 0);
});

test("rejects a missing or inactive category", async () => {
  const req = createRequest({
    category: null,
    body: {
      courseTitle: "MERN Development",
      courseType: "Online",
      courseCategory: "Technology",
      mrp: 10000,
      price: 8000,
    },
  });
  const res = createResponse();

  await createTenantCourse(req, res, failNext);

  assert.equal(res.statusCode, 400);
  assert.equal(req.calls.courseCreate.length, 0);
});

test("rejects a course price greater than MRP", async () => {
  const req = createRequest({
    body: {
      courseTitle: "MERN Development",
      courseType: "Online",
      courseCategory: "Technology",
      mrp: 5000,
      price: 6000,
    },
  });
  const res = createResponse();

  await createTenantCourse(req, res, failNext);

  assert.equal(res.statusCode, 400);
  assert.equal(req.calls.courseCreate.length, 0);
});

test("rejects invalid or inactive subject assignments", async () => {
  const req = createRequest({
    subjectCount: 0,
    body: {
      courseTitle: "MERN Development",
      courseType: "Online",
      courseCategory: "Technology",
      mrp: 10000,
      price: 8000,
      subjects: [SUBJECT_ID],
    },
  });
  const res = createResponse();

  await createTenantCourse(req, res, failNext);

  assert.equal(res.statusCode, 400);
  assert.equal(res.body.errorCode, "INVALID_SUBJECTS");
  assert.equal(req.calls.courseCreate.length, 0);
});

test("updates course fields while preserving omitted subject assignments", async () => {
  const course = createCourseDocument({
    subjects: [new mongoose.Types.ObjectId(SUBJECT_ID)],
  });

  const req = createRequest({
    course,
    body: {
      courseTitle: "Updated MERN Development",
      price: 7500,
    },
  });
  const res = createResponse();

  await updateTenantCourse(req, res, failNext);

  assert.equal(res.statusCode, 200);
  assert.equal(course.courseTitle, "Updated MERN Development");
  assert.equal(course.price, 7500);
  assert.equal(course.subjects.length, 1);
  assert.equal(course.saved, true);
});

test("updates subject assignments when the subjects field is supplied", async () => {
  const course = createCourseDocument({ subjects: [] });

  const req = createRequest({
    course,
    subjectCount: 1,
    body: { subjects: [SUBJECT_ID] },
  });
  const res = createResponse();

  await updateTenantCourse(req, res, failNext);

  assert.equal(res.statusCode, 200);
  assert.equal(course.subjects.length, 1);
  assert.equal(String(course.subjects[0]), SUBJECT_ID);
});

test("rejects an update that assigns an invalid or inactive subject", async () => {
  const course = createCourseDocument({ subjects: [] });

  const req = createRequest({
    course,
    subjectCount: 0,
    body: { subjects: [SUBJECT_ID] },
  });
  const res = createResponse();

  await updateTenantCourse(req, res, failNext);

  assert.equal(res.statusCode, 400);
  assert.equal(res.body.errorCode, "INVALID_SUBJECTS");
  assert.equal(course.saved, false);
});

test("updates course status only to an allowed value", async () => {
  const course = createCourseDocument();
  const req = createRequest({
    course,
    body: { status: "Published" },
  });
  const res = createResponse();

  await updateTenantCourseStatus(req, res, failNext);

  assert.equal(res.statusCode, 200);
  assert.equal(course.status, "Published");
  assert.equal(req.calls.statusUpdate.options.runValidators, true);
});

test("rejects an invalid course status update", async () => {
  const req = createRequest({
    body: { status: "Pending" },
  });
  const res = createResponse();

  await updateTenantCourseStatus(req, res, failNext);

  assert.equal(res.statusCode, 400);
});

test("blocks course deletion when any tenant dependency exists", async () => {
  const course = createCourseDocument();

  const req = createRequest({
    course,
    dependencyCounts: {
      Batch: 2,
    },
  });
  const res = createResponse();

  await deleteTenantCourse(req, res, failNext);

  assert.equal(res.statusCode, 409);
  assert.equal(res.body.errorCode, "COURSE_IN_USE");
  assert.equal(course.deleted, false);
  assert.equal(req.calls.dependencyCount.length, 8);
});

test("checks all eight tenant dependency collections before deleting an unused course", async () => {
  const course = createCourseDocument();
  const req = createRequest({ course });
  const res = createResponse();

  await deleteTenantCourse(req, res, failNext);

  assert.equal(res.statusCode, 200);
  assert.equal(course.deleted, true);
  assert.equal(req.calls.dependencyCount.length, 8);

  assert.deepEqual(
    req.calls.dependencyCount.map((item) => item.name).sort(),
    [
      "Assignment",
      "Attendance",
      "Batch",
      "Certificate",
      "Exam",
      "HallTicket",
      "PracticeTest",
      "StudentAdmission",
    ]
  );
});

test("returns 404 when deleting a course that does not exist", async () => {
  const req = createRequest({ course: null });
  const res = createResponse();

  await deleteTenantCourse(req, res, failNext);

  assert.equal(res.statusCode, 404);
  assert.equal(req.calls.dependencyCount.length, 0);
});
