
import test from "node:test";
import assert from "node:assert/strict";

import {
  MAX_FILE_SIZE,
  ALLOWED_MIME_TYPES,
  SIGNATURES,
} from "../middleware/tenantCategoryIconUpload.middleware.js";

test("category icon upload limit is 5 MB", () => {
  assert.equal(
    MAX_FILE_SIZE,
    5 * 1024 * 1024
  );
});

test("only JPEG, PNG and WEBP MIME types are accepted", () => {
  assert.deepEqual(
    [...ALLOWED_MIME_TYPES].sort(),
    [
      "image/jpeg",
      "image/png",
      "image/webp",
    ].sort()
  );
});

test("recognizes a valid PNG signature", () => {
  const buffer = Buffer.from([
    137, 80, 78, 71,
    13, 10, 26, 10,
  ]);

  assert.equal(
    SIGNATURES["image/png"](buffer),
    true
  );
});

test("rejects an invalid PNG signature", () => {
  const buffer = Buffer.from("not-a-png");

  assert.equal(
    SIGNATURES["image/png"](buffer),
    false
  );
});

test("recognizes a valid JPEG signature", () => {
  const buffer = Buffer.from([
    0xff,
    0xd8,
    0xff,
    0xe0,
  ]);

  assert.equal(
    SIGNATURES["image/jpeg"](buffer),
    true
  );
});

test("rejects an invalid JPEG signature", () => {
  const buffer = Buffer.from("not-a-jpeg");

  assert.equal(
    SIGNATURES["image/jpeg"](buffer),
    false
  );
});

test("recognizes a valid WEBP signature", () => {
  const buffer = Buffer.alloc(12);

  buffer.write("RIFF", 0, "ascii");
  buffer.write("WEBP", 8, "ascii");

  assert.equal(
    SIGNATURES["image/webp"](buffer),
    true
  );
});

test("rejects an invalid WEBP signature", () => {
  const buffer = Buffer.from("not-a-webp");

  assert.equal(
    SIGNATURES["image/webp"](buffer),
    false
  );
});

test("rejects buffers too short to contain image signatures", () => {
  assert.equal(
    SIGNATURES["image/png"](Buffer.from([137, 80])),
    false
  );

  assert.equal(
    SIGNATURES["image/jpeg"](Buffer.from([0xff, 0xd8])),
    false
  );

  assert.equal(
    SIGNATURES["image/webp"](Buffer.from("RIFF")),
    false
  );
});
