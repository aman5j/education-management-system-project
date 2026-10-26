
import { jsPDF } from "jspdf";
import QRCode from "qrcode";
import { getAssetUrl } from "./assetUrl";
import instituteSettingsService from "../services/instituteSettingsService";

const formatDate = (value) => {
  if (!value) return "—";

  const date = new Date(value);

  return Number.isNaN(date.getTime())
    ? "—"
    : date.toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
};

const loadImage = (path) =>
  new Promise((resolve, reject) => {
    if (!path) {
      reject(new Error("Image not available"));
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
        context.drawImage(image, 0, 0);

        resolve(canvas.toDataURL("image/png"));
      } catch (error) {
        reject(error);
      }
    };

    image.onerror = () => reject(new Error("Unable to load image"));
    image.src = getAssetUrl(path);
  });

const addOptionalImage = async (
  pdf,
  path,
  x,
  y,
  width,
  height,
  options = {}
) => {
  if (!path) return;

  try {
    const imageData = await loadImage(path);

    pdf.addImage(
      imageData,
      "PNG",
      x,
      y,
      width,
      height,
      undefined,
      "FAST",
      options.rotation || 0
    );
  } catch {
    // A missing or inaccessible image must not prevent ID card generation.
  }
};

export const downloadAdmissionIdCard = async (admission) => {
  const student = admission?.student_id;
  const course = admission?.course_id;
  const batch = admission?.batch_id;

  if (!student || typeof student !== "object" || !student._id) {
    throw new Error(
      "Student information is missing. Refresh admissions and try again."
    );
  }

  const settings = await instituteSettingsService.getSettings();

  const instituteName =
    settings?.instituteName || "Educational Institute";

  // Portrait ID card size, in millimetres.
  const pdf = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: [85, 135],
    compress: true,
  });

  const pageWidth = 85;
  const pageHeight = 135;

  // Background and border.
  pdf.setFillColor(255, 255, 255);
  pdf.rect(0, 0, pageWidth, pageHeight, "F");

  pdf.setDrawColor(19, 61, 115);
  pdf.setLineWidth(0.8);
  pdf.roundedRect(2, 2, 81, 131, 3, 3, "S");

  // Institute header.
  pdf.setFillColor(16, 53, 104);
  pdf.roundedRect(2.5, 2.5, 80, 25, 2.5, 2.5, "F");
  pdf.rect(2.5, 21, 80, 6.5, "F");

  await addOptionalImage(
    pdf,
    settings?.logoUrl,
    5,
    5,
    15,
    15
  );

  pdf.setTextColor(255, 255, 255);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(10);

  const instituteLines = pdf.splitTextToSize(instituteName, 57);
  pdf.text(instituteLines.slice(0, 2), 23, 11);

  pdf.setFontSize(8);
  pdf.text("STUDENT ID CARD", pageWidth / 2, 24, {
    align: "center",
  });

  // Student photograph and QR code.
  await addOptionalImage(
    pdf,
    student.profileImage,
    7,
    32,
    27,
    30
  );

  const qrPayload = JSON.stringify({
    type: "EMS_STUDENT_ID",
    studentId: String(student._id),
    admissionId: String(admission._id),
    rollNo: student.rollNo || "",
  });

  const qrCode = await QRCode.toDataURL(qrPayload, {
    width: 300,
    margin: 1,
    errorCorrectionLevel: "M",
  });

  pdf.addImage(qrCode, "PNG", 44, 33, 32, 32);

  // Student name.
  const studentName = [
    student.firstName,
    student.surname,
  ]
    .filter(Boolean)
    .join(" ") || "Student";

  pdf.setTextColor(18, 40, 70);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(11);

  const nameLines = pdf.splitTextToSize(studentName, 72);
  pdf.text(nameLines.slice(0, 2), pageWidth / 2, 71, {
    align: "center",
  });

  // Student and admission details.
  const rows = [
    ["Father's Name", student.fatherName || "—"],
    ["Course", course?.courseTitle || "—"],
    ["Batch", batch?.batch_name || "—"],
    ["Roll Number", student.rollNo || "—"],
    ["Admission Date", formatDate(admission.admission_date)],
    ["Contact Number", student.mobile || "—"],
  ];

  let y = 79;

  rows.forEach(([label, value], index) => {
    pdf.setFillColor(
      index % 2 === 0 ? 239 : 248,
      index % 2 === 0 ? 245 : 250,
      252
    );

    pdf.roundedRect(6, y - 4.2, 73, 7.3, 1, 1, "F");

    pdf.setTextColor(35, 55, 78);
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(7);

    pdf.text(label, 8, y);

    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(7);

    const valueLines = pdf.splitTextToSize(String(value), 42);
    pdf.text(valueLines.slice(0, 1), 37, y);

    y += 8;
  });

  // Controller signature, when configured.
  if (settings?.controllerSignatureUrl) {
    await addOptionalImage(
      pdf,
      settings.controllerSignatureUrl,
      53,
      119,
      23,
      7
    );
  }

  pdf.setDrawColor(110, 125, 145);
  pdf.setLineWidth(0.2);
  pdf.line(49, 127, 78, 127);

  pdf.setTextColor(30, 48, 72);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(6.5);

  pdf.text(
    settings?.controllerName || "Authorized Signatory",
    63.5,
    130,
    { align: "center", maxWidth: 31 }
  );

  const safeRollNo = String(student.rollNo || "student")
    .replace(/[^a-z0-9_-]/gi, "_");

  pdf.save(`Student-ID-${safeRollNo}.pdf`);
};
