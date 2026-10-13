
import jsPDF from "jspdf";
import QRCode from "qrcode";

const COLORS = {
  navy: [20, 39, 62],
  blue: [220, 237, 252],
  blueDark: [36, 91, 145],
  text: [34, 43, 54],
  muted: [100, 111, 124],
  border: [199, 211, 224],
  white: [255, 255, 255],
  teal: [13, 148, 136],
};

const INSTITUTE = {
  name: "INDIA TECH SAMADHAAN",
  tagline: "Computer Education & Skill Development",
  address: "123, Education Street, New Delhi - 110001",
  logoPath: "/india-tech-samadhaan-logo.png",
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
  [student.firstName, student.middleName, student.surname]
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
    day: "2-digit",
    month: "short",
    year: "numeric",
    weekday: "long",
    timeZone: "UTC",
  });
};

const formatTime = (value) => {
  if (!value || !/^\d{2}:\d{2}$/.test(value)) {
    return textValue(value);
  }

  const [hours, minutes] = value.split(":").map(Number);
  const suffix = hours >= 12 ? "PM" : "AM";
  const hour12 = hours % 12 || 12;

  return `${String(hour12).padStart(2, "0")}:${String(minutes).padStart(2, "0")} ${suffix}`;
};

/**
 * The project uses VITE_API_URL, normally ending in /api.
 * Uploaded student images are served from the backend origin,
 * not the frontend Vite origin.
 */
function resolveImageUrl(path) {
  if (typeof path !== "string" || !path.trim()) return null;

  const value = path.trim();

  if (/^(data:image\/|https?:\/\/|blob:)/i.test(value)) {
    return value;
  }

  const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

  try {
    const backendOrigin = new URL(apiUrl, window.location.origin).origin;

    return new URL(
      value.replace(/\\/g, "/").replace(/^\/+/, ""),
      `${backendOrigin}/`
    ).href;
  } catch (error) {
    console.warn("Unable to resolve image URL:", error);
    return null;
  }
}

async function loadImage(path) {
  if (!path) return null;

  if (typeof path === "string" && path.startsWith("data:image/")) {
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
        "Hall ticket image request failed:",
        response.status,
        url
      );
      return null;
    }

    const blob = await response.blob();

    if (!blob.type.startsWith("image/")) {
      console.warn("The image URL did not return an image:", url);
      return null;
    }

    return await new Promise((resolve) => {
      const reader = new FileReader();

      reader.onload = () => resolve(reader.result);
      reader.onerror = () => resolve(null);

      reader.readAsDataURL(blob);
    });
  } catch (error) {
    console.warn("Unable to load hall ticket image:", error);
    return null;
  }
}

function sectionHeader(doc, label, y, x = 9, width = 192) {
  doc.setFillColor(...COLORS.blue);
  doc.roundedRect(x, y, width, 8, 1.2, 1.2, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(...COLORS.navy);
  doc.text(label, x + 3, y + 5.2);
}

function drawLabelValue(
  doc,
  label,
  content,
  x,
  y,
  labelWidth = 29,
  maxWidth = 95
) {
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.2);
  doc.setTextColor(...COLORS.text);
  doc.text(`${label}:`, x, y);

  doc.setFont("helvetica", "normal");
  doc.setTextColor(...COLORS.text);

  const lines = doc.splitTextToSize(textValue(content), maxWidth);
  doc.text(lines.slice(0, 2), x + labelWidth, y);

  return Math.max(5, Math.min(lines.length, 2) * 4.1);
}

function getMarksPerQuestion(exam = {}) {
  const savedValue = exam.marksPerQuestion;

  if (savedValue !== undefined && savedValue !== null && savedValue !== "") {
    return Number(savedValue).toFixed(2).replace(/\.?0+$/, "");
  }

  const questions = Number(exam.totalQuestions);
  const marks = Number(exam.totalMarks);

  if (questions > 0 && Number.isFinite(marks)) {
    return (marks / questions).toFixed(2).replace(/\.?0+$/, "");
  }

  return "—";
}

function addImageSafely(doc, data, format, x, y, width, height) {
  if (!data) return false;

  try {
    doc.addImage(data, format, x, y, width, height, undefined, "FAST");
    return true;
  } catch (error) {
    console.warn("Unable to embed PDF image:", error);
    return false;
  }
}

export async function generateHallTicketPDF({ ticket }) {
  if (!ticket?._id || !ticket?.hallTicketNo) {
    throw new Error("Hall ticket details are missing.");
  }

  if (ticket.status === "Cancelled") {
    throw new Error("This hall ticket has been cancelled.");
  }

  const student = ticket.student_id || {};
  const course = ticket.course_id || {};
  const exam = ticket.exam_id || {};

  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
    compress: true,
  });

  const pageWidth = 210;
  const margin = 9;
  const contentWidth = pageWidth - margin * 2;

  // Main page frame
  doc.setDrawColor(...COLORS.border);
  doc.setLineWidth(0.55);
  doc.roundedRect(margin, 7, contentWidth, 283, 1.3, 1.3, "S");

  // Institute logo at top-left
  const instituteLogo = await loadImage(INSTITUTE.logoPath);

  if (instituteLogo) {
    addImageSafely(
      doc,
      instituteLogo,
      "PNG",
      12,
      14,
      33,
      20
    );
  } else {
    // Keep a simple fallback if the logo file cannot be loaded.
    doc.setDrawColor(...COLORS.teal);
    doc.setLineWidth(1);
    doc.circle(25, 23, 8, "S");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(7);
    doc.setTextColor(...COLORS.navy);
    doc.text("ITS", 25, 24, { align: "center" });
  }

  // Institute information on the top-right
  const instituteTextX = 48;
  const instituteTextWidth = 147;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(13.5);
  doc.setTextColor(...COLORS.navy);
  doc.text(INSTITUTE.name, instituteTextX, 18.5, {
    maxWidth: instituteTextWidth,
  });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.2);
  doc.setTextColor(...COLORS.text);
  doc.text(INSTITUTE.tagline, instituteTextX, 25, {
    maxWidth: instituteTextWidth,
  });

  doc.setFontSize(7.2);
  doc.setTextColor(...COLORS.muted);
  doc.text(INSTITUTE.address, instituteTextX, 30.5, {
    maxWidth: instituteTextWidth,
  });

  // Hall ticket banner
  doc.setFillColor(...COLORS.blue);
  doc.roundedRect(14, 35, 182, 22, 1.2, 1.2, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(19);
  doc.setTextColor(...COLORS.navy);
  doc.text("HALL TICKET", 105, 45, { align: "center" });

  doc.setFontSize(8);
  doc.setCharSpace(1);
  doc.text("END SEMESTER EXAMINATION", 105, 51, {
    align: "center",
  });
  doc.setCharSpace(0);

  // Student details at the left
  let studentY = 64;

  const studentDetails = [
    ["Hall Ticket No.", ticket.hallTicketNo],
    ["Student Name", getStudentName(student)],
    ["Roll No.", student.rollNo],
    ["Course", course.courseTitle],
    ["Exam Name", exam.examName || exam.title || exam.name || "Examination"],
    ["Exam Date", formatDateWithDay(ticket.examDate)],
    ["Reporting Time", formatTime(ticket.reportingTime)],
    ["Exam Start Time", formatTime(ticket.startTime)],
    ["Exam End Time", formatTime(ticket.endTime)],
    ["Total Questions", exam.totalQuestions],
    ["Total Marks", exam.totalMarks],
    ["Marks per Question", getMarksPerQuestion(exam)],
  ];

  studentDetails.forEach(([label, content]) => {
    drawLabelValue(doc, label, content, 15, studentY, 29, 96);
    studentY += 6.1;
  });

  // Student photo: the actual Student model field is profileImage.
  // Do not rely on guessed photoUrl or image fields.
  const studentPhoto = await loadImage(student.profileImage);

  const photoX = 157;
  const photoY = 62;
  const photoWidth = 39;
  const photoHeight = 42;

  if (studentPhoto) {
    const added = addImageSafely(
      doc,
      studentPhoto,
      "JPEG",
      photoX,
      photoY,
      photoWidth,
      photoHeight
    );

    if (!added) {
      addImageSafely(
        doc,
        studentPhoto,
        "PNG",
        photoX,
        photoY,
        photoWidth,
        photoHeight
      );
    }
  } else {
    doc.setDrawColor(...COLORS.border);
    doc.roundedRect(photoX, photoY, photoWidth, photoHeight, 1, 1, "S");

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(...COLORS.muted);
    doc.text("Student Photo", photoX + photoWidth / 2, photoY + 21, {
      align: "center",
    });
  }

  doc.setDrawColor(...COLORS.border);
  doc.roundedRect(photoX, photoY, photoWidth, photoHeight, 1, 1, "S");

  // Student signature below photo
  const signatureY = 107;
  const signatureHeight = 24;
  const studentSignature = await loadImage(student.signature);

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

  if (studentSignature) {
    addImageSafely(
      doc,
      studentSignature,
      "PNG",
      photoX + 2,
      signatureY + 1,
      photoWidth - 4,
      15
    );
  }

  doc.setDrawColor(...COLORS.border);
  doc.line(photoX, signatureY + 17, photoX + photoWidth, signatureY + 17);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(...COLORS.text);
  doc.text("Student Signature", photoX + photoWidth / 2, signatureY + 21, {
    align: "center",
  });

  // Important instructions: exactly five
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

  // Footer separator
  doc.setDrawColor(...COLORS.navy);
  doc.setLineWidth(0.5);
  doc.line(14, 224, 196, 224);

  // QR code for actual hall-ticket verification
  const verificationUrl =
    `${window.location.origin}/verify-hall-ticket/${encodeURIComponent(ticket._id)}`;

  const qrDataUrl = await QRCode.toDataURL(verificationUrl, {
    errorCorrectionLevel: "M",
    margin: 1,
    width: 220,
    color: {
      dark: "#14273e",
      light: "#ffffff",
    },
  });

  // QR on bottom-left
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

  // Issue date at the bottom-center
  doc.setFontSize(7.4);
  doc.text(`Date of Issue: ${formatDate(new Date())}`, 105, 263, {
    align: "center",
  });

  // Authorized signature on the bottom-right
  doc.setDrawColor(...COLORS.muted);
  doc.setLineWidth(0.35);
  doc.line(145, 257, 193, 257);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.3);
  doc.setTextColor(...COLORS.text);
  doc.text("Authorized Signature", 169, 263, {
    align: "center",
  });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.text(INSTITUTE.name, 169, 267, {
    align: "center",
  });

  const safeNumber = String(ticket.hallTicketNo).replace(
    /[^a-z0-9_-]/gi,
    "-"
  );

  doc.save(`Hall-Ticket-${safeNumber}.pdf`);
}
