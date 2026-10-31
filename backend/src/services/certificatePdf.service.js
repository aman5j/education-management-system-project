
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import { randomUUID } from "crypto";

import PDFDocument from "pdfkit";
import QRCode from "qrcode";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const BACKEND_ROOT = path.resolve(__dirname, "../..");
const UPLOAD_ROOT = path.join(BACKEND_ROOT, "uploads");

const TEMPLATE_PATH = path.join(
  __dirname,
  "../assets/certificate-template.png"
);

const OUTPUT_DIR = path.join(
  UPLOAD_ROOT,
  "certificates"
);

const A4_PORTRAIT = {
  width: 595.28,
  height: 841.89,
};

const MAX_IMAGE_SIZE = 8 * 1024 * 1024;

const safeSegment = (value) =>
  String(value || "certificate")
    .replace(/[^a-zA-Z0-9_-]/g, "_")
    .slice(0, 80);

const isWithin = (parent, candidate) => {
  const relative = path.relative(parent, candidate);

  return (
    relative === "" ||
    (
      !relative.startsWith(`..${path.sep}`) &&
      relative !== ".." &&
      !path.isAbsolute(relative)
    )
  );
};

/*
|--------------------------------------------------------------------------
| Resolve image safely
|--------------------------------------------------------------------------
| Supported:
| /uploads/folder/image.png
| uploads/folder/image.png
| Public HTTPS image URLs
|--------------------------------------------------------------------------
*/

const resolveImage = async (value, label) => {
  if (!value || typeof value !== "string") {
    return null;
  }

  const raw = value.trim();

  if (/^https:\/\//i.test(raw)) {
    const parsed = new URL(raw);

    if (parsed.username || parsed.password) {
      throw new Error(
        `${label} URL must not contain credentials.`
      );
    }

    const host = parsed.hostname.toLowerCase();

    const blockedHost =
      host === "localhost" ||
      host.endsWith(".localhost") ||
      host === "127.0.0.1" ||
      host === "::1" ||
      host.startsWith("10.") ||
      host.startsWith("192.168.") ||
      /^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(host);

    if (blockedHost) {
      throw new Error(
        `${label} must use a public HTTPS image host.`
      );
    }

    const response = await fetch(raw, {
      signal: AbortSignal.timeout(8000),
      redirect: "error",
    });

    if (!response.ok) {
      throw new Error(
        `${label} could not be downloaded.`
      );
    }

    const contentType =
      response.headers.get("content-type") || "";

    if (!contentType.startsWith("image/")) {
      throw new Error(
        `${label} URL did not return an image.`
      );
    }

    const declaredLength = Number(
      response.headers.get("content-length") || 0
    );

    if (declaredLength > MAX_IMAGE_SIZE) {
      throw new Error(
        `${label} exceeds the 8 MB limit.`
      );
    }

    const buffer = Buffer.from(
      await response.arrayBuffer()
    );

    if (buffer.length > MAX_IMAGE_SIZE) {
      throw new Error(
        `${label} exceeds the 8 MB limit.`
      );
    }

    return buffer;
  }

  if (
    /^https?:\/\//i.test(raw) ||
    raw.startsWith("//")
  ) {
    throw new Error(
      `${label} must use HTTPS.`
    );
  }

  let relative;

  if (raw.startsWith("/uploads/")) {
    relative = raw.slice("/uploads/".length);
  } else if (raw.startsWith("uploads/")) {
    relative = raw.slice("uploads/".length);
  } else {
    throw new Error(
      `${label} must be a /uploads/... path or HTTPS URL.`
    );
  }

  const candidate = path.resolve(
    UPLOAD_ROOT,
    relative
  );

  if (!isWithin(UPLOAD_ROOT, candidate)) {
    throw new Error(
      `${label} path is invalid.`
    );
  }

  const stat = await fs.stat(candidate).catch(() => null);

  if (
    !stat?.isFile() ||
    stat.size > MAX_IMAGE_SIZE
  ) {
    throw new Error(
      `${label} file is missing or exceeds 8 MB.`
    );
  }

  return candidate;
};

/*
|--------------------------------------------------------------------------
| Text helpers
|--------------------------------------------------------------------------
*/

const maskBox = (doc, box) => {
  if (!box) return;

  doc
    .save()
    .fillColor("#ffffff")
    .rect(
      box.x,
      box.y,
      box.width,
      box.height
    )
    .fill()
    .restore();
};

const fitText = (
  doc,
  text,
  box,
  options = {}
) => {
  if (!text || !box) return;

  let size = options.fontSize || 12;

  const minSize = options.minFontSize || 7;

  const font = options.font || "Helvetica";

  doc.font(font);

  while (
    size > minSize &&
    doc.widthOfString(String(text)) > box.width
  ) {
    size -= 0.5;
  }

  doc
    .save()
    .font(font)
    .fontSize(size)
    .fillColor(options.color || "#202020")
    .text(String(text), box.x, box.y, {
      width: box.width,
      height: box.height,
      align: options.align || "center",
      lineBreak: false,
      ellipsis: true,
    })
    .restore();
};

const addImage = async (
  doc,
  value,
  box,
  label
) => {
  if (!box) return false;

  const image = await resolveImage(value, label);

  if (!image) return false;

  doc.image(image, box.x, box.y, {
    fit: [box.width, box.height],
    align: "center",
    valign: "center",
  });

  return true;
};

const formatDate = (value) => {
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    timeZone: "Asia/Kolkata",
  }).format(new Date(value));
};

/*
|--------------------------------------------------------------------------
| CERTIFICATE TEMPLATE LAYOUT
|--------------------------------------------------------------------------
| Coordinates use A4 portrait PDF points.
|
| IMPORTANT:
| These are initial layout coordinates.
| Calibrate masks and fields against your actual
| approved certificate-template.png before issuing.
|--------------------------------------------------------------------------
*/

const DEFAULT_LAYOUT = {
  masks: {
    sampleName: {
      x: 70,
      y: 330,
      width: 455,
      height: 46,
    },

    sampleCourse: {
      x: 70,
      y: 397,
      width: 455,
      height: 38,
    },

    samplePhoto: {
      x: 424,
      y: 185,
      width: 95,
      height: 112,
    },

    sampleStudentSignature: {
      x: 95,
      y: 690,
      width: 105,
      height: 46,
    },

    sampleControllerSignature: {
      x: 244,
      y: 690,
      width: 105,
      height: 46,
    },

    sampleOwnerSignature: {
      x: 393,
      y: 690,
      width: 105,
      height: 46,
    },

    sampleCertificateNo: {
      x: 60,
      y: 770,
      width: 215,
      height: 24,
    },

    sampleIssueDate: {
      x: 320,
      y: 770,
      width: 215,
      height: 24,
    },
  },

  fields: {
    instituteName: {
      x: 95,
      y: 72,
      width: 405,
      height: 34,
      fontSize: 21,
      minFontSize: 13,
      font: "Helvetica-Bold",
    },

    studentName: {
      x: 75,
      y: 322,
      width: 445,
      height: 42,
      fontSize: 21,
      minFontSize: 13,
      font: "Helvetica-Bold",
    },

    rollNo: {
      x: 115,
      y: 368,
      width: 365,
      height: 20,
      fontSize: 10,
    },

    courseName: {
      x: 75,
      y: 400,
      width: 445,
      height: 30,
      fontSize: 16,
      minFontSize: 10,
      font: "Helvetica-Bold",
    },

    courseDuration: {
      x: 100,
      y: 439,
      width: 395,
      height: 18,
      fontSize: 10,
    },

    resultSummary: {
      x: 70,
      y: 480,
      width: 455,
      height: 42,
      fontSize: 10,
    },

    certificateNo: {
      x: 64,
      y: 773,
      width: 205,
      height: 18,
      fontSize: 8,
      align: "left",
    },

    issueDate: {
      x: 320,
      y: 773,
      width: 205,
      height: 18,
      fontSize: 8,
      align: "right",
    },

    controllerName: {
      x: 235,
      y: 740,
      width: 125,
      height: 16,
      fontSize: 8,
    },

    ownerName: {
      x: 390,
      y: 740,
      width: 125,
      height: 16,
      fontSize: 8,
    },

    instituteContact: {
      x: 55,
      y: 805,
      width: 485,
      height: 16,
      fontSize: 7,
    },
  },

  images: {
    studentPhoto: {
      x: 424,
      y: 185,
      width: 95,
      height: 112,
    },

    studentSignature: {
      x: 105,
      y: 690,
      width: 85,
      height: 35,
    },

    controllerSignature: {
      x: 255,
      y: 690,
      width: 85,
      height: 35,
    },

    ownerSignature: {
      x: 405,
      y: 690,
      width: 85,
      height: 35,
    },

    instituteLogo: {
      x: 35,
      y: 52,
      width: 55,
      height: 55,
    },

    instituteStamp: {
      x: 472,
      y: 648,
      width: 65,
      height: 65,
    },

    qrCode: {
      x: 27,
      y: 645,
      width: 66,
      height: 66,
    },
  },
};

/*
|--------------------------------------------------------------------------
| Create PDF buffer
|--------------------------------------------------------------------------
*/

const createPdfBuffer = async ({
  certificate,
  settings,
  verificationUrl,
  layout = DEFAULT_LAYOUT,
}) => {
  const templateStat = await fs
    .stat(TEMPLATE_PATH)
    .catch(() => null);

  if (!templateStat?.isFile()) {
    throw new Error(
      `Certificate template missing: ${TEMPLATE_PATH}`
    );
  }

  const chunks = [];

  const doc = new PDFDocument({
    size: [
      A4_PORTRAIT.width,
      A4_PORTRAIT.height,
    ],
    margin: 0,
    compress: true,
  });

  const completed = new Promise((resolve, reject) => {
    doc.on("data", (chunk) => {
      chunks.push(chunk);
    });

    doc.on("end", () => {
      resolve(Buffer.concat(chunks));
    });

    doc.on("error", reject);
  });

  doc.image(TEMPLATE_PATH, 0, 0, {
    width: A4_PORTRAIT.width,
    height: A4_PORTRAIT.height,
  });

  // Hide sample content from template.
  for (const box of Object.values(layout.masks || {})) {
    maskBox(doc, box);
  }

  const fields = layout.fields || {};

  const resultText =
    `${certificate.passStatusSnapshot} | ` +
    `${certificate.obtainedMarksSnapshot}/` +
    `${certificate.totalMarksSnapshot} marks | ` +
    `${Number(certificate.percentageSnapshot).toFixed(2)}% | ` +
    `Grade ${certificate.gradeSnapshot}`;

  const contact = [
    settings.address,
    settings.city,
    settings.state,
    settings.postalCode,
    settings.phone,
    settings.email,
  ]
    .filter(Boolean)
    .join(" | ");

  const values = {
    instituteName: settings.instituteName || "",
    studentName: certificate.studentNameSnapshot,
    rollNo: `Roll No.: ${certificate.rollNoSnapshot || "—"}`,
    courseName: certificate.courseNameSnapshot,

    courseDuration: certificate.courseDurationSnapshot
      ? `Duration: ${certificate.courseDurationSnapshot}`
      : "",

    resultSummary: resultText,

    certificateNo:
      `Certificate No.: ${certificate.certificateNo}`,

    issueDate:
      `Issue Date: ${formatDate(certificate.issueDate)}`,

    controllerName:
      settings.showControllerNameOnCertificate
        ? settings.controllerName
        : "",

    ownerName:
      settings.showOwnerOnCertificate
        ? settings.ownerName
        : "",

    instituteContact: contact,
  };

  for (const [key, value] of Object.entries(values)) {
    fitText(
      doc,
      value,
      fields[key],
      fields[key] || {}
    );
  }

  const images = layout.images || {};

  await addImage(
    doc,
    certificate.studentPhotoSnapshot,
    images.studentPhoto,
    "Student photograph"
  );

  await addImage(
    doc,
    certificate.studentSignatureSnapshot,
    images.studentSignature,
    "Student signature"
  );

  await addImage(
    doc,
    settings.logoUrl,
    images.instituteLogo,
    "Institute logo"
  );

  await addImage(
    doc,
    settings.stampUrl,
    images.instituteStamp,
    "Institute stamp"
  );

  if (settings.showControllerSignatureOnCertificate) {
    await addImage(
      doc,
      settings.controllerSignatureUrl,
      images.controllerSignature,
      "Controller signature"
    );
  }

  if (settings.showOwnerOnCertificate) {
    await addImage(
      doc,
      settings.ownerSignatureUrl,
      images.ownerSignature,
      "Owner signature"
    );
  }

  const qr = await QRCode.toBuffer(
    verificationUrl,
    {
      type: "png",
      errorCorrectionLevel: "H",
      margin: 1,
      width: 320,
    }
  );

  if (images.qrCode) {
    doc.image(
      qr,
      images.qrCode.x,
      images.qrCode.y,
      {
        fit: [
          images.qrCode.width,
          images.qrCode.height,
        ],
      }
    );
  }

  doc.end();

  return completed;
};

/*
|--------------------------------------------------------------------------
| Generate and publish PDF
|--------------------------------------------------------------------------
*/

export const generateCertificatePdf = async ({
  certificate,
  settings,
  verificationUrl,
  layout,
}) => {
  await fs.mkdir(OUTPUT_DIR, {
    recursive: true,
  });

  const fileBase =
    `${safeSegment(certificate.certificateNo)}-${randomUUID()}`;

  const finalName = `${fileBase}.pdf`;

  const tempPath = path.join(
    OUTPUT_DIR,
    `.${fileBase}.tmp`
  );

  const finalPath = path.join(
    OUTPUT_DIR,
    finalName
  );

  try {
    const pdfBuffer = await createPdfBuffer({
      certificate,
      settings,
      verificationUrl,
      layout,
    });

    await fs.writeFile(
      tempPath,
      pdfBuffer,
      { flag: "wx" }
    );

    await fs.rename(
      tempPath,
      finalPath
    );

    return {
      absolutePath: finalPath,
      url: `/uploads/certificates/${finalName}`,
      fileName: finalName,
    };
  } catch (error) {
    await fs.rm(tempPath, {
      force: true,
    }).catch(() => {});

    await fs.rm(finalPath, {
      force: true,
    }).catch(() => {});

    throw error;
  }
};

/*
|--------------------------------------------------------------------------
| Delete generated PDF
|--------------------------------------------------------------------------
*/

export const deleteCertificatePdf = async (
  certificateUrl
) => {
  if (
    !certificateUrl ||
    !certificateUrl.startsWith(
      "/uploads/certificates/"
    )
  ) {
    return;
  }

  const fileName = path.basename(certificateUrl);

  const target = path.resolve(
    OUTPUT_DIR,
    fileName
  );

  if (!isWithin(OUTPUT_DIR, target)) {
    return;
  }

  await fs.rm(target, {
    force: true,
  });
};

export const getCertificateOutputDirectory = () =>
  OUTPUT_DIR;
