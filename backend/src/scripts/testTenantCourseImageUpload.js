
import test from "node:test";
import assert from "node:assert/strict";

import {
  MAX_FILE_SIZE,
  ALLOWED_MIME_TYPES,
  SIGNATURES,
} from "../middleware/tenantCourseImageUpload.middleware.js";

test("Course image upload limit is 5 MB", () => {
  assert.equal(MAX_FILE_SIZE, 5 * 1024 * 1024);
});

test("only JPEG, PNG and WEBP are accepted", () => {
  assert.deepEqual(
    [...ALLOWED_MIME_TYPES].sort(),
    ["image/jpeg", "image/png", "image/webp"].sort()
  );
});

test("recognizes valid PNG signature", () => {
  const buffer = Buffer.from([
    137, 80, 78, 71, 13, 10, 26, 10,
  ]);

  assert.equal(SIGNATURES["image/png"](buffer), true);
});

test("rejects invalid PNG signature", () => {
  assert.equal(
    SIGNATURES["image/png"](Buffer.from("invalid")),
    false
  );
});

test("recognizes valid JPEG signature", () => {
  const buffer = Buffer.from([0xff, 0xd8, 0xff, 0xe0]);

  assert.equal(SIGNATURES["image/jpeg"](buffer), true);
});

test("rejects invalid JPEG signature", () => {
  assert.equal(
    SIGNATURES["image/jpeg"](Buffer.from("invalid")),
    false
  );
});

test("recognizes valid WEBP signature", () => {
  const buffer = Buffer.alloc(12);
  buffer.write("RIFF", 0);
  buffer.write("WEBP", 8);

  assert.equal(SIGNATURES["image/webp"](buffer), true);
});

test("rejects invalid WEBP signature", () => {
  assert.equal(
    SIGNATURES["image/webp"](Buffer.from("invalid")),
    false
  );
});

test("rejects buffers shorter than required signatures", () => {
  assert.equal(SIGNATURES["image/png"](Buffer.from([137, 80])), false);
  assert.equal(SIGNATURES["image/jpeg"](Buffer.from([255, 216])), false);
  assert.equal(SIGNATURES["image/webp"](Buffer.from("RIFF")), false);
});
