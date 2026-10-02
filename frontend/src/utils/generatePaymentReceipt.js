import jsPDF from "jspdf";
import QRCode from "qrcode";

const getFrontendBaseUrl = () => {
  const configuredUrl = import.meta.env.VITE_FRONTEND_URL;

  if (configuredUrl) {
    return configuredUrl.replace(/\/+$/, "");
  }

  return window.location.origin;
};

const formatDate = (value) => {
  if (!value) return "-";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
};

const formatCurrency = (value) => {
  const amount = Number(value || 0);

  return `Rs. ${amount.toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
};

const getStudentName = (student) => {
  return [
    student?.firstName,
    student?.surname,
  ]
    .filter(Boolean)
    .join(" ");
};

const generatePaymentReceipt = async (payment) => {
  try {
    if (!payment) {
      throw new Error("Payment information is missing.");
    }

    if (payment.status !== "Verified") {
      throw new Error(
        "Receipt can only be generated for a verified payment."
      );
    }

    // --------------------------------------------------
    // IMPORTANT:
    // Define receiptNo BEFORE using it anywhere.
    // --------------------------------------------------
    const receiptNo =
      payment.receipt_no ||
      payment.receiptNo ||
      payment.receiptNumber ||
      "";

    if (!receiptNo) {
      throw new Error(
        "Receipt number is missing for this payment."
      );
    }

    const student = payment.student_id || {};
    const admission = payment.admission_id || {};

    const studentName = getStudentName(student);

    const rollNo = student?.rollNo || "-";

    const courseTitle =
      admission?.course_id?.courseTitle ||
      admission?.courseTitle ||
      admission?.course_type ||
      "-";

    const batchName =
      admission?.batch_id?.batch_name ||
      admission?.batchName ||
      "-";

    const paymentAmount = Number(payment.amount || 0);

    const totalFee = Number(
      admission?.final_amount ||
        admission?.totalFee ||
        0
    );

    const paidFee = Number(
      admission?.paid_amount ||
        admission?.paidFee ||
        0
    );

    const remainingFee = Math.max(
      0,
      totalFee - paidFee
    );

    // --------------------------------------------------
    // QR CODE
    // QR opens the FRONTEND verification page.
    // --------------------------------------------------
    const frontendBaseUrl = getFrontendBaseUrl();

    const verificationUrl =
      `${frontendBaseUrl}/verify-receipt/${encodeURIComponent(
        receiptNo
      )}`;

    const qrDataUrl = await QRCode.toDataURL(
      verificationUrl,
      {
        width: 220,
        margin: 2,
        errorCorrectionLevel: "H",
      }
    );

    // --------------------------------------------------
    // PDF
    // --------------------------------------------------
    const doc = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4",
    });

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();

    const left = 18;
    const right = pageWidth - 18;

    // --------------------------------------------------
    // OUTER BORDER
    // --------------------------------------------------
    doc.setDrawColor(40, 40, 40);
    doc.setLineWidth(0.5);

    doc.rect(
      10,
      10,
      pageWidth - 20,
      pageHeight - 20
    );

    // --------------------------------------------------
    // HEADER
    // --------------------------------------------------
    doc.setFont("helvetica", "bold");
    doc.setFontSize(20);

    doc.text(
      "PAYMENT RECEIPT",
      pageWidth / 2,
      25,
      {
        align: "center",
      }
    );

    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);

    doc.text(
      "Education Management System",
      pageWidth / 2,
      32,
      {
        align: "center",
      }
    );

    // --------------------------------------------------
    // RECEIPT INFORMATION
    // --------------------------------------------------
    let y = 45;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);

    doc.text("Receipt Details", left, y);

    y += 8;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);

    doc.text(
      `Receipt No: ${receiptNo}`,
      left,
      y
    );

    doc.text(
      `Payment Date: ${formatDate(
        payment.payment_date
      )}`,
      right,
      y,
      {
        align: "right",
      }
    );

    y += 7;

    doc.text(
      `Payment Mode: ${
        payment.payment_mode || "-"
      }`,
      left,
      y
    );

    doc.text(
      `Status: ${payment.status || "-"}`,
      right,
      y,
      {
        align: "right",
      }
    );

    // --------------------------------------------------
    // STUDENT DETAILS
    // --------------------------------------------------
    y += 15;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);

    doc.text(
      "Student Details",
      left,
      y
    );

    y += 8;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);

    doc.text(
      `Student Name: ${studentName || "-"}`,
      left,
      y
    );

    y += 7;

    doc.text(
      `Roll No: ${rollNo}`,
      left,
      y
    );

    y += 7;

    doc.text(
      `Course: ${courseTitle}`,
      left,
      y
    );

    y += 7;

    doc.text(
      `Batch: ${batchName}`,
      left,
      y
    );

    y += 7;

    doc.text(
      `Admission Date: ${formatDate(
        admission.admission_date
      )}`,
      left,
      y
    );

    // --------------------------------------------------
    // PAYMENT DETAILS
    // --------------------------------------------------
    y += 15;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);

    doc.text(
      "Fee Details",
      left,
      y
    );

    y += 8;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);

    doc.text(
      `Total Fee: ${formatCurrency(totalFee)}`,
      left,
      y
    );

    y += 7;

    doc.text(
      `Previously Paid: ${formatCurrency(
        Math.max(
          0,
          paidFee - paymentAmount
        )
      )}`,
      left,
      y
    );

    y += 7;

    doc.text(
      `This Payment: ${formatCurrency(
        paymentAmount
      )}`,
      left,
      y
    );

    y += 7;

    doc.text(
      `Total Paid: ${formatCurrency(paidFee)}`,
      left,
      y
    );

    y += 7;

    doc.setFont("helvetica", "bold");

    doc.text(
      `Remaining Fee: ${formatCurrency(
        remainingFee
      )}`,
      left,
      y
    );

    // --------------------------------------------------
    // QR SECTION
    // --------------------------------------------------
    y += 20;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);

    doc.text(
      "Receipt Verification",
      left,
      y
    );

    y += 7;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);

    doc.text(
      "Scan this QR code to verify this receipt.",
      left,
      y
    );

    // QR image
    const qrSize = 42;

    doc.addImage(
      qrDataUrl,
      "PNG",
      left,
      y + 5,
      qrSize,
      qrSize
    );

    // QR URL
    doc.setFontSize(7);

    const qrText = verificationUrl;

    const wrappedQrText =
      doc.splitTextToSize(
        qrText,
        110
      );

    doc.text(
      wrappedQrText,
      left + qrSize + 8,
      y + 15
    );

    // --------------------------------------------------
    // NOTES
    // --------------------------------------------------
    if (payment.notes) {
      y += 55;

      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);

      doc.text(
        "Notes",
        left,
        y
      );

      y += 6;

      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);

      const notesLines =
        doc.splitTextToSize(
          payment.notes,
          pageWidth - 36
        );

      doc.text(
        notesLines,
        left,
        y
      );
    }

    // --------------------------------------------------
    // FOOTER
    // --------------------------------------------------
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);

    doc.text(
      "This is a computer generated payment receipt.",
      pageWidth / 2,
      pageHeight - 25,
      {
        align: "center",
      }
    );

    doc.text(
      "Receipt verification is available through the QR code.",
      pageWidth / 2,
      pageHeight - 20,
      {
        align: "center",
      }
    );

    // --------------------------------------------------
    // DOWNLOAD
    // --------------------------------------------------
    doc.save(
      `Payment-Receipt-${receiptNo}.pdf`
    );
  } catch (error) {
    console.error(
      "Payment receipt generation error:",
      error
    );

    throw error;
  }
};

export default generatePaymentReceipt;