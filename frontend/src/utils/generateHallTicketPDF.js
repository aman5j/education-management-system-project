
import jsPDF from "jspdf";
import QRCode from "qrcode";
import instituteSettingsService from "../services/instituteSettingsService";

const COLORS = {
  navy: [20, 39, 62],
  blue: [220, 237, 252],
  text: [34, 43, 54],
  muted: [100, 111, 124],
  border: [199, 211, 224],
  teal: [13, 148, 136],
};

const INSTRUCTIONS = [
  "Report to the exam center at the reporting time.",
  "Carry a valid photo ID along with this hall ticket.",
  "Electronic devices are not allowed inside the examination hall.",
  "Maintain silence during the examination.",
  "Follow all instructions given by the invigilator.",
];

const textValue = (value, fallback = "—") =>
  value === undefined || value === null || value === ""
    ? fallback
    : String(value);

const getStudentName = (student = {}) =>
  [
    student.firstName,
    student.middleName,
    student.surname,
  ]
    .filter(Boolean)
    .join(" ") ||
  student.name ||
  "—";

const formatDate = (value) => {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "—";

  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
};

const formatDateWithDay = (value) => {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "—";

  return date.toLocaleDateString("en-IN", {
    weekday: "long",
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
};

const formatTime = (value) => {
  if (!value) return "—";

  if (!/^\d{2}:\d{2}$/.test(String(value))) {
    return String(value);
  }

  const [hours, minutes] = value.split(":").map(Number);
  const suffix = hours >= 12 ? "PM" : "AM";
  const hour12 = hours % 12 || 12;

  return `${String(hour12).padStart(2, "0")}:${String(minutes).padStart(2, "0")} ${suffix}`;
};

const formatMarks = (value) => {
  if (
    value === undefined ||
    value === null ||
    value === "" ||
    !Number.isFinite(Number(value))
  ) {
    return "Not available";
  }

  return Number(Number(value).toFixed(2)).toString();
};

const getInstituteDetails = (settings = {}) => {
  const address = [
    settings.address,
    settings.city,
    settings.state,
    settings.postalCode,
    settings.country,
  ]
    .filter(
      (part) => typeof part === "string" && part.trim()
    )
    .map((part) => part.trim())
    .join(", ");

  return {
    name:
      settings.instituteName?.trim() ||
      "Institute Name Not Configured",
    tagline: settings.designation?.trim() || "",
    address,
    logoPath: settings.logoUrl || "",
    stampPath: settings.stampUrl || "",
    controllerName: settings.controllerName || "",
    controllerDesignation:
      settings.controllerDesignation || "",
    controllerSignaturePath:
      settings.controllerSignatureUrl || "",
    showControllerName:
      settings.showControllerNameOnCertificate !== false,
    showControllerSignature:
      settings.showControllerSignatureOnCertificate !== false,
  };
};

/**
 * Resolve backend image paths and absolute image URLs.
 * Relative backend assets such as /uploads/institute/logo.png
 * must be loaded from the backend origin, not the Vite origin.
 */
function resolveImageUrl(path) {
  if (typeof path !== "string" || !path.trim()) {
    return null;
  }

  const cleaned = path.trim();

  if (/^data:image\//i.test(cleaned)) {
    return cleaned;
  }

  if (/^https?:\/\//i.test(cleaned)) {
    return cleaned;
  }

  if (/^blob:/i.test(cleaned)) {
    return cleaned;
  }

  const apiUrl =
    import.meta.env.VITE_API_URL ||
    import.meta.env.VITE_API_BASE_URL ||
    "http://localhost:5000/api";

  try {
    const backendOrigin = new URL(
      apiUrl,
      window.location.origin
    ).origin;

    const normalizedPath = cleaned
      .replace(/\\/g, "/")
      .replace(/^\/+/, "");

    return new URL(
      normalizedPath,
      `${backendOrigin}/`
    ).href;
  } catch (error) {
    console.warn("Unable to resolve image URL:", error);
    return null;
  }
}

/**
 * Fetch an image and convert it to a data URL for jsPDF.
 */
async function loadImage(path) {
  if (typeof path !== "string" || !path.trim()) {
    return null;
  }

  if (/^data:image\//i.test(path)) {
    return path;
  }

  const url = resolveImageUrl(path);

  if (!url) return null;

  try {
    const response = await fetch(url, {
      credentials: "include",
    });

    if (!response.ok) {
      console.warn(
        `Image request failed (${response.status}):`,
        url
      );
      return null;
    }

    const blob = await response.blob();

    if (!blob.type.startsWith("image/")) {
      console.warn(
        "The requested URL did not return an image:",
        url
      );
      return null;
    }

    return await new Promise((resolve) => {
      const reader = new FileReader();

      reader.onload = () => resolve(reader.result);
      reader.onerror = () => resolve(null);

      reader.readAsDataURL(blob);
    });
  } catch (error) {
    console.warn("Unable to load image:", error);
    return null;
  }
}

function getImageFormat(dataUrl) {
  if (typeof dataUrl !== "string") return "PNG";

  if (/^data:image\/jpe?g/i.test(dataUrl)) return "JPEG";
  if (/^data:image\/webp/i.test(dataUrl)) return "WEBP";

  return "PNG";
}

function addImageSafely(
  doc,
  data,
  format,
  x,
  y,
  width,
  height
) {
  if (!data) return false;

  try {
    doc.addImage(
      data,
      format,
      x,
      y,
      width,
      height,
      undefined,
      "NONE"
    );

    return true;
  } catch (error) {
    console.warn("Unable to embed image in PDF:", error);
    return false;
  }
}

/**
 * Resolve marks from the exam record.
 */
function getMarksData(ticket) {
  const exam =
    ticket.exam_id && typeof ticket.exam_id === "object"
      ? ticket.exam_id
      : ticket.exam && typeof ticket.exam === "object"
        ? ticket.exam
        : {};

  const totalQuestions =
    exam.totalQuestions ??
    ticket.totalQuestions ??
    ticket.exam?.totalQuestions;

  const totalMarks =
    exam.totalMarks ??
    ticket.totalMarks ??
    ticket.exam?.totalMarks;

  const savedMarksPerQuestion =
    exam.marksPerQuestion ??
    ticket.marksPerQuestion ??
    ticket.exam?.marksPerQuestion;

  const calculatedMarksPerQuestion =
    Number(totalQuestions) > 0 &&
    totalMarks !== undefined &&
    totalMarks !== null &&
    totalMarks !== "" &&
    Number.isFinite(Number(totalMarks))
      ? Number(totalMarks) / Number(totalQuestions)
      : null;

  return {
    exam,
    totalQuestions,
    totalMarks,
    marksPerQuestion:
      savedMarksPerQuestion ?? calculatedMarksPerQuestion,
  };
}

function drawLabelValue(
  doc,
  label,
  value,
  x,
  y,
  labelWidth = 29,
  maxWidth = 96
) {
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.2);
  doc.setTextColor(...COLORS.text);
  doc.text(`${label}:`, x, y);

  doc.setFont("helvetica", "normal");

  const lines = doc.splitTextToSize(
    textValue(value),
    maxWidth
  );

  doc.text(lines.slice(0, 2), x + labelWidth, y);
}

function sectionHeader(doc, label, y) {
  doc.setFillColor(...COLORS.blue);
  doc.roundedRect(9, y, 192, 8, 1.2, 1.2, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(...COLORS.navy);
  doc.text(label, 12, y + 5.2);
}

function getExamName(exam) {
  return (
    exam.examName ||
    exam.title ||
    exam.name ||
    "End Semester Examination"
  );
}

export async function generateHallTicketPDF({ ticket }) {
  if (!ticket?._id || !ticket?.hallTicketNo) {
    throw new Error("Hall ticket details are missing.");
  }

  if (ticket.status === "Cancelled") {
    throw new Error("This hall ticket has been cancelled.");
  }

  // Load the saved institute profile.
  let settings;

  try {
    settings = await instituteSettingsService.getSettings();
  } catch (error) {
    console.error(
      "Unable to load institute settings for PDF:",
      error
    );

    throw new Error(
      "Unable to load institute profile settings. Please try again."
    );
  }

  const INSTITUTE = getInstituteDetails(settings);

  const student =
    ticket.student_id && typeof ticket.student_id === "object"
      ? ticket.student_id
      : {};

  const course =
    ticket.course_id && typeof ticket.course_id === "object"
      ? ticket.course_id
      : {};

  const {
    exam,
    totalQuestions,
    totalMarks,
    marksPerQuestion,
  } = getMarksData(ticket);

  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
    compress: true,
    putOnlyUsedFonts: true,
    precision: 16,
  });

  // Page border.
  doc.setDrawColor(...COLORS.border);
  doc.setLineWidth(0.55);
  doc.roundedRect(9, 7, 192, 283, 1.3, 1.3, "S");

  // Load the institute logo from the saved profile.
  const instituteLogo = await loadImage(INSTITUTE.logoPath);

  if (instituteLogo) {
    addImageSafely(
      doc,
      instituteLogo,
      getImageFormat(instituteLogo),
      12,
      14,
      33,
      20
    );
  } else {
    // Lightweight fallback when no logo has been saved.
    doc.setDrawColor(...COLORS.teal);
    doc.setLineWidth(1);
    doc.circle(25, 23, 8, "S");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(7);
    doc.setTextColor(...COLORS.navy);
    doc.text("EMS", 25, 24, { align: "center" });
  }

  // Institute name, designation/tagline and saved address.
  const instituteTextX = 48;
  const instituteTextWidth = 147;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(13.5);
  doc.setTextColor(...COLORS.navy);

  const instituteNameLines = doc.splitTextToSize(
    INSTITUTE.name,
    instituteTextWidth
  );

  doc.text(instituteNameLines.slice(0, 2), instituteTextX, 18.5);

  if (INSTITUTE.tagline) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.2);
    doc.setTextColor(...COLORS.text);
    doc.text(INSTITUTE.tagline, instituteTextX, 25, {
      maxWidth: instituteTextWidth,
    });
  }

  if (INSTITUTE.address) {
    doc.setFontSize(7.2);
    doc.setTextColor(...COLORS.muted);

    const addressLines = doc.splitTextToSize(
      INSTITUTE.address,
      instituteTextWidth
    );

    doc.text(addressLines.slice(0, 2), instituteTextX, 30.5);
  }

  // Hall ticket banner.
  doc.setFillColor(...COLORS.blue);
  doc.roundedRect(14, 35, 182, 22, 1.2, 1.2, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(19);
  doc.setTextColor(...COLORS.navy);
  doc.text("HALL TICKET", 105, 45, {
    align: "center",
  });

  doc.setFontSize(8);
  doc.setCharSpace(1);
  doc.text("END SEMESTER EXAMINATION", 105, 51, {
    align: "center",
  });
  doc.setCharSpace(0);

  // Student and examination details.
  const studentDetails = [
    ["Hall Ticket No.", ticket.hallTicketNo],
    ["Student Name", getStudentName(student)],
    ["Roll No.", student.rollNo],
    ["Course", course.courseTitle || course.name],
    ["Exam Name", getExamName(exam)],
    ["Exam Date", formatDateWithDay(ticket.examDate)],
    ["Reporting Time", formatTime(ticket.reportingTime)],
    ["Exam Start Time", formatTime(ticket.startTime)],
    ["Exam End Time", formatTime(ticket.endTime)],
    ["Total Questions", formatMarks(totalQuestions)],
    ["Total Marks", formatMarks(totalMarks)],
    ["Marks per Question", formatMarks(marksPerQuestion)],
  ];

  let studentY = 64;

  studentDetails.forEach(([label, value]) => {
    drawLabelValue(
      doc,
      label,
      value,
      15,
      studentY,
      29,
      96
    );

    studentY += 6.1;
  });

  // Student photograph.
  const photoX = 157;
  const photoY = 62;
  const photoWidth = 39;
  const photoHeight = 42;

  const studentPhoto = await loadImage(student.profileImage);

  if (studentPhoto) {
    addImageSafely(
      doc,
      studentPhoto,
      getImageFormat(studentPhoto),
      photoX,
      photoY,
      photoWidth,
      photoHeight
    );
  } else {
    doc.setDrawColor(...COLORS.border);
    doc.roundedRect(
      photoX,
      photoY,
      photoWidth,
      photoHeight,
      1,
      1,
      "S"
    );

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(...COLORS.muted);
    doc.text(
      "Photo unavailable",
      photoX + photoWidth / 2,
      photoY + 21,
      { align: "center" }
    );
  }

  // Photo border.
  doc.setDrawColor(...COLORS.border);
  doc.roundedRect(
    photoX,
    photoY,
    photoWidth,
    photoHeight,
    1,
    1,
    "S"
  );

  // Student signature.
  const signatureY = 107;
  const signatureHeight = 24;

  doc.setDrawColor(...COLORS.border);
  doc.roundedRect(
    photoX,
    signatureY,
    photoWidth,
    signatureHeight,
    1,
    1,
    "S"
  );

  const studentSignature = await loadImage(student.signature);

  if (studentSignature) {
    addImageSafely(
      doc,
      studentSignature,
      getImageFormat(studentSignature),
      photoX + 2,
      signatureY + 1,
      photoWidth - 4,
      15
    );
  } else {
    doc.setFont("helvetica", "italic");
    doc.setFontSize(7);
    doc.setTextColor(...COLORS.muted);
    doc.text(
      "Signature unavailable",
      photoX + photoWidth / 2,
      signatureY + 10,
      { align: "center" }
    );
  }

  doc.setDrawColor(...COLORS.border);
  doc.line(
    photoX,
    signatureY + 17,
    photoX + photoWidth,
    signatureY + 17
  );

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(...COLORS.text);
  doc.text(
    "Student Signature",
    photoX + photoWidth / 2,
    signatureY + 21,
    { align: "center" }
  );

  // Important examination instructions.
  sectionHeader(doc, "IMPORTANT INSTRUCTIONS", 143);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(...COLORS.text);

  INSTRUCTIONS.forEach((instruction, index) => {
    const instructionY = 153 + index * 7.1;

    doc.setFont("helvetica", "bold");
    doc.text(`${index + 1}.`, 15, instructionY);

    doc.setFont("helvetica", "normal");
    doc.text(instruction, 22, instructionY, {
      maxWidth: 174,
    });
  });

  // Footer divider.
  doc.setDrawColor(...COLORS.navy);
  doc.setLineWidth(0.5);
  doc.line(14, 224, 196, 224);

  // QR verification code.
  const verificationUrl =
    `${window.location.origin}/verify-hall-ticket/${encodeURIComponent(ticket._id)}`;

  const qrDataUrl = await QRCode.toDataURL(verificationUrl, {
    errorCorrectionLevel: "H",
    margin: 2,
    width: 800,
    color: {
      dark: "#14273e",
      light: "#ffffff",
    },
  });

  // QR code at bottom-left.
  doc.addImage(qrDataUrl, "PNG", 15, 247, 25, 25);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(6.8);
  doc.setTextColor(...COLORS.text);
  doc.text(ticket.hallTicketNo, 27.5, 275, {
    align: "center",
  });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(6.5);
  doc.setTextColor(...COLORS.muted);
  doc.text("Scan to verify hall ticket", 27.5, 279, {
    align: "center",
  });

  // Date of issue.
  doc.setFontSize(7.4);
  doc.text(
    `Date of Issue: ${formatDate(new Date())}`,
    105,
    263,
    { align: "center" }
  );

  // Load the institute stamp and controller signature.
  const [controllerSignature, instituteStamp] =
    await Promise.all([
      INSTITUTE.showControllerSignature
        ? loadImage(INSTITUTE.controllerSignaturePath)
        : Promise.resolve(null),
      loadImage(INSTITUTE.stampPath),
    ]);

  // Stamp in the bottom-right area.
  if (instituteStamp) {
    addImageSafely(
      doc,
      instituteStamp,
      getImageFormat(instituteStamp),
      174,
      229,
      19,
      19
    );
  }

  // Examination controller signature.
  if (controllerSignature) {
    addImageSafely(
      doc,
      controllerSignature,
      getImageFormat(controllerSignature),
      146,
      239,
      43,
      14
    );
  }

  doc.setDrawColor(...COLORS.muted);
  doc.setLineWidth(0.35);
  doc.line(145, 257, 193, 257);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.3);
  doc.setTextColor(...COLORS.text);

  const signatoryName = INSTITUTE.showControllerName
    ? INSTITUTE.controllerName || "Authorized Signatory"
    : "Authorized Signatory";

  doc.text(signatoryName, 169, 263, {
    align: "center",
    maxWidth: 48,
  });

  if (INSTITUTE.controllerDesignation) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(6.5);
    doc.text(
      INSTITUTE.controllerDesignation,
      169,
      267,
      {
        align: "center",
        maxWidth: 48,
      }
    );
  }

  const safeNumber = String(ticket.hallTicketNo).replace(
    /[^a-z0-9_-]/gi,
    "-"
  );

  doc.save(`Hall-Ticket-${safeNumber}.pdf`);
}
