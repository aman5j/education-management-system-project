
import { jsPDF } from "jspdf";
import api from "../services/api";
import instituteSettingsService from "../services/instituteSettingsService";

const formatDate = (value) => {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "—";

  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
};

const money = (value) =>
  `Rs. ${Number(value || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

const resolveAssetUrl = (path) => {
  if (typeof path !== "string" || !path.trim()) return "";

  const value = path.trim();
  const apiBase = api.defaults.baseURL || "http://localhost:5000/api";
  const backendOrigin = new URL(apiBase, window.location.origin).origin;

  if (/^(data:|blob:)/i.test(value)) return value;

  if (/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?\//i.test(value)) {
    const oldUrl = new URL(value);
    return `${backendOrigin}${oldUrl.pathname}${oldUrl.search}`;
  }

  if (/^https?:\/\//i.test(value)) return value;

  return `${backendOrigin}/${value.replace(/^\/+/, "")}`;
};

const loadImage = (path) =>
  new Promise((resolve, reject) => {
    if (!path) {
      reject(new Error("Image path is empty."));
      return;
    }

    let url;

    try {
      url = resolveAssetUrl(path);
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
        resolve(canvas.toDataURL("image/png"));
      } catch (error) {
        reject(error);
      }
    };

    image.onerror = () =>
      reject(new Error(`Unable to load image: ${url}`));

    image.src = url;
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
    const data = await loadImage(path);
    pdf.addImage(data, "PNG", x, y, width, height, undefined, "FAST");
    return true;
  } catch (error) {
    console.warn("Admission form image could not be loaded:", error.message);
    return false;
  }
};

const getSettings = async () => {
  try {
    return await instituteSettingsService.getSettings();
  } catch (error) {
    console.warn("Unable to load institute settings:", error.message);

    try {
      const branding =
        await instituteSettingsService.getPublicBranding();

      return {
        instituteName: branding?.instituteName || "",
        logoUrl: branding?.logoUrl || "",
      };
    } catch {
      return {};
    }
  }
};

const clean = (value) => {
  if (value === null || value === undefined || value === "") {
    return "—";
  }

  return String(value);
};

export const downloadAdmissionForm = async (admission) => {
  if (!admission || !admission._id) {
    throw new Error("Admission information is missing. Refresh the page and try again.");
  }

  const student = admission.student_id;
  const course = admission.course_id;
  const batch = admission.batch_id;

  if (!student || typeof student !== "object" || !student._id) {
    throw new Error("Student information is missing. Refresh admissions and try again.");
  }

  const settings = await getSettings();
  const pdf = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
    compress: true,
  });

  const pageWidth = 210;
  const margin = 15;
  const contentWidth = pageWidth - margin * 2;
  let y = 14;

  const instituteName =
    settings?.instituteName?.trim() || "Educational Institute";

  const fullAddress = [
    settings?.address,
    settings?.city,
    settings?.state,
    settings?.postalCode,
    settings?.country,
  ]
    .filter(Boolean)
    .join(", ");

  // Page background and outer border.
  pdf.setFillColor(255, 255, 255);
  pdf.rect(0, 0, 210, 297, "F");

  pdf.setDrawColor(204, 216, 231);
  pdf.setLineWidth(0.4);
  pdf.roundedRect(7, 7, 196, 283, 3, 3, "S");

  // Institute header.
  pdf.setFillColor(16, 53, 104);
  pdf.roundedRect(margin, y, contentWidth, 32, 2, 2, "F");

  const logoLoaded = await addOptionalImage(
    pdf,
    settings?.logoUrl,
    margin + 4,
    y + 4,
    24,
    24
  );

  pdf.setTextColor(255, 255, 255);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(15);

  const instituteLines = pdf.splitTextToSize(instituteName, logoLoaded ? 145 : 175);
  pdf.text(instituteLines.slice(0, 2), margin + (logoLoaded ? 32 : 8), y + 11);

  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(8);

  const contactLine = [
    settings?.email,
    settings?.phone,
    settings?.website,
  ]
    .filter(Boolean)
    .join(" | ");

  if (contactLine) {
    pdf.text(
      pdf.splitTextToSize(contactLine, 170).slice(0, 1),
      margin + (logoLoaded ? 32 : 8),
      y + 24
    );
  }

  y += 40;

  pdf.setTextColor(16, 53, 104);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(16);
  pdf.text("STUDENT ADMISSION FORM", pageWidth / 2, y, {
    align: "center",
  });

  y += 5;

  pdf.setDrawColor(37, 99, 235);
  pdf.setLineWidth(0.7);
  pdf.line(margin, y, pageWidth - margin, y);

  y += 8;

  // Student identity panel.
  pdf.setFillColor(245, 248, 252);
  pdf.roundedRect(margin, y, contentWidth, 43, 2, 2, "F");

  const photoLoaded = await addOptionalImage(
    pdf,
    student.profileImage,
    margin + 4,
    y + 4,
    26,
    33
  );

  if (!photoLoaded) {
    pdf.setDrawColor(203, 213, 225);
    pdf.roundedRect(margin + 4, y + 4, 26, 33, 2, 2, "S");
    pdf.setTextColor(100, 116, 139);
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(8);

    const initials = [
      student.firstName?.[0],
      student.surname?.[0],
    ]
      .filter(Boolean)
      .join("")
      .toUpperCase() || "S";

    pdf.text(initials, margin + 17, y + 22, { align: "center" });
  }

  const studentName = [
    student.firstName,
    student.surname,
  ]
    .filter(Boolean)
    .join(" ") || "Student";

  pdf.setTextColor(20, 35, 60);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(12);
  pdf.text(pdf.splitTextToSize(studentName, 125).slice(0, 2), margin + 36, y + 10);

  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(9);
  pdf.setTextColor(71, 85, 105);

  pdf.text(`Roll Number: ${clean(student.rollNo)}`, margin + 36, y + 20);
  pdf.text(`Admission Date: ${formatDate(admission.admission_date)}`, margin + 36, y + 27);
  pdf.text(`Admission Status: ${clean(admission.status)}`, margin + 36, y + 34);

  y += 51;

  const drawSection = (title) => {
    pdf.setFillColor(230, 239, 250);
    pdf.roundedRect(margin, y, contentWidth, 8, 1, 1, "F");

    pdf.setTextColor(16, 53, 104);
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(9);
    pdf.text(title, margin + 3, y + 5.3);

    y += 12;
  };

  const drawRows = (rows, columns = 2) => {
    const columnWidth = contentWidth / columns;

    rows.forEach((row, index) => {
      const col = index % columns;
      const x = margin + col * columnWidth;

      pdf.setTextColor(100, 116, 139);
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(8);
      pdf.text(row[0], x + 2, y);

      pdf.setTextColor(30, 41, 59);
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(8.5);

      const valueLines = pdf.splitTextToSize(clean(row[1]), columnWidth - 8);
      pdf.text(valueLines.slice(0, 2), x + 2, y + 5);

      if (col === columns - 1 || index === rows.length - 1) {
        y += 13;
      }
    });
  };

  drawSection("PERSONAL INFORMATION");
  drawRows([
    ["Student Name", studentName],
    ["Father's Name", student.fatherName],
    ["Mother's Name", student.motherName],
    ["Date of Birth", formatDate(student.dob)],
    ["Gender", student.gender],
    ["Mobile Number", student.mobile],
    ["Alternate Mobile", student.alternateMobile],
    ["Email Address", student.email],
  ]);

  drawRows([
    ["Address", student.address],
    ["Pincode", student.pincode],
  ], 1);

  y += 1;

  if (y > 210) {
    pdf.addPage();
    y = 20;
  }

  drawSection("COURSE AND BATCH INFORMATION");
  drawRows([
    ["Course Name", course?.courseTitle],
    ["Course Type", admission.course_type || course?.courseType],
    ["Batch", batch?.batch_name],
    ["Batch Status", batch?.status],
  ]);

  y += 1;
  drawSection("FEE DETAILS");
  const remaining = Math.max(
    0,
    Number(admission.final_amount || 0) -
      Number(admission.paid_amount || 0)
  );

  drawRows([
    ["Course Fee", money(admission.course_fee)],
    [
      "Discount",
      `${clean(admission.discount_type)} - ${money(admission.discount_value)}`,
    ],
    ["GST", money(admission.gst_amount)],
    ["Admission Fee", money(admission.admission_fee)],
    ["Final Amount", money(admission.final_amount)],
    ["Paid Amount", money(admission.paid_amount)],
    ["Remaining Amount", money(remaining)],
    ["Referral Source", admission.referral_source],
  ]);

  y += 1;
  drawSection("ADDITIONAL INFORMATION");

  pdf.setTextColor(100, 116, 139);
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(8);
  pdf.text("Remarks", margin + 2, y);

  pdf.setTextColor(30, 41, 59);
  pdf.setFontSize(9);

  const remarkLines = pdf.splitTextToSize(
    clean(admission.remark),
    contentWidth - 4
  );

  pdf.text(remarkLines.slice(0, 3), margin + 2, y + 5);
  y += Math.max(13, Math.min(remarkLines.length, 3) * 4 + 7);

  // If content reaches the signature area, continue on another page.
  if (y > 250) {
    pdf.addPage();
    y = 20;
  }

  // Signature and stamp.
  pdf.setTextColor(71, 85, 105);
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(8);
  pdf.text("Institute Stamp", margin + 2, y + 3);

  await addOptionalImage(
    pdf,
    settings?.stampUrl,
    margin + 2,
    y + 5,
    25,
    22
  );

  await addOptionalImage(
    pdf,
    settings?.ownerSignatureUrl,
    pageWidth - margin - 48,
    y + 3,
    43,
    15
  );

  pdf.setDrawColor(148, 163, 184);
  pdf.setLineWidth(0.3);
  pdf.line(pageWidth - margin - 48, y + 20, pageWidth - margin - 2, y + 20);

  pdf.setTextColor(30, 41, 59);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(8);

  pdf.text(
    settings?.ownerName?.trim() || "Authorized Signatory",
    pageWidth - margin - 25,
    y + 25,
    { align: "center", maxWidth: 46 }
  );

  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(7);
  pdf.setTextColor(100, 116, 139);

  pdf.text(
    "Authorized Signature",
    pageWidth - margin - 25,
    y + 29,
    { align: "center" }
  );

  // Footer on every page.
  const pageCount = pdf.getNumberOfPages();

  for (let page = 1; page <= pageCount; page += 1) {
    pdf.setPage(page);
    pdf.setDrawColor(226, 232, 240);
    pdf.line(margin, 282, pageWidth - margin, 282);

    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(7);
    pdf.setTextColor(100, 116, 139);

    pdf.text(
      `Generated by ${instituteName}`,
      margin,
      287
    );

    pdf.text(
      `Page ${page} of ${pageCount}`,
      pageWidth - margin,
      287,
      { align: "right" }
    );
  }

  const safeRollNo = String(student.rollNo || "student")
    .replace(/[^a-z0-9_-]/gi, "_");

  pdf.save(`Admission-Form-${safeRollNo}.pdf`);
};
