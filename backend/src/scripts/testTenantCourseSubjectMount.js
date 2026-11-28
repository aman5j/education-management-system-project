
import test from "node:test";
import assert from "node:assert/strict";

import app from "../app.js";

import tenantCourseRoutes from "../routes/tenantCourse.routes.js";
import tenantSubjectRoutes from "../routes/tenantSubject.routes.js";
import tenantStudentDocumentRoutes from "../routes/tenantStudentDocument.routes.js";

import legacyCourseRoutes from "../routes/course.routes.js";
import legacySubjectRoutes from "../routes/subject.routes.js";

const stack = app.router.stack;

const getMountIndex = (router) =>
  stack.findIndex((layer) => layer.handle === router);

const countMounts = (router) =>
  stack.filter((layer) => layer.handle === router).length;

test("tenant Course router is mounted exactly once", () => {
  assert.equal(countMounts(tenantCourseRoutes), 1);
});

test("tenant Subject router is mounted exactly once", () => {
  assert.equal(countMounts(tenantSubjectRoutes), 1);
});

test("tenant Course router matches its correct API prefix", () => {
  const layer = stack[getMountIndex(tenantCourseRoutes)];

  assert.ok(layer);
  assert.equal(layer.match("/api/tenant/courses"), true);
  assert.equal(layer.match("/api/tenant/courses/123"), true);
  assert.equal(layer.match("/api/tenant/subjects"), false);
});

test("tenant Subject router matches its correct API prefix", () => {
  const layer = stack[getMountIndex(tenantSubjectRoutes)];

  assert.ok(layer);
  assert.equal(layer.match("/api/tenant/subjects"), true);
  assert.equal(layer.match("/api/tenant/subjects/123"), true);
  assert.equal(layer.match("/api/tenant/courses"), false);
});

test("specific Course and Subject routers run before generic Student Document router", () => {
  const courseIndex = getMountIndex(tenantCourseRoutes);
  const subjectIndex = getMountIndex(tenantSubjectRoutes);
  const documentIndex = getMountIndex(tenantStudentDocumentRoutes);

  assert.ok(courseIndex >= 0);
  assert.ok(subjectIndex >= 0);
  assert.ok(documentIndex >= 0);

  assert.ok(
    courseIndex < documentIndex,
    "Course router must run before Student Document router"
  );

  assert.ok(
    subjectIndex < documentIndex,
    "Subject router must run before Student Document router"
  );
});

test("legacy Course and Subject routers remain mounted", () => {
  const legacyCourseIndex = getMountIndex(legacyCourseRoutes);
  const legacySubjectIndex = getMountIndex(legacySubjectRoutes);

  assert.ok(legacyCourseIndex >= 0);
  assert.ok(legacySubjectIndex >= 0);

  assert.equal(
    stack[legacyCourseIndex].match("/api/courses"),
    true
  );

  assert.equal(
    stack[legacySubjectIndex].match("/api/subjects"),
    true
  );
});
