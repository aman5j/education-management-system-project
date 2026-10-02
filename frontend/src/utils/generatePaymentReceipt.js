import jsPDF from "jspdf";
import QRCode from "qrcode";

const money = (value) => {
  return `Rs. ${Number(
    value || 0
  ).toLocaleString("en-IN", {
    maximumFractionDigits: 2,
  })}`;
};

const formatDate = (value) => {
  if (!value) {
    return "—";
  }

  return new Date(value).toLocaleDateString(
    "en-IN",
    {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }
  );
};

// const getFrontendBaseUrl = () => {
//   return (
//     import.meta.env.VITE_FRONTEND_URL ||
//     window.location.origin
//   );
// };

const getFrontendBaseUrl = () => {
  const configuredUrl = import.meta.env.VITE_FRONTEND_URL;

  if (configuredUrl) {
    return configuredUrl.replace(/\/+$/, "");
  }

  return window.location.origin;
};

const verificationUrl =
  `${getFrontendBaseUrl()}/verify-receipt/${encodeURIComponent(receiptNo)}`;

export const generatePaymentReceipt = async (
  payment
) => {
  if (!payment) {
    throw new Error(
      "Payment information is required."
    );
  }

  if (payment.status !== "Verified") {
    throw new Error(
      "Only verified payments can generate a receipt."
    );
  }

  const receiptNo =
    payment.receipt_no ||
    payment.receiptNo;

  if (!receiptNo) {
    throw new Error(
      "Receipt number is missing."
    );
  }

  const student =
    payment.student_id || {};

  const admission =
    payment.admission_id || {};

  const course =
    admission.course_id || {};

  const batch =
    admission.batch_id || {};

  const studentName =
    [
      student.firstName,
      student.surname,
    ]
      .filter(Boolean)
      .join(" ") ||
    "Student";

  const courseName =
    course.courseTitle ||
    admission.course_type ||
    "—";

  const batchName =
    batch.batch_name ||
    "—";

  const totalFee = Number(
    admission.final_amount || 0
  );

  const paidFee = Number(
    admission.paid_amount || 0
  );

  const remainingFee = Math.max(
    0,
    totalFee - paidFee
  );

  /*
   * QR code opens the public verification page using frontend URL.
   */
  // const verificationUrl =
  //   `${getFrontendBaseUrl()}/verify-receipt/${encodeURIComponent(
  //     receiptNo
  //   )}`;

  
const verificationUrl =
  `${getFrontendBaseUrl()}/verify-receipt/${encodeURIComponent(receiptNo)}`;

  const qrDataUrl =
    await QRCode.toDataURL(
      verificationUrl,
      {
        width: 180,
        margin: 1,
      }
    );

  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const pageWidth =
    doc.internal.pageSize.getWidth();

  const pageHeight =
    doc.internal.pageSize.getHeight();

  /*
   * OUTER BORDER
   */
  doc.setDrawColor(
    210,
    214,
    220
  );

  doc.setLineWidth(0.5);

  doc.rect(
    10,
    10,
    pageWidth - 20,
    pageHeight - 20
  );

  /*
   * HEADER
   */
  doc.setFont(
    "helvetica",
    "bold"
  );

  doc.setFontSize(20);

  doc.text(
    "EDUCATION MANAGEMENT SYSTEM",
    pageWidth / 2,
    25,
    {
      align: "center",
    }
  );

  doc.setFont(
    "helvetica",
    "normal"
  );

  doc.setFontSize(10);

  doc.text(
    "Official Payment Receipt",
    pageWidth / 2,
    32,
    {
      align: "center",
    }
  );

  /*
   * RECEIPT NUMBER
   */
  doc.setFont(
    "helvetica",
    "bold"
  );

  doc.setFontSize(11);

  doc.text(
    `Receipt No: ${receiptNo}`,
    18,
    45
  );

  doc.setFont(
    "helvetica",
    "normal"
  );

  doc.text(
    `Payment Date: ${formatDate(
      payment.payment_date ||
        payment.paymentDate
    )}`,
    18,
    52
  );

  /*
   * STUDENT INFORMATION
   */
  let y = 65;

  doc.setFont(
    "helvetica",
    "bold"
  );

  doc.setFontSize(13);

  doc.text(
    "Student Information",
    18,
    y
  );

  y += 9;

  doc.setFont(
    "helvetica",
    "normal"
  );

  doc.setFontSize(10);

  doc.text(
    `Name: ${studentName}`,
    18,
    y
  );

  y += 7;

  doc.text(
    `Roll Number: ${
      student.rollNo || "—"
    }`,
    18,
    y
  );

  y += 7;

  doc.text(
    `Course: ${courseName}`,
    18,
    y
  );

  y += 7;

  doc.text(
    `Batch: ${batchName}`,
    18,
    y
  );

  y += 7;

  doc.text(
    `Admission Date: ${formatDate(
      admission.admission_date ||
        admission.admissionDate
    )}`,
    18,
    y
  );

  /*
   * PAYMENT INFORMATION
   */
  y += 15;

  doc.setFont(
    "helvetica",
    "bold"
  );

  doc.setFontSize(13);

  doc.text(
    "Payment Information",
    18,
    y
  );

  y += 9;

  doc.setFont(
    "helvetica",
    "normal"
  );

  doc.setFontSize(10);

  doc.text(
    `Payment Amount: ${money(
      payment.amount
    )}`,
    18,
    y
  );

  y += 7;

  doc.text(
    `Payment Mode: ${
      payment.payment_mode ||
      payment.paymentMode ||
      "—"
    }`,
    18,
    y
  );

  y += 7;

  doc.text(
    `Payment Status: ${
      payment.status || "—"
    }`,
    18,
    y
  );

  y += 7;

  doc.text(
    `Total Course Fee: ${money(
      totalFee
    )}`,
    18,
    y
  );

  y += 7;

  doc.text(
    `Total Paid Fee: ${money(
      paidFee
    )}`,
    18,
    y
  );

  y += 7;

  doc.text(
    `Remaining Fee: ${money(
      remainingFee
    )}`,
    18,
    y
  );

  /*
   * AMOUNT BOX
   */
  y += 14;

  doc.setDrawColor(
    190,
    196,
    204
  );

  doc.rect(
    18,
    y,
    105,
    22
  );

  doc.setFont(
    "helvetica",
    "bold"
  );

  doc.setFontSize(12);

  doc.text(
    "Amount Received",
    24,
    y + 9
  );

  doc.setFontSize(15);

  doc.text(
    money(payment.amount),
    24,
    y + 17
  );

  /*
   * QR CODE
   */
  const qrX =
    pageWidth - 65;

  const qrY =
    58;

  doc.addImage(
    qrDataUrl,
    "PNG",
    qrX,
    qrY,
    40,
    40
  );

  doc.setFont(
    "helvetica",
    "normal"
  );

  doc.setFontSize(8);

  doc.text(
    "Scan to verify receipt",
    qrX + 20,
    qrY + 45,
    {
      align: "center",
    }
  );

  /*
   * VERIFICATION URL
   */
  y += 38;

  doc.setFont(
    "helvetica",
    "bold"
  );

  doc.setFontSize(10);

  doc.text(
    "Receipt Verification",
    18,
    y
  );

  y += 7;

  doc.setFont(
    "helvetica",
    "normal"
  );

  doc.setFontSize(7);

  const verificationText =
    doc.splitTextToSize(
      verificationUrl,
      pageWidth - 36
    );

  doc.text(
    verificationText,
    18,
    y
  );

  /*
   * FOOTER
   */
  doc.setFontSize(8);

  doc.text(
    "This is a computer-generated payment receipt.",
    pageWidth / 2,
    pageHeight - 25,
    {
      align: "center",
    }
  );

  doc.text(
    "Verify the receipt using the QR code or receipt number.",
    pageWidth / 2,
    pageHeight - 19,
    {
      align: "center",
    }
  );

  const safeReceipt =
    String(receiptNo)
      .replace(
        /[^a-zA-Z0-9-_]/g,
        "-"
      );

  doc.save(
    `Payment-Receipt-${safeReceipt}.pdf`
  );
};

export default generatePaymentReceipt;