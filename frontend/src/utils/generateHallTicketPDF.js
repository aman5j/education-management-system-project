
import jsPDF from "jspdf";
import QRCode from "qrcode";

const COLORS = {
  navy: [20, 39, 62],
  blue: [220, 237, 252],
  blueDark: [36, 91, 145],
  teal: [13, 148, 136],
  text: [34, 43, 54],
  muted: [100, 111, 124],
  border: [199, 211, 224],
  white: [255, 255, 255],
};

const INSTITUTE = {
  name: "INDIA TECH SAMADHAAN",
  tagline: "Computer Education & Skill Development",
  address: "123, Education Street, New Delhi - 110001",
};

const INSTRUCTIONS = [
  "Report to the exam center at the reporting time.",
  "Carry a valid photo ID along with this hall ticket.",
  "Electronic devices are not allowed inside the examination hall.",
  "Maintain silence during the examination.",
  "Follow all instructions given by the invigilator.",
];

const value = (input, fallback = "—") =>
  input === undefined || input === null || input === ""
    ? fallback
    : String(input);

const fullName = (student = {}) =>
  [
    student.firstName,
    student.middleName,
    student.surname,
  ]
    .filter(Boolean)
    .join(" ") ||
  student.name ||
  "—";

const formatDate = (dateValue) => {
  if (!dateValue) return "—";

  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return "—";

  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
};

const formatTime = (time) => {
  if (!time || !/^\d{2}:\d{2}$/.test(time)) return value(time);

  const [hours, minutes] = time.split(":").map(Number);
  const suffix = hours >= 12 ? "PM" : "AM";
  const hour12 = hours % 12 || 12;

  return `${String(hour12).padStart(2, "0")}:${String(minutes).padStart(2, "0")} ${suffix}`;
};

async function loadImage(url) {
  if (!url || typeof url !== "string") return null;
  if (url.startsWith("data:image/")) return url;

  try {
    const response = await fetch(url, { credentials: "include" });
    if (!response.ok) return null;

    const blob = await response.blob();

    return await new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

function sectionHeader(doc, label, y, x = 9, width = 192) {
  doc.setFillColor(...COLORS.blue);
  doc.roundedRect(x, y, width, 8, 1.3, 1.3, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(...COLORS.navy);
  doc.text(label, x + 3, y + 5.2);
}

function drawLabelValue(doc, label, content, x, y, labelWidth = 30, maxWidth = 70) {
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.4);
  doc.setTextColor(...COLORS.text);
  doc.text(`${label}:`, x, y);

  doc.setFont("helvetica", "normal");
  doc.setTextColor(...COLORS.text);

  const lines = doc.splitTextToSize(value(content), maxWidth);
  doc.text(lines.slice(0, 2), x + labelWidth, y);

  return Math.max(5, lines.slice(0, 2).length * 4.1);
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
  const pageHeight = 297;
  const margin = 9;
  const contentWidth = pageWidth - margin * 2;

  // Main paper frame
  doc.setDrawColor(...COLORS.border);
  doc.setLineWidth(0.55);
  doc.roundedRect(margin, 7, contentWidth, 283, 1.5, 1.5, "S");

  // Temporary institute logo/emblem and institute information.
  // Replace this header with Institute Profile data when that API is connected.
  
  
const instituteLogo = await loadImage(
  `${window.location.origin}/india-tech-samadhaan-logo.png`
);

if (instituteLogo) {
  doc.addImage(
    instituteLogo,
    "PNG",
    12,
    15,
    33,
    10,
    undefined,
    "FAST"
  );
}


  doc.setTextColor(...COLORS.navy);
  doc.setFontSize(14);
  doc.text(INSTITUTE.name, 36, 18.5);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.2);
  doc.setTextColor(...COLORS.text);
  doc.text(INSTITUTE.tagline, 36, 24);

  doc.setFontSize(7.3);
  doc.setTextColor(...COLORS.muted);
  doc.text(INSTITUTE.address, 36, 29);

  // Hall ticket banner
  doc.setFillColor(...COLORS.blue);
  doc.roundedRect(14, 35, 182, 22, 1.4, 1.4, "F");

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

  // Student information and photo
  const photoUrl =
    student.photoUrl ||
    student.profileImage ||
    student.profilePhoto ||
    student.photo ||
    student.image ||
    "";

  const studentPhoto = await loadImage(photoUrl);

  const detailsX = 15;
  let y = 64;

  const studentDetails = [
    ["Hall Ticket No.", ticket.hallTicketNo],
    ["Student Name", fullName(student)],
    ["Roll No.", student.rollNo],
    ["Course", course.courseTitle],
  ];

  studentDetails.forEach(([label, content]) => {
    drawLabelValue(doc, label, content, detailsX, y, 28, 102);
    y += 6.4;
  });

  if (studentPhoto) {
    try {
      doc.addImage(
        studentPhoto,
        "AUTO",
        157,
        62,
        39,
        42,
        undefined,
        "FAST"
      );

      doc.setDrawColor(...COLORS.border);
      doc.rect(157, 62, 39, 42, "S");
    } catch {
      // Keep the PDF usable when a photo has an unsupported format.
    }
  } else {
    doc.setDrawColor(...COLORS.border);
    doc.roundedRect(157, 62, 39, 42, 1, 1, "S");
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(...COLORS.muted);
    doc.text("Student Photo", 176.5, 83, { align: "center" });
  }

  // Exam details
  sectionHeader(doc, "EXAM DETAILS", 94);

  const examDetails = [
    ["Exam Date", formatDate(ticket.examDate), "Reporting Time", formatTime(ticket.reportingTime)],
    ["Exam Start Time", formatTime(ticket.startTime), "Exam End Time", formatTime(ticket.endTime)],
    ["Total Questions", value(exam.totalQuestions), "Total Marks", value(exam.totalMarks)],
    ["Marks per Question", value(exam.marksPerQuestion ?? (
      Number(exam.totalQuestions) > 0
        ? Number(exam.totalMarks) / Number(exam.totalQuestions)
        : ""
    )), "", ""],
  ];

  let examY = 103;

  examDetails.forEach(([label1, value1, label2, value2]) => {
    drawLabelValue(doc, label1, value1, 15, examY, 30, 49);

    if (label2) {
      drawLabelValue(doc, label2, value2, 105, examY, 29, 43);
    }

    examY += 8.5;
  });

  // Exactly five instructions in the same blue section style
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

  // Issue date
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.4);
  doc.setTextColor(...COLORS.muted);
  doc.text(`Date of Issue: ${formatDate(new Date())}`, 105, 242, {
    align: "center",
  });

  // Authorized signature placeholder
  doc.setDrawColor(...COLORS.muted);
  doc.setLineWidth(0.35);
  doc.line(145, 237, 193, 237);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.3);
  doc.setTextColor(...COLORS.text);
  doc.text("Authorized Signature", 169, 242, { align: "center" });
  doc.setFont("helvetica", "normal");
  doc.text(INSTITUTE.name, 169, 246, { align: "center" });

  // Real QR code that opens the verification page for this ticket.
  const verificationUrl =
    `${window.location.origin}/verify-hall-ticket/${encodeURIComponent(ticket._id)}`;

  const qrDataUrl = await QRCode.toDataURL(verificationUrl, {
    errorCorrectionLevel: "M",
    margin: 1,
    width: 180,
    color: {
      dark: "#14273e",
      light: "#ffffff",
    },
  });

  doc.addImage(qrDataUrl, "PNG", 166, 251, 22, 22);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(6.7);
  doc.setTextColor(...COLORS.text);
  doc.text(ticket.hallTicketNo, 177, 276, { align: "center" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(...COLORS.muted);
  doc.text("Scan QR to verify hall ticket", 177, 280, {
    align: "center",
  });

  const safeNumber = String(ticket.hallTicketNo).replace(
    /[^a-z0-9_-]/gi,
    "-"
  );

  doc.save(`Hall-Ticket-${safeNumber}.pdf`);
}
