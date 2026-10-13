
import jsPDF from "jspdf";

const CODE39 = {
  "0": "nnnwwnwnn", "1": "wnnwnnnnw", "2": "nnwwnnnnw",
  "3": "wnwwnnnnn", "4": "nnnwwnnnw", "5": "wnnwwnnnn",
  "6": "nnwwwnnnn", "7": "nnnwnnwnw", "8": "wnnwnnwnn",
  "9": "nnwwnnwnn", A: "wnnnnwnnw", B: "nnwnnwnnw",
  C: "wnwnnwnnn", D: "nnnnwwnnw", E: "wnnnwwnnn",
  F: "nnwnwwnnn", G: "nnnnnwwnw", H: "wnnnnwwnn",
  I: "nnwnnwwnn", J: "nnnnwwwnn", K: "wnnnnnnww",
  L: "nnwnnnnww", M: "wnwnnnnwn", N: "nnnnwnnww",
  O: "wnnnwnnwn", P: "nnwnwnnwn", Q: "nnnnnnwww",
  R: "wnnnnnwwn", S: "nnwnnnwwn", T: "nnnnwnwwn",
  U: "wwnnnnnnw", V: "nwwnnnnnw", W: "wwwnnnnnn",
  X: "nwnnwnnnw", Y: "wwnnwnnnn", Z: "nwwnwnnnn",
  "-": "nwnnnnwnw", ".": "wwnnnnwnn", " ": "nwwnnnwnn",
  "$": "nwnwnwnnn", "/": "nwnwnnnwn", "+": "nwnnnwnwn",
  "%": "nnnwnwnwn",
};

function drawCode39(doc, value, x, y, maxWidth, barHeight) {
  const text = `*${String(value).toUpperCase()}*`;
  const chars = [...text].map((char) => CODE39[char] ? char : "-");
  const patterns = chars.map((char) => CODE39[char]);

  const narrow = 0.35;
  const wide = 0.9;
  const gap = 0.35;

  const units = patterns.reduce(
    (sum, pattern) =>
      sum +
      [...pattern].reduce((n, width) => n + (width === "w" ? wide : narrow), 0) +
      gap,
    0
  );

  const scale = Math.min(1, maxWidth / units);
  let cursor = x;

  doc.setFillColor(20, 30, 45);

  patterns.forEach((pattern) => {
    [...pattern].forEach((width, index) => {
      const barWidth = (width === "w" ? wide : narrow) * scale;

      if (index % 2 === 0) {
        doc.rect(cursor, y, barWidth, barHeight, "F");
      }

      cursor += barWidth;
    });

    cursor += gap * scale;
  });
}

async function imageToDataUrl(url) {
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

function text(value, fallback = "—") {
  return value === undefined || value === null || value === ""
    ? fallback
    : String(value);
}

export async function generateHallTicketPDF({ ticket, institute = {} }) {
  if (!ticket?._id || !ticket?.hallTicketNo) {
    throw new Error("Hall ticket details are missing.");
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
  const margin = 14;
  const contentWidth = pageWidth - margin * 2;

  const instituteName =
    institute.instituteName ||
    institute.name ||
    "Institute";

  const instituteAddress =
    institute.address ||
    institute.instituteAddress ||
    "";

  const logoUrl =
    institute.logoUrl ||
    institute.logo ||
    institute.logo_url ||
    "";

  const logo = await imageToDataUrl(logoUrl);

  // Page border
  doc.setDrawColor(205, 216, 228);
  doc.setLineWidth(0.5);
  doc.roundedRect(margin, 10, contentWidth, 277, 2, 2, "S");

  // Institute heading and logo
  let headerTextX = margin + 6;

  if (logo) {
    try {
      doc.addImage(logo, "AUTO", margin + 5, 15, 23, 23, undefined, "FAST");
      headerTextX = margin + 33;
    } catch {
      headerTextX = margin + 6;
    }
  }

  doc.setTextColor(15, 45, 72);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(17);
  doc.text(instituteName, headerTextX, 22, {
    maxWidth: pageWidth - headerTextX - margin - 5,
  });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(85, 100, 115);

  if (instituteAddress) {
    const addressLines = doc.splitTextToSize(
      instituteAddress,
      pageWidth - headerTextX - margin - 5
    );
    doc.text(addressLines.slice(0, 2), headerTextX, 29);
  }

  doc.setDrawColor(13, 148, 136);
  doc.setLineWidth(1.2);
  doc.line(margin + 5, 43, pageWidth - margin - 5, 43);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.setTextColor(15, 45, 72);
  doc.text("EXAM HALL TICKET", pageWidth / 2, 51, { align: "center" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(85, 100, 115);
  doc.text(`Ticket No: ${ticket.hallTicketNo}`, pageWidth / 2, 57, {
    align: "center",
  });

  // Student details
  let y = 67;

  doc.setFillColor(240, 253, 250);
  doc.roundedRect(margin + 5, y, contentWidth - 10, 9, 1.5, 1.5, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(15, 118, 110);
  doc.text("STUDENT DETAILS", margin + 9, y + 6);

  y += 17;

  const studentName =
    [student.firstName, student.middleName, student.surname]
      .filter(Boolean)
      .join(" ") || student.name;

  const leftX = margin + 8;
  const rightX = 112;
  const labelWidth = 29;

  const details = [
    ["Student Name", text(studentName)],
    ["Roll Number", text(student.rollNo)],
    ["Course", text(course.courseTitle)],
  ];

  doc.setFontSize(9);

  details.forEach(([label, value]) => {
    doc.setFont("helvetica", "bold");
    doc.setTextColor(65, 80, 95);
    doc.text(`${label}:`, leftX, y);

    doc.setFont("helvetica", "normal");
    doc.setTextColor(25, 40, 55);
    doc.text(value, leftX + labelWidth, y, { maxWidth: 67 });

    y += 8;
  });

  // Exam schedule
  y += 3;

  doc.setFillColor(240, 253, 250);
  doc.roundedRect(margin + 5, y, contentWidth - 10, 9, 1.5, 1.5, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(15, 118, 110);
  doc.text("EXAM DETAILS", margin + 9, y + 6);

  y += 17;

  const examDate = ticket.examDate
    ? new Date(ticket.examDate).toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "long",
        year: "numeric",
        timeZone: "UTC",
      })
    : "—";

  const examDetails = [
    ["Exam Date", examDate],
    ["Reporting Time", text(ticket.reportingTime)],
    ["Start Time", text(ticket.startTime)],
    ["End Time", text(ticket.endTime)],
    ["Total Questions", text(exam.totalQuestions)],
    ["Total Marks", text(exam.totalMarks)],
    ["Marks per Question", text(exam.marksPerQuestion)],
  ];

  examDetails.forEach(([label, value], index) => {
    const x = index % 2 === 0 ? leftX : rightX;
    const row = Math.floor(index / 2);
    const rowY = y + row * 10;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    doc.setTextColor(65, 80, 95);
    doc.text(`${label}:`, x, rowY);

    doc.setFont("helvetica", "normal");
    doc.setTextColor(25, 40, 55);
    doc.text(value, x + 31, rowY, { maxWidth: 48 });
  });

  y += Math.ceil(examDetails.length / 2) * 10 + 7;

  // Exactly five important instructions
  doc.setFillColor(240, 253, 250);
  doc.roundedRect(margin + 5, y, contentWidth - 10, 9, 1.5, 1.5, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(15, 118, 110);
  doc.text("IMPORTANT INSTRUCTIONS", margin + 9, y + 6);

  y += 15;

  const instructions = [
    "Arrive at the institute before the reporting time.",
    "Carry this hall ticket and a valid photo ID.",
    "Follow all instructions given by the invigilator.",
    "Mobile phones and unauthorized electronic devices are not allowed.",
    "Do not leave the examination room without permission.",
  ];

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(45, 55, 70);

  instructions.forEach((instruction, index) => {
    doc.setFont("helvetica", "bold");
    doc.text(`${index + 1}.`, leftX, y);

    doc.setFont("helvetica", "normal");
    const lines = doc.splitTextToSize(instruction, 155);
    doc.text(lines, leftX + 7, y);

    y += lines.length * 4.5 + 2;
  });

  // Bottom section: signature on the left, barcode on the right
  const bottomY = 259;

  doc.setDrawColor(150, 160, 170);
  doc.line(leftX, bottomY, leftX + 48, bottomY);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(90, 100, 110);
  doc.text("Authorized Signature", leftX, bottomY + 5);

  const barcodeWidth = 48;
  const barcodeHeight = 12;
  const barcodeX = pageWidth - margin - 8 - barcodeWidth;
  const barcodeY = 257;

  drawCode39(
    doc,
    ticket.hallTicketNo,
    barcodeX,
    barcodeY,
    barcodeWidth,
    barcodeHeight
  );

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(35, 45, 55);
  doc.text(ticket.hallTicketNo, barcodeX + barcodeWidth / 2, barcodeY + 17, {
    align: "center",
  });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(115, 125, 135);
  doc.text("Keep this ticket safe for the examination.", pageWidth / 2, 280, {
    align: "center",
  });

  const safeNumber = String(ticket.hallTicketNo).replace(/[^a-z0-9_-]/gi, "-");
  doc.save(`Hall-Ticket-${safeNumber}.pdf`);
}
