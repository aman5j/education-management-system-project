
import test from "node:test";
import assert from "node:assert/strict";

import {
  getTenantInstituteSettings,
  getTenantPublicInstituteBranding,
  updateTenantInstituteSettings,
  uploadTenantInstituteLogo,
  getTenantInstituteLogo,
} from "../controllers/tenantInstituteSettings.controller.js";

const createResponse = () => ({
  statusCode: 200,
  body: null,
  headers: {},
  binary: null,

  status(code) {
    this.statusCode = code;
    return this;
  },

  json(body) {
    this.body = body;
    return this;
  },

  set(headers) {
    Object.assign(this.headers, headers);
    return this;
  },

  end(value) {
    this.binary = value;
    return this;
  },
});

const createNext = () => {
  const calls = [];

  const next = (error) => calls.push(error || null);
  next.calls = calls;

  return next;
};

const createRequest = (overrides = {}) => ({
  body: {},
  params: {},
  headers: {},
  tenantUser: { _id: "admin-institute-a" },
  ...overrides,
});

const createSettingsModel = (overrides = {}) => ({
  async findOne() {
    return null;
  },

  async create(data) {
    return { ...data, _id: "settings-a" };
  },

  async findOneAndUpdate(_filter, update) {
    return {
      ...update.$setOnInsert,
      ...update.$set,
      _id: "settings-a",
    };
  },

  ...overrides,
});

const createLogoModel = (overrides = {}) => ({
  async create(data) {
    return { ...data, _id: "logo-a" };
  },

  find() {
    return {
      sort() {
        return this;
      },
      skip() {
        return this;
      },
      select() {
        return this;
      },
      async lean() {
        return [];
      },
    };
  },

  async deleteOne() {
    return { deletedCount: 1 };
   },

  async deleteMany() {
    return { deletedCount: 0 };
  },

  findOne() {
    return {
      select: async () => null,
    };
  },

  ...overrides,
});

const createTenantRequest = (
  settingsModel,
  logoModel = createLogoModel(),
  overrides = {}
) =>
  createRequest({
    getTenantModel(modelName) {
      if (modelName === "InstituteSettings") return settingsModel;
      if (modelName === "InstituteLogo") return logoModel;
      throw new Error("Unexpected model: " + modelName);
    },
    ...overrides,
  });

const validPng = Buffer.from([
  137, 80, 78, 71, 13, 10, 26, 10,
  0, 0, 0, 0,
]);

test("settings controller requires tenant model accessor", async () => {
  const req = createRequest();
  const res = createResponse();
  const next = createNext();

  await getTenantInstituteSettings(req, res, next);

  assert.equal(next.calls.length, 1);
  assert.match(
    next.calls[0].message,
    /TENANT_MODEL_ACCESSOR_UNAVAILABLE/
  );
});


test("returns default institute settings using atomic upsert", async () => {
  let receivedFilter;
  let receivedUpdate;
  let receivedOptions;

  const settingsModel = createSettingsModel({
    async findOneAndUpdate(filter, update, options) {
      receivedFilter = filter;
      receivedUpdate = update;
      receivedOptions = options;

      return {
        key: "default",
        country: "India",
        controllerDesignation: "Examination Controller",
      };
    },
  });

  const req = createTenantRequest(settingsModel);
  const res = createResponse();

  await getTenantInstituteSettings(req, res, createNext());

  assert.equal(res.statusCode, 200);
  assert.equal(res.body.success, true);
  assert.equal(res.body.data.settings.key, "default");
  assert.equal(res.body.data.settings.country, "India");

  assert.deepEqual(receivedFilter, { key: "default" });
  assert.equal(receivedUpdate.$setOnInsert.key, "default");
  assert.equal(receivedUpdate.$setOnInsert.country, "India");
  assert.equal(receivedOptions.upsert, true);
  assert.equal(receivedOptions.new, true);
});



test("recovers from concurrent default settings initialization", async () => {
  const existing = {
    key: "default",
    instituteName: "Institute A",
  };

  const duplicateKeyError = Object.assign(
    new Error("Duplicate key"),
    { code: 11000 }
  );

  let findOneCalled = false;

  const settingsModel = createSettingsModel({
    async findOneAndUpdate() {
      throw duplicateKeyError;
    },

    async findOne(filter) {
      findOneCalled = true;
      assert.deepEqual(filter, { key: "default" });
      return existing;
    },
  });

  const req = createTenantRequest(settingsModel);
  const res = createResponse();
  const next = createNext();

  await getTenantInstituteSettings(req, res, next);

  assert.equal(findOneCalled, true);
  assert.equal(res.statusCode, 200);
  assert.equal(res.body.data.settings, existing);
  assert.equal(next.calls.length, 0);
});


test("public branding returns only the logo URL", async () => {
  let selectedFields;

  const settingsModel = createSettingsModel({
    findOne() {
      return {
        select(fields) {
          selectedFields = fields;
          return {
            async lean() {
              return { logoUrl: "/logo/a.png" };
            },
          };
        },
      };
    },
  });

  const req = createTenantRequest(settingsModel);
  const res = createResponse();

  await getTenantPublicInstituteBranding(
    req,
    res,
    createNext()
  );

  assert.equal(res.statusCode, 200);
  assert.equal(selectedFields, "logoUrl");
  assert.deepEqual(
    res.body.data.branding,
    { logoUrl: "/logo/a.png" }
  );
});

test("public branding returns an empty logo URL when settings do not exist", async () => {
  const settingsModel = createSettingsModel({
    findOne() {
      return {
        select() {
          return {
            async lean() {
              return null;
            },
          };
        },
      };
    },
  });

  const req = createTenantRequest(settingsModel);
  const res = createResponse();

  await getTenantPublicInstituteBranding(
    req,
    res,
    createNext()
  );

  assert.deepEqual(
    res.body.data.branding,
    { logoUrl: "" }
  );
});

test("updates only allowed settings fields and records authenticated admin", async () => {
  let receivedUpdate;

  const settingsModel = createSettingsModel({
    async findOneAndUpdate(filter, update, options) {
      receivedUpdate = { filter, update, options };
      return {
        ...update.$set,
        key: "default",
      };
    },
  });

  const req = createTenantRequest(settingsModel, undefined, {
    body: {
      instituteName: "  Institute A  ",
      email: "admin@example.com",
      showOwnerOnCertificate: true,
      updatedBy: "attacker-id",
      logoUrl: "/attacker-logo.png",
      key: "attacker-key",
    },
  });

  const res = createResponse();

  await updateTenantInstituteSettings(req, res, createNext());

  assert.equal(res.statusCode, 200);
  assert.equal(res.body.success, true);

  assert.equal(
    receivedUpdate.filter.key,
    "default"
  );

  assert.equal(
    receivedUpdate.update.$set.instituteName,
    "Institute A"
  );

  assert.equal(
    receivedUpdate.update.$set.email,
    "admin@example.com"
  );

  assert.equal(
    receivedUpdate.update.$set.showOwnerOnCertificate,
    true
  );

  assert.equal(
    receivedUpdate.update.$set.updatedBy,
    "admin-institute-a"
  );

  assert.equal(
    Object.hasOwn(receivedUpdate.update.$set, "logoUrl"),
    false
  );

  assert.equal(
    Object.hasOwn(receivedUpdate.update.$set, "key"),
    false
  );

  assert.equal(
    receivedUpdate.options.upsert,
    true
  );
});

test("rejects institute names shorter than two characters", async () => {
  const settingsModel = createSettingsModel();
  const req = createTenantRequest(settingsModel, undefined, {
    body: { instituteName: "A" },
  });

  const res = createResponse();

  await updateTenantInstituteSettings(req, res, createNext());

  assert.equal(res.statusCode, 400);
  assert.match(res.body.message, /Institute name/);
});

test("rejects invalid institute email", async () => {
  const settingsModel = createSettingsModel();
  const req = createTenantRequest(settingsModel, undefined, {
    body: { email: "invalid-email" },
  });

  const res = createResponse();

  await updateTenantInstituteSettings(req, res, createNext());

  assert.equal(res.statusCode, 400);
  assert.match(res.body.message, /valid institute email/);
});

test("rejects invalid controller email", async () => {
  const settingsModel = createSettingsModel();
  const req = createTenantRequest(settingsModel, undefined, {
    body: { controllerEmail: "invalid-email" },
  });

  const res = createResponse();

  await updateTenantInstituteSettings(req, res, createNext());

  assert.equal(res.statusCode, 400);
  assert.match(res.body.message, /valid controller email/);
});

test("rejects website URLs using unsupported protocols", async () => {
  const settingsModel = createSettingsModel();
  const req = createTenantRequest(settingsModel, undefined, {
    body: { website: "javascript:alert(1)" },
  });

  const res = createResponse();

  await updateTenantInstituteSettings(req, res, createNext());

  assert.equal(res.statusCode, 400);
  assert.match(res.body.message, /website URL/);
});

test("rejects updates containing no editable fields", async () => {
  const settingsModel = createSettingsModel();
  const req = createTenantRequest(settingsModel, undefined, {
    body: {
      key: "default",
      logoUrl: "/logo.png",
      updatedBy: "fake",
    },
  });

  const res = createResponse();

  await updateTenantInstituteSettings(req, res, createNext());

  assert.equal(res.statusCode, 400);
  assert.match(res.body.message, /No editable settings/);
});

test("rejects logo upload when no file is supplied", async () => {
  const settingsModel = createSettingsModel();
  const logoModel = createLogoModel();

  const req = createTenantRequest(settingsModel, logoModel);
  const res = createResponse();

  await uploadTenantInstituteLogo(req, res, createNext());

  assert.equal(res.statusCode, 400);
  assert.match(res.body.message, /select an institute logo/);
});

test("rejects logo upload when image signature does not match MIME type", async () => {
  const settingsModel = createSettingsModel();
  const logoModel = createLogoModel();

  const req = createTenantRequest(settingsModel, logoModel, {
    file: {
      buffer: Buffer.from("not an image"),
      mimetype: "image/png",
      size: 12,
    },
  });

  const res = createResponse();

  await uploadTenantInstituteLogo(req, res, createNext());

  assert.equal(res.statusCode, 400);
  assert.match(res.body.message, /not a valid JPG, PNG, or WEBP/);
});

test("accepts a valid PNG signature and saves logo to tenant models", async () => {
  let savedLogo;
  let savedSettings;

  const settingsModel = createSettingsModel({
    async findOneAndUpdate(_filter, update) {
      savedSettings = update.$set;
      return {
        ...update.$set,
        key: "default",
      };
    },
  });

  const logoModel = createLogoModel({
    async create(data) {
      savedLogo = data;
      return data;
    },
  });

  const req = createTenantRequest(settingsModel, logoModel, {
    file: {
      buffer: validPng,
      mimetype: "image/png",
      size: validPng.length,
    },
  });

  const res = createResponse();
  const next = createNext();

  await uploadTenantInstituteLogo(req, res, next);

  assert.equal(res.statusCode, 200);
  assert.equal(res.body.success, true);
  assert.equal(savedLogo.contentType, "image/png");
  assert.equal(savedLogo.updatedBy, "admin-institute-a");
  assert.ok(savedLogo.version);
  assert.ok(savedSettings.logoUrl.includes(savedLogo.version));
  assert.equal(next.calls.length, 0);
});

test("logo upload retains only the latest five logo versions", async () => {
  let deleteFilter;

  const settingsModel = createSettingsModel();

  const logoModel = createLogoModel({
    find() {
      return {
        sort() {
          return this;
        },
        skip(count) {
          assert.equal(count, 4);
          return this;
        },
        select() {
          return this;
        },
        async lean() {
          return [{ _id: "old-logo-id" }];
        },
      };
    },

    async deleteMany(filter) {
      deleteFilter = filter;
      return { deletedCount: 1 };
    },
  });

  const req = createTenantRequest(settingsModel, logoModel, {
    file: {
      buffer: validPng,
      mimetype: "image/png",
      size: validPng.length,
    },
  });

  const res = createResponse();

  await uploadTenantInstituteLogo(req, res, createNext());

  assert.equal(res.statusCode, 200);
  assert.deepEqual(deleteFilter, {
    _id: { $in: ["old-logo-id"] },
  });
});

test("retrieves a tenant logo and returns image headers", async () => {
  const image = validPng;

  const logoModel = createLogoModel({
    findOne() {
      return {
        select: async () => ({
          version: "logo-version-a",
          contentType: "image/png",
          data: image,
          size: image.length,
        }),
      };
    },
  });

  const settingsModel = createSettingsModel();
  const req = createTenantRequest(settingsModel, logoModel, {
    params: { version: "logo-version-a" },
  });

  const res = createResponse();

  await getTenantInstituteLogo(req, res, createNext());

  assert.equal(res.statusCode, 200);
  assert.equal(res.headers["Content-Type"], "image/png");
  assert.equal(res.headers.ETag, '"logo-version-a"');
  assert.equal(
    res.headers["X-Content-Type-Options"],
    "nosniff"
  );
  assert.deepEqual(res.binary, image);
});

test("returns 404 when requested logo version does not exist", async () => {
  const logoModel = createLogoModel({
    findOne() {
      return {
        select: async () => null,
      };
    },
  });

  const settingsModel = createSettingsModel();
  const req = createTenantRequest(settingsModel, logoModel, {
    params: { version: "missing-version" },
  });

  const res = createResponse();

  await getTenantInstituteLogo(req, res, createNext());

  assert.equal(res.statusCode, 404);
  assert.match(res.body.message, /logo not found/);
});

test("returns 304 when logo ETag matches request", async () => {
  const logoModel = createLogoModel({
    findOne() {
      return {
        select: async () => ({
          version: "logo-version-a",
          contentType: "image/png",
          data: validPng,
          size: validPng.length,
        }),
      };
    },
  });

  const settingsModel = createSettingsModel();
  const req = createTenantRequest(settingsModel, logoModel, {
    params: { version: "logo-version-a" },
    headers: {
      "if-none-match": '"logo-version-a"',
    },
  });

  const res = createResponse();

  await getTenantInstituteLogo(req, res, createNext());

  assert.equal(res.statusCode, 304);
});




test("public branding only requests InstituteSettings tenant model", async () => {
  const requestedModels = [];

  const settingsModel = createSettingsModel({
    findOne() {
      return {
        select() {
          return {
            async lean() {
              return { logoUrl: "/tenant/logo.png" };
            },
          };
        },
      };
    },
  });

  const req = createRequest({
    getTenantModel(modelName) {
      requestedModels.push(modelName);

      if (modelName === "InstituteSettings") {
        return settingsModel;
      }

      throw new Error("Unexpected model access: " + modelName);
    },
  });

  const res = createResponse();

  await getTenantPublicInstituteBranding(req, res, createNext());

  assert.deepEqual(requestedModels, ["InstituteSettings"]);
  assert.equal(res.statusCode, 200);
});

test("settings update does not request InstituteLogo model", async () => {
  const requestedModels = [];

  const settingsModel = createSettingsModel();

  const req = createRequest({
    body: { instituteName: "Institute A" },

    getTenantModel(modelName) {
      requestedModels.push(modelName);

      if (modelName === "InstituteSettings") {
        return settingsModel;
      }

      throw new Error("Unexpected model access: " + modelName);
    },
  });

  const res = createResponse();

  await updateTenantInstituteSettings(req, res, createNext());

  assert.deepEqual(requestedModels, ["InstituteSettings"]);
  assert.equal(res.statusCode, 200);
});

test("cleans newly created logo when settings update fails", async () => {
  let createdVersion;
  let deletedVersion;

  const settingsModel = createSettingsModel({
    async findOneAndUpdate() {
      throw new Error("SETTINGS_DATABASE_FAILURE");
    },
  });

  const logoModel = createLogoModel({
    async create(data) {
      createdVersion = data.version;
      return data;
    },

    async deleteOne(filter) {
      deletedVersion = filter.version;
      return { deletedCount: 1 };
    },
  });

  const req = createTenantRequest(settingsModel, logoModel, {
    file: {
      buffer: validPng,
      mimetype: "image/png",
      size: validPng.length,
    },
  });

  const res = createResponse();
  const next = createNext();

  await uploadTenantInstituteLogo(req, res, next);

  assert.ok(createdVersion);
  assert.equal(deletedVersion, createdVersion);
  assert.equal(next.calls.length, 1);
  assert.match(next.calls[0].message, /SETTINGS_DATABASE_FAILURE/);
});
