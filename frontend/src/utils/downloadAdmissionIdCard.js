
import { jsPDF } from "jspdf";
import QRCode from "qrcode";
import api from "../services/api";
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

// Resolve stored paths using the same backend origin as the API.
// const resolveAssetUrl = (path) => {
//   if (typeof path !== "string" || !path.trim()) return "";

//   const value = path.trim();

//   if (/^(data:|blob:|https?:\/\/)/i.test(value)) {
//     return value;
//   }

//   const apiBase = api.defaults.baseURL || "http://localhost:5000/api";
//   const backendOrigin = new URL(apiBase, window.location.origin).origin;

//   return `${backendOrigin}/${value.replace(/^\/+/, "")}`;
// };


const resolveAssetUrl = (path) => {
  if (typeof path !== "string" || !path.trim()) return "";

  const value = path.trim();
  const apiBase = api.defaults.baseURL || "http://localhost:5000/api";
  const backendOrigin = new URL(apiBase, window.location.origin).origin;

  if (/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?\//i.test(value)) {
    const oldUrl = new URL(value);
    return `${backendOrigin}${oldUrl.pathname}${oldUrl.search}`;
  }

  if (/^(data:|blob:)/i.test(value)) {
    return value;
  }

  if (/^https?:\/\//i.test(value)) {
    return value;
  }

  return `${backendOrigin}/${value.replace(/^\/+/, "")}`;
};


const loadImage = (path) =>
  new Promise((resolve, reject) => {
    if (!path) {
      reject(new Error("Image path is empty."));
      return;
    }

    let imageUrl;

    try {
      imageUrl = resolveAssetUrl(path);
    } catch {
      reject(new Error("Invalid image URL."));
      return;
    }

    const image = new Image();

    // Required when the backend serves images from another origin.
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
        resolve(canvas.toDataURL("image/png"));
      } catch (error) {
        reject(error);
      }
    };

    image.onerror = () => {
      reject(new Error(`Unable to load image: ${imageUrl}`));
    };

    image.src = imageUrl;
  });

const addOptionalImage = async (
  pdf,
  path,
  x,
  y,
  width,
  height
) => {
  if (!path) return false;

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
      "FAST"
    );

    return true;
  } catch (error) {
    console.warn("ID card image could not be loaded:", error.message);
    return false;
  }
};

const getInstituteInitials = (name = "") =>
  name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join("") || "EMS";

const getInstituteSettings = async () => {
  let settings = {};

  try {
    settings = await instituteSettingsService.getSettings();
  } catch (error) {
    console.warn("Could not load institute settings:", error.message);
  }

  // If the protected settings response has no logo, try public branding.
  if (!settings?.logoUrl) {
    try {
      const branding =
        await instituteSettingsService.getPublicBranding();

      settings = {
        ...settings,
        logoUrl: branding?.logoUrl || "",
      };
    } catch (error) {
      console.warn("Could not load public institute branding:", error.message);
    }
  }

  return settings;
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

  const settings = await getInstituteSettings();

  const instituteName =
    settings?.instituteName || "Educational Institute";

  const pdf = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: [85, 135],
    compress: true,
  });

  const pageWidth = 85;
  const pageHeight = 135;

  // Card background and border.
  pdf.setFillColor(255, 255, 255);
  pdf.rect(0, 0, pageWidth, pageHeight, "F");

  pdf.setDrawColor(19, 61, 115);
  pdf.setLineWidth(0.8);
  pdf.roundedRect(2, 2, 81, 131, 3, 3, "S");

  // Institute header.
  pdf.setFillColor(16, 53, 104);
  pdf.roundedRect(2.5, 2.5, 80, 25, 2.5, 2.5, "F");
  pdf.rect(2.5, 21, 80, 6.5, "F");

  // Dedicated white background makes the logo visible on the dark header.
  pdf.setFillColor(255, 255, 255);
  pdf.roundedRect(5, 5, 17, 17, 1.5, 1.5, "F");

  const logoLoaded = await addOptionalImage(
    pdf,
    settings?.logoUrl,
    5.5,
    5.5,
    16,
    16
  );

  // Fallback if no logo is configured or its URL is unavailable.
  if (!logoLoaded) {
    pdf.setTextColor(16, 53, 104);
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(8);

    pdf.text(
      getInstituteInitials(instituteName),
      13.5,
      15,
      { align: "center" }
    );
  }

  pdf.setTextColor(255, 255, 255);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(10);

  const instituteLines = pdf.splitTextToSize(instituteName, 56);
  pdf.text(instituteLines.slice(0, 2), 24, 11);

  pdf.setFontSize(8);
  pdf.text("STUDENT ID CARD", pageWidth / 2, 24, {
    align: "center",
  });

  // Student photograph.
  await addOptionalImage(
    pdf,
    student.profileImage,
    7,
    32,
    27,
    30
  );

  // QR code contains identifiers, not private contact information.
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

  // Actual student and admission details.
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
    const shade = index % 2 === 0 ? 239 : 248;

    pdf.setFillColor(shade, index % 2 === 0 ? 245 : 250, 252);
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

  // Controller signature and name from institute settings.
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
