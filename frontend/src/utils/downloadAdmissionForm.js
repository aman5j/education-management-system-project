
import { jsPDF } from "jspdf";
import QRCode from "qrcode";
import api from "../services/api";
import instituteSettingsService from "../services/instituteSettingsService";

const COLORS = {
  navy: [13, 54, 96],
  navyDark: [8, 39, 73],
  orange: [245, 113, 28],
  blue: [36, 105, 190],
  text: [29, 43, 61],
  muted: [99, 115, 133],
  border: [215, 225, 236],
  pale: [241, 247, 253],
  white: [255, 255, 255],
  green: [22, 128, 75],
};

const formatDate = (value) => {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "—";

  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const money = (value) =>
  `Rs. ${Number(value || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

const clean = (value) => {
  if (value === null || value === undefined || value === "") {
    return "—";
  }

  return String(value).trim() || "—";
};

const getBackendOrigin = () => {
  const apiBase =
    api.defaults.baseURL ||
    import.meta.env.VITE_API_URL ||
    "http://localhost:5000/api";

  return new URL(apiBase, window.location.origin).origin;
};

const resolveAssetUrl = (assetPath) => {
  if (
    typeof assetPath !== "string" ||
    !assetPath.trim()
  ) {
    return "";
  }

  const value = assetPath.trim();

  if (/^(data:|blob:)/i.test(value)) {
    return value;
  }

  const backendOrigin = getBackendOrigin();

  if (/^https?:\/\//i.test(value)) {
    const parsed = new URL(value);

    const isLocalHost =
      /^(localhost|127\.0\.0\.1)$/i.test(parsed.hostname);

    if (
      !isLocalHost &&
      !/\/uploads\//i.test(parsed.pathname)
    ) {
      return value;
    }

    return `${backendOrigin}${parsed.pathname}${parsed.search}`;
  }

  let pathname = value.replace(/^\/+/, "");

  // Normalize older saved paths.
  pathname = pathname.replace(/^api\/+/i, "");

  if (!/^uploads\//i.test(pathname)) {
    pathname = `uploads/${pathname}`;
  }

  return `${backendOrigin}/${pathname}`;
};

const loadImage = (assetPath) =>
  new Promise((resolve, reject) => {
    if (!assetPath) {
      reject(new Error("Image path is empty."));
      return;
    }

    let url;

    try {
      url = resolveAssetUrl(assetPath);
    } catch {
      reject(new Error("Invalid image URL."));
      return;
    }

    const image = new Image();
    image.crossOrigin = "anonymous";

    image.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        canvas.width = image.naturalWidth;
        canvas.height = image.naturalHeight;

        const context = canvas.getContext("2d");

        if (!context) {
          reject(new Error("Unable to prepare image."));
          return;
        }

        context.drawImage(image, 0, 0);

        resolve({
          data: canvas.toDataURL("image/png"),
          width: image.naturalWidth,
          height: image.naturalHeight,
        });
      } catch (error) {
        reject(error);
      }
    };

    image.onerror = () => {
      reject(new Error(`Unable to load image: ${url}`));
    };

    image.src = url;
  });

const addImage = async (
  pdf,
  assetPath,
  x,
  y,
  width,
  height,
  options = {}
) => {
  if (!assetPath) return false;

  try {
    const image = await loadImage(assetPath);

    const { contain = true } = options;

    if (!contain) {
      pdf.addImage(
        image.data,
        "PNG",
        x,
        y,
        width,
        height,
        undefined,
        "FAST"
      );

      return true;
    }

    const scale = Math.min(
      width / image.width,
      height / image.height
    );

    const drawWidth = image.width * scale;
    const drawHeight = image.height * scale;

    pdf.addImage(
      image.data,
      "PNG",
      x + (width - drawWidth) / 2,
      y + (height - drawHeight) / 2,
      drawWidth,
      drawHeight,
      undefined,
      "FAST"
    );

    return true;
  } catch (error) {
    console.warn(
      "Admission form image could not be loaded:",
      error.message
    );

    return false;
  }
};

const getInstituteSettings = async () => {
  try {
    return await instituteSettingsService.getSettings();
  } catch (error) {
    console.warn(
      "Unable to load institute profile:",
      error.message
    );

    try {
      return await instituteSettingsService.getPublicBranding();
    } catch {
      return {};
    }
  }
};

const getStudentName = (student) =>
  [
    student?.firstName,
    student?.surname,
  ]
    .filter(Boolean)
    .join(" ") || "Student";

const getAddress = (student) =>
  [
    student?.address,
    student?.pincode ? `PIN: ${student.pincode}` : "",
  ]
    .filter(Boolean)
    .join(" | ") || "—";

const setText = (
  pdf,
  value,
  x,
  y,
  options = {}
) => {
  const {
    color = COLORS.text,
    size = 8,
    bold = false,
    align,
    maxWidth,
  } = options;

  pdf.setTextColor(...color);
  pdf.setFont("helvetica", bold ? "bold" : "normal");
  pdf.setFontSize(size);

  const text = clean(value);

  if (maxWidth) {
    const lines = pdf.splitTextToSize(text, maxWidth);

    pdf.text(
      lines.slice(0, options.maxLines || 2),
      x,
      y,
      align ? { align } : {}
    );

    return;
  }

  pdf.text(text, x, y, align ? { align } : {});
};

const drawSection = (pdf, letter, title, y, width) => {
  const x = 9;
  const height = 8;

  pdf.setFillColor(...COLORS.navy);
  pdf.roundedRect(x, y, width, height, 1.4, 1.4, "F");

  // Orange section marker.
  pdf.setFillColor(...COLORS.orange);
  pdf.roundedRect(x, y, 13, height, 1.4, 1.4, "F");
  pdf.rect(x + 7, y, 6, height, "F");

  setText(pdf, letter, x + 6.5, y + 5.5, {
    color: COLORS.white,
    size: 10,
    bold: true,
    align: "center",
  });

  setText(pdf, title, x + 18, y + 5.4, {
    color: COLORS.white,
    size: 9,
    bold: true,
  });
};

const drawField = (
  pdf,
  label,
  value,
  x,
  y,
  width,
  options = {}
) => {
  const {
    height = 13,
    valueSize = 8,
    bold = false,
    fill = COLORS.pale,
  } = options;

  setText(pdf, label.toUpperCase(), x, y + 2.5, {
    color: COLORS.muted,
    size: 6.1,
    bold: true,
  });

  pdf.setFillColor(...fill);
  pdf.roundedRect(
    x,
    y + 3.7,
    width,
    height - 3.7,
    1,
    1,
    "F"
  );

  pdf.setDrawColor(...COLORS.border);
  pdf.setLineWidth(0.15);
  pdf.roundedRect(
    x,
    y + 3.7,
    width,
    height - 3.7,
    1,
    1,
    "S"
  );

  const text = clean(value);
  const maxWidth = width - 3;

  pdf.setFont("helvetica", bold ? "bold" : "normal");
  pdf.setFontSize(valueSize);

  const lines = pdf.splitTextToSize(text, maxWidth);

  setText(
    pdf,
    lines.slice(0, options.maxLines || 2),
    x + 1.5,
    y + 7.5,
    {
      color: COLORS.text,
      size: valueSize,
      bold,
    }
  );
};

export const downloadAdmissionForm = async (admission) => {
  if (!admission?._id) {
    throw new Error(
      "Admission information is missing. Refresh the page and try again."
    );
  }

  const student = admission.student_id;
  const course = admission.course_id;
  const batch = admission.batch_id;

  if (
    !student ||
    typeof student !== "object" ||
    !student._id
  ) {
    throw new Error(
      "Student information is missing. Refresh admissions and try again."
    );
  }

  const settings = await getInstituteSettings();

  const instituteName =
    settings?.instituteName?.trim() ||
    "Educational Institute";

  const studentName = getStudentName(student);

  const remaining = Math.max(
    0,
    Number(admission.final_amount || 0) -
      Number(admission.paid_amount || 0)
  );

  const pdf = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
    compress: true,
  });

  const pageWidth = 210;
  const pageHeight = 297;
  const margin = 9;
  const contentWidth = pageWidth - margin * 2;

  // Clean white page with a thin rounded frame.
  pdf.setFillColor(...COLORS.white);
  pdf.rect(0, 0, pageWidth, pageHeight, "F");

  pdf.setDrawColor(...COLORS.border);
  pdf.setLineWidth(0.35);
  pdf.roundedRect(5, 5, 200, 287, 2, 2, "S");

  // -------------------------------------------------------
  // INSTITUTE HEADER
  // -------------------------------------------------------

  pdf.setFillColor(...COLORS.navyDark);
  pdf.roundedRect(
    margin,
    9,
    contentWidth,
    30,
    2,
    2,
    "F"
  );

  // White logo background.
  pdf.setFillColor(...COLORS.white);
  pdf.roundedRect(12, 12, 25, 24, 1.5, 1.5, "F");

  const logoLoaded = await addImage(
    pdf,
    settings?.logoUrl,
    13,
    13,
    23,
    22
  );

  if (!logoLoaded) {
    setText(
      pdf,
      instituteName
        .split(/\s+/)
        .slice(0, 2)
        .map((word) => word[0] || "")
        .join("")
        .toUpperCase(),
      24.5,
      25,
      {
        color: COLORS.navy,
        size: 12,
        bold: true,
        align: "center",
      }
    );
  }

  setText(pdf, instituteName, 41, 17, {
    color: COLORS.white,
    size: 14,
    bold: true,
    maxWidth: 151,
    maxLines: 2,
  });

  const contactLine = [
    settings?.email,
    settings?.phone,
    settings?.website,
  ]
    .filter(Boolean)
    .join("  |  ");

  if (contactLine) {
    setText(pdf, contactLine, 41, 32, {
      color: [228, 237, 248],
      size: 7,
      maxWidth: 150,
      maxLines: 1,
    });
  }

  setText(
    pdf,
    "STUDENT ADMISSION FORM",
    pageWidth / 2,
    45,
    {
      color: COLORS.navy,
      size: 15,
      bold: true,
      align: "center",
    }
  );

  setText(
    pdf,
    `Admission ID: ${String(admission._id).slice(-10).toUpperCase()}`,
    pageWidth / 2,
    50,
    {
      color: COLORS.muted,
      size: 7,
      align: "center",
    }
  );

  // -------------------------------------------------------
  // SECTION A: PERSONAL INFORMATION
  // -------------------------------------------------------

  drawSection(
    pdf,
    "A",
    "STUDENT PERSONAL INFORMATION",
    54,
    contentWidth
  );

  // Student photo.
  pdf.setDrawColor(...COLORS.border);
  pdf.setLineWidth(0.35);
  pdf.roundedRect(171, 66, 28, 35, 1.5, 1.5, "S");

  const photoLoaded = await addImage(
    pdf,
    student.profileImage,
    172,
    67,
    26,
    33
  );

  if (!photoLoaded) {
    setText(pdf, "PHOTO", 185, 84, {
      color: COLORS.muted,
      size: 7,
      bold: true,
      align: "center",
    });
  }

  const leftX = 12;
  const leftWidth = 154;
  const gap = 3;
  const fieldWidth = (leftWidth - gap * 2) / 3;

  drawField(
    pdf,
    "Student Name",
    studentName,
    leftX,
    64,
    fieldWidth,
    { height: 14, bold: true }
  );

  drawField(
    pdf,
    "Father's Name",
    student.fatherName,
    leftX + fieldWidth + gap,
    64,
    fieldWidth,
    { height: 14 }
  );

  drawField(
    pdf,
    "Mother's Name",
    student.motherName,
    leftX + (fieldWidth + gap) * 2,
    64,
    fieldWidth,
    { height: 14 }
  );

  drawField(
    pdf,
    "Date of Birth",
    formatDate(student.dob),
    leftX,
    80,
    fieldWidth,
    { height: 14 }
  );

  drawField(
    pdf,
    "Gender",
    student.gender,
    leftX + fieldWidth + gap,
    80,
    fieldWidth,
    { height: 14 }
  );

  drawField(
    pdf,
    "Relationship",
    student.relationship,
    leftX + (fieldWidth + gap) * 2,
    80,
    fieldWidth,
    { height: 14 }
  );

  drawField(
    pdf,
    "Mobile Number",
    student.mobile,
    leftX,
    96,
    fieldWidth,
    { height: 14 }
  );

  drawField(
    pdf,
    "Alternate Mobile",
    student.alternateMobile,
    leftX + fieldWidth + gap,
    96,
    fieldWidth,
    { height: 14 }
  );

  drawField(
    pdf,
    "Pincode",
    student.pincode,
    leftX + (fieldWidth + gap) * 2,
    96,
    fieldWidth,
    { height: 14 }
  );

  drawField(
    pdf,
    "Email Address",
    student.email,
    12,
    112,
    91,
    { height: 14, valueSize: 7.5 }
  );

  drawField(
    pdf,
    "Address",
    student.address,
    106,
    112,
    93,
    { height: 14, valueSize: 7.2 }
  );

  // -------------------------------------------------------
  // SECTION B: COURSE AND BATCH INFORMATION
  // -------------------------------------------------------

  drawSection(
    pdf,
    "B",
    "COURSE AND BATCH INFORMATION",
    132,
    contentWidth
  );

  drawField(
    pdf,
    "Course of Interest",
    course?.courseTitle,
    12,
    142,
    112,
    { height: 14, bold: true, valueSize: 8 }
  );

  drawField(
    pdf,
    "Course Type",
    admission.course_type || course?.courseType,
    127,
    142,
    72,
    { height: 14 }
  );

  drawField(
    pdf,
    "Admission Date",
    formatDate(admission.admission_date),
    12,
    158,
    53,
    { height: 14 }
  );

  drawField(
    pdf,
    "Roll Number",
    student.rollNo,
    68,
    158,
    61,
    { height: 14, bold: true }
  );

  drawField(
    pdf,
    "Batch",
    batch?.batch_name,
    132,
    158,
    67,
    { height: 14 }
  );

  // -------------------------------------------------------
  // SECTION C: OFFICE USE / FEE DETAILS
  // -------------------------------------------------------

  drawSection(
    pdf,
    "C",
    "OFFICE USE ONLY — FEE DETAILS",
    178,
    contentWidth
  );

  const feeGap = 3;
  const feeWidth = (contentWidth - feeGap * 2) / 3;

  drawField(
    pdf,
    "Course Fee",
    money(admission.course_fee),
    12,
    188,
    feeWidth,
    { height: 14 }
  );

  drawField(
    pdf,
    "Discount",
    `${clean(admission.discount_type)} - ${money(
      admission.discount_value
    )}`,
    12 + feeWidth + feeGap,
    188,
    feeWidth,
    { height: 14, valueSize: 7 }
  );

  drawField(
    pdf,
    "GST Amount",
    money(admission.gst_amount),
    12 + (feeWidth + feeGap) * 2,
    188,
    feeWidth,
    { height: 14 }
  );

  drawField(
    pdf,
    "Admission Fee",
    money(admission.admission_fee),
    12,
    204,
    feeWidth,
    { height: 14 }
  );

  drawField(
    pdf,
    "Final Amount",
    money(admission.final_amount),
    12 + feeWidth + feeGap,
    204,
    feeWidth,
    { height: 14, bold: true }
  );

  drawField(
    pdf,
    "Paid Amount",
    money(admission.paid_amount),
    12 + (feeWidth + feeGap) * 2,
    204,
    feeWidth,
    { height: 14 }
  );

  // Outstanding amount, clearly highlighted.
  pdf.setFillColor(255, 247, 237);
  pdf.roundedRect(12, 220, contentWidth, 10, 1.2, 1.2, "F");

  setText(pdf, "BALANCE REMAINING", 15, 226.5, {
    color: COLORS.navy,
    size: 7,
    bold: true,
  });

  setText(pdf, money(remaining), 196, 226.5, {
    color: remaining > 0 ? COLORS.orange : COLORS.green,
    size: 10,
    bold: true,
    align: "right",
  });

  // -------------------------------------------------------
  // LOWER AREA: QR, TERMS, STAMP, SIGNATURE
  // -------------------------------------------------------

  // QR contains identifiers only, not personal contact details.
  const qrPayload = JSON.stringify({
    type: "EMS_ADMISSION",
    admissionId: String(admission._id),
    studentId: String(student._id),
    rollNo: student.rollNo || "",
  });

  const qrData = await QRCode.toDataURL(qrPayload, {
    width: 260,
    margin: 1,
    errorCorrectionLevel: "M",
  });

  pdf.addImage(qrData, "PNG", 12, 238, 24, 24);

  setText(pdf, "SCAN TO IDENTIFY", 24, 265, {
    color: COLORS.muted,
    size: 5.5,
    bold: true,
    align: "center",
  });

  // Terms panel.
  pdf.setDrawColor(...COLORS.border);
  pdf.setFillColor(250, 252, 255);
  pdf.roundedRect(40, 238, 101, 31, 1.5, 1.5, "FD");

  setText(pdf, "IMPORTANT NOTES", 44, 244, {
    color: COLORS.navy,
    size: 7,
    bold: true,
  });

  const notes = [
    "Please verify the personal and course details on this form.",
    "Fee figures reflect the admission record at the time of download.",
    "Contact the institute if any information requires correction.",
  ];

  notes.forEach((note, index) => {
    setText(pdf, `• ${note}`, 44, 250 + index * 5, {
      color: COLORS.text,
      size: 5.8,
      maxWidth: 92,
      maxLines: 1,
    });
  });

  // Institute stamp.
  setText(pdf, "INSTITUTE STAMP", 148, 242, {
    color: COLORS.muted,
    size: 6,
    bold: true,
    align: "center",
  });

  const stampLoaded = await addImage(
    pdf,
    settings?.stampUrl,
    137,
    245,
    23,
    20
  );

  if (!stampLoaded) {
    pdf.setDrawColor(...COLORS.border);
    pdf.circle(148.5, 255, 8, "S");
    setText(pdf, "STAMP", 148.5, 256, {
      color: COLORS.muted,
      size: 5,
      align: "center",
    });
  }

  // Owner signature and name from Settings > Profile > Owner Details.
  const signatureLoaded = await addImage(
    pdf,
    settings?.ownerSignatureUrl,
    165,
    244,
    31,
    12
  );

  pdf.setDrawColor(...COLORS.border);
  pdf.setLineWidth(0.25);
  pdf.line(163, 259, 198, 259);

  setText(
    pdf,
    settings?.ownerName || "Authorized Signatory",
    180.5,
    264,
    {
      color: COLORS.navy,
      size: 7,
      bold: true,
      align: "center",
    }
  );

  setText(
    pdf,
    signatureLoaded ? "AUTHORIZED SIGNATURE" : "SIGNATURE",
    180.5,
    268,
    {
      color: COLORS.muted,
      size: 5.5,
      align: "center",
    }
  );

  // Optional student signature, when present in the Student record.
  if (student.signature) {
    await addImage(
      pdf,
      student.signature,
      12,
      268,
      23,
      8
    );
  }

  // -------------------------------------------------------
  // FOOTER
  // -------------------------------------------------------

  pdf.setDrawColor(...COLORS.border);
  pdf.setLineWidth(0.25);
  pdf.line(9, 278, 201, 278);

  const footerContact = [
    settings?.address,
    settings?.city,
    settings?.state,
    settings?.postalCode,
  ]
    .filter(Boolean)
    .join(", ");

  setText(
    pdf,
    footerContact || `Generated by ${instituteName}`,
    10,
    284,
    {
      color: COLORS.muted,
      size: 6,
      maxWidth: 145,
      maxLines: 1,
    }
  );

  setText(
    pdf,
    `Status: ${clean(admission.status)}`,
    200,
    284,
    {
      color: COLORS.navy,
      size: 6,
      bold: true,
      align: "right",
    }
  );

  const safeRollNo = String(student.rollNo || "student")
    .replace(/[^a-z0-9_-]/gi, "_");

  pdf.save(`Admission-Form-${safeRollNo}.pdf`);
};
