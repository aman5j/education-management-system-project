import jsPDF from "jspdf";
import QRCode from "qrcode";

/*
|--------------------------------------------------------------------------
| IT LEARNING INSTITUTE
| PAYMENT RECEIPT
|--------------------------------------------------------------------------
|
| IMPORTANT QR ARCHITECTURE
|
| QR CODE
|    ↓
| FRONTEND:
| /verify-receipt/:receiptNo
|    ↓
| VerifyReceipt.jsx
|    ↓
| BACKEND:
| /api/public/receipts/verify/:receiptNo
|
|--------------------------------------------------------------------------
*/

/* ========================================================================
   INSTITUTE INFORMATION
   ======================================================================== */

const INSTITUTE_NAME = "IT LEARNING INSTITUTE";

const INSTITUTE_TAGLINE =
  "An ISO 9001:2015 Certified Organization";

const INSTITUTE_ADDRESS =
  "ADDRESS : 2ND FLOOR, NATRAJ GYM, CHAR SHAHAR KA NAKA, HAZIRA,\n" +
  "GWALIOR, MADHYA PRADESH 474003";

const WEBSITE = "www.itlearning.in";

const PHONE = "+91 9770622162";

/* ========================================================================
   COLORS
   ======================================================================== */

const COLORS = {
  purple: [42, 30, 145],
  darkPurple: [32, 23, 105],

  orange: [255, 90, 20],

  blue: [20, 140, 235],
  lightBlue: [232, 246, 255],

  green: [0, 185, 100],
  lightGreen: [232, 249, 240],

  violet: [105, 30, 220],
  lightViolet: [246, 239, 255],

  yellow: [242, 170, 0],
  lightYellow: [255, 248, 225],

  dark: [15, 22, 45],
  border: [190, 202, 218],

  white: [255, 255, 255],
};

/* ========================================================================
   HELPERS
   ======================================================================== */

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

const formatMoney = (value) => {
  return `Rs. ${Number(value || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
};

const getStudentName = (student = {}) => {
  return (
    [student?.firstName, student?.surname]
      .filter(Boolean)
      .join(" ") || "-"
  );
};

const getCourseName = (admission = {}) => {
  return (
    admission?.course_id?.courseTitle ||
    admission?.courseTitle ||
    admission?.course_type ||
    "-"
  );
};

const getBatchName = (admission = {}) => {
  return (
    admission?.batch_id?.batch_name ||
    admission?.batchName ||
    "-"
  );
};

/* ========================================================================
   VERY IMPORTANT
   ========================================================================

   DO NOT use VITE_FRONTEND_URL here.

   Your uploaded PDF proved that the environment variable was resolving
   to the backend URL.

   Because this function runs inside the frontend browser, the safest
   verification URL is ALWAYS the current frontend origin.

   Example production:

   https://education-management-system.netlify.app

   Example local:

   http://localhost:5173

   ======================================================================== */

// const getFrontendBaseUrl = () => {
//   return window.location.origin.replace(/\/+$/, "");
// };

const getFrontendBaseUrl = () => {
  return window.location.origin.replace(/\/+$/, "");
};

/* ========================================================================
   VECTOR ICONS
   ======================================================================== */

const drawPersonIcon = (
  doc,
  x,
  y,
  color
) => {
  doc.setFillColor(...color);

  doc.circle(
    x,
    y - 2.2,
    1.8,
    "F"
  );

  doc.roundedRect(
    x - 4,
    y + 0.3,
    8,
    4.8,
    2,
    2,
    "F"
  );
};

const drawDocumentIcon = (
  doc,
  x,
  y,
  color
) => {
  doc.setDrawColor(...color);
  doc.setLineWidth(0.7);

  doc.roundedRect(
    x - 3.5,
    y - 5,
    7,
    10,
    0.8,
    0.8,
    "S"
  );

  doc.line(
    x - 2,
    y - 1.8,
    x + 2,
    y - 1.8
  );

  doc.line(
    x - 2,
    y + 0.2,
    x + 2,
    y + 0.2
  );

  doc.line(
    x - 2,
    y + 2.2,
    x + 1.2,
    y + 2.2
  );
};

const drawQRIcon = (
  doc,
  x,
  y,
  color
) => {
  doc.setDrawColor(...color);
  doc.setFillColor(...color);
  doc.setLineWidth(0.6);

  const finder = (fx, fy) => {
    doc.rect(
      fx,
      fy,
      4.5,
      4.5,
      "S"
    );

    doc.rect(
      fx + 1.2,
      fy + 1.2,
      2.1,
      2.1,
      "F"
    );
  };

  finder(x - 6, y - 6);
  finder(x + 1.5, y - 6);
  finder(x - 6, y + 1.5);

  doc.rect(
    x + 2,
    y + 2,
    2,
    2,
    "F"
  );

  doc.rect(
    x - 1,
    y + 3,
    2,
    2,
    "F"
  );
};

const drawGlobeIcon = (
  doc,
  x,
  y,
  color
) => {
  doc.setDrawColor(...color);
  doc.setLineWidth(0.55);

  doc.circle(
    x,
    y,
    3.2,
    "S"
  );

  doc.ellipse(
    x,
    y,
    1.3,
    3.2,
    "S"
  );

  doc.line(
    x - 3.2,
    y,
    x + 3.2,
    y
  );
};

const drawPhoneIcon = (
  doc,
  x,
  y,
  color
) => {
  doc.setDrawColor(...color);
  doc.setLineWidth(0.7);

  doc.roundedRect(
    x - 2.2,
    y - 3.5,
    4.4,
    7,
    1,
    1,
    "S"
  );

  doc.setFillColor(...color);

  doc.circle(
    x,
    y + 2.5,
    0.3,
    "F"
  );
};

const drawCheckIcon = (
  doc,
  x,
  y
) => {
  doc.setFillColor(
    ...COLORS.green
  );

  doc.circle(
    x,
    y,
    2.7,
    "F"
  );

  doc.setDrawColor(
    ...COLORS.white
  );

  doc.setLineWidth(0.7);

  doc.line(
    x - 1.1,
    y,
    x - 0.3,
    y + 1
  );

  doc.line(
    x - 0.3,
    y + 1,
    x + 1.5,
    y - 1.1
  );
};

/* ========================================================================
   SECTION HEADER
   ======================================================================== */

const drawSectionHeader = (
  doc,
  {
    x,
    y,
    width,
    title,
    background,
    icon,
    iconColor,
  }
) => {
  const height = 14;

  doc.setFillColor(
    ...background
  );

  doc.roundedRect(
    x,
    y,
    width,
    height,
    3,
    3,
    "F"
  );

  doc.setFillColor(
    ...COLORS.white
  );

  doc.circle(
    x + 10,
    y + 7,
    5,
    "F"
  );

  if (icon === "person") {
    drawPersonIcon(
      doc,
      x + 10,
      y + 7,
      iconColor
    );
  }

  if (icon === "document") {
    drawDocumentIcon(
      doc,
      x + 10,
      y + 7,
      iconColor
    );
  }

  if (icon === "qr") {
    drawQRIcon(
      doc,
      x + 10,
      y + 7,
      iconColor
    );
  }

  if (icon === "note") {
    drawDocumentIcon(
      doc,
      x + 10,
      y + 7,
      iconColor
    );
  }

  doc.setTextColor(
    ...COLORS.dark
  );

  doc.setFont(
    "helvetica",
    "bold"
  );

  doc.setFontSize(13);

  doc.text(
    title,
    x + 20,
    y + 9
  );
};

/* ========================================================================
   KEY VALUE
   ======================================================================== */

const drawKeyValue = (
  doc,
  {
    label,
    value,
    x,
    y,
    labelWidth,
    valueWidth,
  }
) => {
  doc.setTextColor(
    ...COLORS.dark
  );

  doc.setFont(
    "helvetica",
    "normal"
  );

  doc.setFontSize(8.7);

  doc.text(
    label,
    x,
    y
  );

  doc.text(
    ":",
    x + labelWidth,
    y
  );

  doc.setFont(
    "helvetica",
    "bold"
  );

  const lines =
    doc.splitTextToSize(
      String(value || "-"),
      valueWidth
    );

  doc.text(
    lines,
    x + labelWidth + 4,
    y
  );
};

/* ========================================================================
   VERIFIED BADGE
   ======================================================================== */

const drawVerifiedBadge = (
  doc,
  x,
  y
) => {
  doc.setFillColor(
    ...COLORS.green
  );

  doc.roundedRect(
    x,
    y - 4.5,
    26,
    7.5,
    3.5,
    3.5,
    "F"
  );

  doc.setTextColor(
    ...COLORS.white
  );

  doc.setFont(
    "helvetica",
    "bold"
  );

  doc.setFontSize(6.8);

  doc.text(
    "Verified",
    x + 13,
    y + 0.2,
    {
      align: "center",
    }
  );
};

/* ========================================================================
   PAYMENT HISTORY
   ======================================================================== */

const drawPaymentHistory = (
  doc,
  {
    x,
    y,
    width,
    payments,
  }
) => {
  const headerHeight = 8.5;

  const rowHeight = 7;

  const columnWidths = [
    width * 0.25,
    width * 0.25,
    width * 0.25,
    width * 0.25,
  ];

  const headers = [
    "Payment Date",
    "Payment Mode",
    "Paid Amount",
    "Status",
  ];

  doc.setFillColor(
    ...COLORS.lightBlue
  );

  doc.rect(
    x,
    y,
    width,
    headerHeight,
    "F"
  );

  doc.setDrawColor(
    ...COLORS.border
  );

  doc.setLineWidth(0.3);

  doc.rect(
    x,
    y,
    width,
    headerHeight
  );

  let currentX = x;

  headers.forEach(
    (header, index) => {
      const columnWidth =
        columnWidths[index];

      if (index > 0) {
        doc.line(
          currentX,
          y,
          currentX,
          y + headerHeight
        );
      }

      doc.setTextColor(
        ...COLORS.dark
      );

      doc.setFont(
        "helvetica",
        "bold"
      );

      doc.setFontSize(6.8);

      doc.text(
        header,
        currentX +
          columnWidth / 2,
        y + 5.5,
        {
          align: "center",
        }
      );

      currentX += columnWidth;
    }
  );

  let currentY =
    y + headerHeight;

  payments.forEach(
    (payment) => {
      currentX = x;

      doc.setFillColor(
        ...COLORS.white
      );

      doc.rect(
        x,
        currentY,
        width,
        rowHeight,
        "F"
      );

      doc.setDrawColor(
        ...COLORS.border
      );

      doc.rect(
        x,
        currentY,
        width,
        rowHeight
      );

      const values = [
        formatDate(
          payment?.payment_date
        ),

        payment?.payment_mode ||
          "-",

        formatMoney(
          payment?.amount
        ),

        "Paid",
      ];

      values.forEach(
        (value, index) => {
          const columnWidth =
            columnWidths[index];

          if (index > 0) {
            doc.line(
              currentX,
              currentY,
              currentX,
              currentY +
                rowHeight
            );
          }

          if (index === 3) {
            doc.setFillColor(
              ...COLORS.lightGreen
            );

            doc.roundedRect(
              currentX +
                columnWidth / 2 -
                10,
              currentY + 1,
              20,
              5,
              2.5,
              2.5,
              "F"
            );

            doc.setTextColor(
              0,
              115,
              70
            );

            doc.setFont(
              "helvetica",
              "bold"
            );

            doc.setFontSize(6);

            doc.text(
              value,
              currentX +
                columnWidth / 2,
              currentY + 4.6,
              {
                align: "center",
              }
            );
          } else {
            doc.setTextColor(
              ...COLORS.dark
            );

            doc.setFont(
              "helvetica",
              index === 2
                ? "bold"
                : "normal"
            );

            doc.setFontSize(6.7);

            doc.text(
              value,
              currentX +
                columnWidth / 2,
              currentY + 4.7,
              {
                align: "center",
              }
            );
          }

          currentX += columnWidth;
        }
      );

      currentY += rowHeight;
    }
  );

  return currentY;
};

/* ========================================================================
   MAIN RECEIPT FUNCTION
   ======================================================================== */

const generatePaymentReceipt = async (
  payment,
  paymentHistory = []
) => {
  try {
    /* ----------------------------------------------------------------------
       VALIDATE PAYMENT
       ---------------------------------------------------------------------- */

    if (!payment) {
      throw new Error(
        "Payment information is missing."
      );
    }

    if (
      payment.status !==
      "Verified"
    ) {
      throw new Error(
        "Receipt can only be generated for a verified payment."
      );
    }

    /* ----------------------------------------------------------------------
       RECEIPT NUMBER
       ---------------------------------------------------------------------- */

    const receiptNo =
      payment.receipt_no ||
      payment.receiptNo ||
      payment.receiptNumber ||
      "";

    if (!receiptNo) {
      throw new Error(
        "Receipt number is missing."
      );
    }

    /* ----------------------------------------------------------------------
       CORRECT FRONTEND VERIFICATION URL
       ---------------------------------------------------------------------- */

    /*
     * IMPORTANT:
     *
     * We deliberately DO NOT use:
     *
     * import.meta.env.VITE_FRONTEND_URL
     *
     * because your uploaded PDF proved that it was producing:
     *
     * backend.onrender.com/api/verify-receipt/...
     *
     * Instead, window.location.origin ALWAYS points to the frontend
     * application that is generating this PDF.
     */

    const frontendBaseUrl =
      getFrontendBaseUrl();

    const verificationUrl =
      `${frontendBaseUrl}/verify-receipt/${encodeURIComponent(
        receiptNo
      )}`;

    console.log(
      "======================================"
    );

    console.log(
      "PAYMENT RECEIPT QR URL:"
    );

    console.log(
      verificationUrl
    );

    console.log(
      "======================================"
    );

    /* ----------------------------------------------------------------------
       QR CODE
       ---------------------------------------------------------------------- */

    const qrDataUrl =
      await QRCode.toDataURL(
        verificationUrl,
        {
          errorCorrectionLevel: "H",
          type: "image/png",

          /*
           * High resolution.
           */
          width: 1000,

          /*
           * Quiet white border around QR.
           */
          margin: 5,

          color: {
            dark: "#000000",
            light: "#FFFFFF",
          },
        }
      );

    /* ----------------------------------------------------------------------
       DATA
       ---------------------------------------------------------------------- */

    const student =
      payment.student_id || {};

    const admission =
      payment.admission_id || {};

    const studentName =
      getStudentName(student);

    const courseName =
      getCourseName(admission);

    const batchName =
      getBatchName(admission);

    const totalFee =
      Number(
        admission?.final_amount ??
          admission?.totalFee ??
          0
      );

    const currentPayment =
      Number(
        payment.amount || 0
      );

    /* ----------------------------------------------------------------------
       PAYMENT HISTORY
       ---------------------------------------------------------------------- */

    let verifiedPayments =
      Array.isArray(
        paymentHistory
      )
        ? paymentHistory.filter(
            (item) =>
              item?.status ===
              "Verified"
          )
        : [];

    const currentExists =
      verifiedPayments.some(
        (item) =>
          (
            item?.receipt_no ||
            item?.receiptNo
          ) === receiptNo
      );

    if (!currentExists) {
      verifiedPayments.push(
        payment
      );
    }

    verifiedPayments.sort(
      (a, b) =>
        new Date(
          a?.payment_date || 0
        ).getTime() -
        new Date(
          b?.payment_date || 0
        ).getTime()
    );

    /*
     * Maximum five rows.
     */
    const displayedPayments =
      verifiedPayments.slice(-5);

    /* ----------------------------------------------------------------------
       PAYMENT CALCULATIONS
       ---------------------------------------------------------------------- */

    const historyTotal =
      verifiedPayments.reduce(
        (sum, item) =>
          sum +
          Number(
            item?.amount || 0
          ),
        0
      );

    const admissionPaid =
      Number(
        admission?.paid_amount ??
          admission?.paidFee ??
          0
      );

    const totalPaid = Math.max(
      historyTotal,
      admissionPaid
    );

    const previousPaid =
      Math.max(
        0,
        totalPaid -
          currentPayment
      );

    const remainingFee =
      Math.max(
        0,
        totalFee -
          totalPaid
      );

    /* ======================================================================
       PDF
       ====================================================================== */

    const doc = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4",
    });

    const pageWidth =
      doc.internal.pageSize.getWidth();

    const pageHeight =
      doc.internal.pageSize.getHeight();

    const margin = 6;

    const contentWidth =
      pageWidth -
      margin * 2;

    /* ======================================================================
       OUTER BORDER
       ====================================================================== */

    doc.setDrawColor(
      ...COLORS.purple
    );

    doc.setLineWidth(0.6);

    doc.rect(
      1.5,
      1.5,
      pageWidth - 3,
      pageHeight - 3
    );

    /* ======================================================================
       TOP PURPLE STRIP
       ====================================================================== */

    doc.setFillColor(
      ...COLORS.purple
    );

    doc.rect(
      1.5,
      1.5,
      pageWidth - 3,
      7,
      "F"
    );

    /* ======================================================================
       HEADER
       ====================================================================== */

    /*
     * Orange logo
     */
    doc.setFillColor(
      ...COLORS.orange
    );

    doc.circle(
      36,
      25,
      10,
      "F"
    );

    doc.setTextColor(
      ...COLORS.white
    );

    doc.setFont(
      "helvetica",
      "bold"
    );

    doc.setFontSize(10);

    doc.text(
      "</>",
      36,
      29,
      {
        align: "center",
      }
    );

    /*
     * IT Learning
     */
    doc.setTextColor(
      ...COLORS.dark
    );

    doc.setFont(
      "helvetica",
      "bold"
    );

    doc.setFontSize(20);

    doc.text(
      "IT Learning",
      50,
      24
    );

    doc.setFontSize(8.5);

    doc.text(
      "institute",
      50,
      30
    );

    /*
     * Institute name
     */
    doc.setFontSize(15);

    doc.text(
      INSTITUTE_NAME,
      12,
      45
    );

    doc.setFontSize(8);

    doc.text(
      INSTITUTE_TAGLINE,
      28,
      51
    );

    /*
     * Address
     */
    doc.setFont(
      "helvetica",
      "normal"
    );

    doc.setFontSize(7);

    doc.text(
      INSTITUTE_ADDRESS.split(
        "\n"
      ),
      60,
      56,
      {
        align: "center",
      }
    );

    /*
     * Header divider
     */
    doc.setDrawColor(
      ...COLORS.dark
    );

    doc.setLineWidth(0.45);

    doc.line(
      124,
      13,
      124,
      58
    );

    /*
     * Payment Receipt title
     */
    doc.setFont(
      "helvetica",
      "bold"
    );

    doc.setFontSize(17);

    doc.text(
      "PAYMENT RECEIPT",
      132,
      21
    );

    doc.setFontSize(8.7);

    doc.text(
      "Education Management System",
      132,
      28
    );

    /*
     * Receipt information
     */
    doc.setFillColor(
      246,
      247,
      255
    );

    doc.roundedRect(
      129,
      32,
      74,
      25,
      4,
      4,
      "F"
    );

    doc.setTextColor(
      ...COLORS.dark
    );

    doc.setFont(
      "helvetica",
      "normal"
    );

    doc.setFontSize(8);

    doc.text(
      "Receipt No",
      133,
      39
    );

    doc.text(
      ":",
      158,
      39
    );

    doc.setFont(
      "helvetica",
      "bold"
    );

    doc.setFontSize(7.2);

    doc.text(
      receiptNo,
      163,
      39
    );

    doc.setFont(
      "helvetica",
      "normal"
    );

    doc.setFontSize(8);

    doc.text(
      "Payment Date",
      133,
      46
    );

    doc.text(
      ":",
      158,
      46
    );

    doc.setFont(
      "helvetica",
      "bold"
    );

    doc.text(
      formatDate(
        payment.payment_date
      ),
      163,
      46
    );

    doc.setFont(
      "helvetica",
      "normal"
    );

    doc.text(
      "Status",
      133,
      53
    );

    doc.text(
      ":",
      158,
      53
    );

    drawVerifiedBadge(
      doc,
      163,
      53
    );

    /* ======================================================================
       CONTACT BAR
       ====================================================================== */

    doc.setFillColor(
      ...COLORS.purple
    );

    doc.rect(
      1.5,
      59,
      pageWidth - 3,
      11,
      "F"
    );

    drawGlobeIcon(
      doc,
      51,
      64.5,
      COLORS.white
    );

    doc.setTextColor(
      ...COLORS.white
    );

    doc.setFont(
      "helvetica",
      "bold"
    );

    doc.setFontSize(9);

    doc.text(
      WEBSITE,
      74,
      66,
      {
        align: "center",
      }
    );

    doc.text(
      "|",
      pageWidth / 2,
      66,
      {
        align: "center",
      }
    );

    drawPhoneIcon(
      doc,
      119,
      64.5,
      COLORS.white
    );

    doc.text(
      PHONE,
      145,
      66,
      {
        align: "center",
      }
    );

    /* ======================================================================
       STUDENT DETAILS
       ====================================================================== */

    const studentHeaderY = 75;

    drawSectionHeader(
      doc,
      {
        x: margin,
        y: studentHeaderY,
        width: contentWidth,
        title:
          "Student Details",
        background:
          COLORS.lightBlue,
        icon: "person",
        iconColor:
          COLORS.blue,
      }
    );

    const studentBoxY =
      studentHeaderY + 14;

    doc.setDrawColor(
      ...COLORS.border
    );

    doc.setLineWidth(0.3);

    doc.roundedRect(
      margin,
      studentBoxY,
      contentWidth,
      30,
      3,
      3
    );

    /*
     * Divider
     */
    doc.setDrawColor(
      ...COLORS.blue
    );

    doc.setLineWidth(0.4);

    doc.line(
      110,
      studentBoxY + 4,
      110,
      studentBoxY + 26
    );

    drawKeyValue(
      doc,
      {
        label: "Student Name",
        value: studentName,
        x: 13,
        y:
          studentBoxY + 9,
        labelWidth: 34,
        valueWidth: 57,
      }
    );

    drawKeyValue(
      doc,
      {
        label: "Roll No",
        value:
          student?.rollNo ||
          "-",
        x: 13,
        y:
          studentBoxY + 18,
        labelWidth: 34,
        valueWidth: 57,
      }
    );

    drawKeyValue(
      doc,
      {
        label: "Course",
        value: courseName,
        x: 13,
        y:
          studentBoxY + 27,
        labelWidth: 34,
        valueWidth: 57,
      }
    );

    drawKeyValue(
      doc,
      {
        label: "Batch",
        value: batchName,
        x: 118,
        y:
          studentBoxY + 9,
        labelWidth: 31,
        valueWidth: 48,
      }
    );

    drawKeyValue(
      doc,
      {
        label: "Admission Date",
        value:
          formatDate(
            admission?.admission_date
          ),
        x: 118,
        y:
          studentBoxY + 18,
        labelWidth: 31,
        valueWidth: 48,
      }
    );

    /* ======================================================================
       PAYMENT HISTORY
       ====================================================================== */

    const paymentHeaderY = 121;

    drawSectionHeader(
      doc,
      {
        x: margin,
        y: paymentHeaderY,
        width: contentWidth,
        title:
          "Payment History",
        background:
          COLORS.lightGreen,
        icon: "document",
        iconColor:
          COLORS.green,
      }
    );

    const paymentTableBottom =
      drawPaymentHistory(
        doc,
        {
          x: margin,
          y:
            paymentHeaderY + 14,
          width: contentWidth,
          payments:
            displayedPayments,
        }
      );

    /* ======================================================================
       FEE DETAILS
       ====================================================================== */

    const feeHeaderY =
      paymentTableBottom + 4;

    drawSectionHeader(
      doc,
      {
        x: margin,
        y: feeHeaderY,
        width: contentWidth,
        title: "Fee Details",
        background:
          COLORS.lightGreen,
        icon: "document",
        iconColor:
          COLORS.green,
      }
    );

    const feeTop =
      feeHeaderY + 14;

    const feeRowHeight = 7;

    const feeLabelWidth = 125;

    const feeRows = [
      [
        "Total Fee",
        formatMoney(totalFee),
      ],
      [
        "Previously Paid",
        formatMoney(previousPaid),
      ],
      [
        "This Payment",
        formatMoney(
          currentPayment
        ),
      ],
      [
        "Total Paid",
        formatMoney(totalPaid),
      ],
      [
        "Remaining Fee",
        formatMoney(
          remainingFee
        ),
      ],
    ];

    feeRows.forEach(
      ([label, value], index) => {
        const rowY =
          feeTop +
          index *
            feeRowHeight;

        if (index === 3) {
          doc.setFillColor(
            ...COLORS.lightBlue
          );

          doc.rect(
            margin,
            rowY,
            contentWidth,
            feeRowHeight,
            "F"
          );
        }

        doc.setDrawColor(
          ...COLORS.border
        );

        doc.rect(
          margin,
          rowY,
          contentWidth,
          feeRowHeight
        );

        doc.line(
          margin +
            feeLabelWidth,
          rowY,
          margin +
            feeLabelWidth,
          rowY +
            feeRowHeight
        );

        doc.setTextColor(
          ...COLORS.dark
        );

        doc.setFont(
          "helvetica",
          index >= 3
            ? "bold"
            : "normal"
        );

        doc.setFontSize(8.5);

        doc.text(
          label,
          margin + 13,
          rowY + 5
        );

        doc.text(
          value,
          margin +
            contentWidth -
            6,
          rowY + 5,
          {
            align: "right",
          }
        );
      }
    );

    /* ======================================================================
       LOWER SECTION
       ====================================================================== */

    /*
     * Calculate dynamically.
     *
     * For 5 payments this normally starts around 238mm.
     *
     * Footer starts at 277mm.
     *
     * Lower boxes are only 36mm high,
     * therefore nothing can be hidden behind footer.
     */

    const lowerY =
      feeTop +
      feeRows.length *
        feeRowHeight +
      5;

    const lowerGap = 5;

    const lowerWidth =
      (contentWidth -
        lowerGap) /
      2;

    const lowerHeight = 36;

    /* ======================================================================
       QR VERIFICATION BOX
       ====================================================================== */

    const qrBoxX = margin;

    doc.setFillColor(
      ...COLORS.lightViolet
    );

    doc.roundedRect(
      qrBoxX,
      lowerY,
      lowerWidth,
      lowerHeight,
      3,
      3,
      "F"
    );

    doc.setDrawColor(
      220,
      200,
      245
    );

    doc.roundedRect(
      qrBoxX,
      lowerY,
      lowerWidth,
      lowerHeight,
      3,
      3
    );

    drawSectionHeader(
      doc,
      {
        x: qrBoxX,
        y: lowerY,
        width: lowerWidth,
        title:
          "Receipt Verification",
        background:
          COLORS.lightViolet,
        icon: "qr",
        iconColor:
          COLORS.violet,
      }
    );

    /*
     * QR
     *
     * IMPORTANT:
     * QR size is now 22mm.
     * It fits completely before footer.
     */

    const qrX =
      qrBoxX + 7;

    const qrY =
      lowerY + 14;

    const qrSize = 22;

    doc.addImage(
      qrDataUrl,
      "PNG",
      qrX,
      qrY,
      qrSize,
      qrSize,
      undefined,
      "FAST"
    );

    /*
     * Clickable QR
     */
    doc.link(
      qrX,
      qrY,
      qrSize,
      qrSize,
      {
        url:
          verificationUrl,
      }
    );

    /*
     * Divider
     */
    doc.setDrawColor(
      ...COLORS.dark
    );

    doc.setLineWidth(0.3);

    doc.line(
      qrBoxX + 37,
      lowerY + 14,
      qrBoxX + 37,
      lowerY + 31
    );

    /*
     * Text
     */
    doc.setTextColor(
      ...COLORS.dark
    );

    doc.setFont(
      "helvetica",
      "normal"
    );

    doc.setFontSize(7.5);

    doc.text(
      "Scan this QR code",
      qrBoxX + 43,
      lowerY + 23
    );

    doc.text(
      "to verify this receipt.",
      qrBoxX + 43,
      lowerY + 29
    );

    /* ======================================================================
       IMPORTANT NOTE BOX
       ====================================================================== */

    const noteBoxX =
      margin +
      lowerWidth +
      lowerGap;

    doc.setFillColor(
      ...COLORS.lightYellow
    );

    doc.roundedRect(
      noteBoxX,
      lowerY,
      lowerWidth,
      lowerHeight,
      3,
      3,
      "F"
    );

    doc.setDrawColor(
      245,
      215,
      150
    );

    doc.roundedRect(
      noteBoxX,
      lowerY,
      lowerWidth,
      lowerHeight,
      3,
      3
    );

    drawSectionHeader(
      doc,
      {
        x: noteBoxX,
        y: lowerY,
        width: lowerWidth,
        title:
          "Important Note",
        background:
          COLORS.lightYellow,
        icon: "note",
        iconColor:
          COLORS.yellow,
      }
    );

    /*
     * Note 1
     */
    drawCheckIcon(
      doc,
      noteBoxX + 9,
      lowerY + 20
    );

    doc.setTextColor(
      ...COLORS.dark
    );

    doc.setFont(
      "helvetica",
      "normal"
    );

    doc.setFontSize(7.2);

    doc.text(
      "This is a computer generated",
      noteBoxX + 16,
      lowerY + 19
    );

    doc.text(
      "payment receipt.",
      noteBoxX + 16,
      lowerY + 24.5
    );

    /*
     * Note 2
     */
    drawCheckIcon(
      doc,
      noteBoxX + 9,
      lowerY + 30
    );

    doc.text(
      "Receipt verification is available",
      noteBoxX + 16,
      lowerY + 29
    );

    doc.text(
      "through the QR code.",
      noteBoxX + 16,
      lowerY + 34
    );

    /* ======================================================================
       SIGNATURE
       ====================================================================== */

    /*
     * Put signature BELOW the boxes,
     * but BEFORE footer.
     */

    const footerHeight = 18;

    const footerY =
      pageHeight -
      footerHeight -
      1.5;

    const signatureCenterX =
      noteBoxX +
      lowerWidth / 2;

    /*
     * Signature must stay above footer.
     */
    const signatureY =
      Math.min(
        lowerY +
          lowerHeight +
          8,
        footerY - 8
      );

    /*
     * Signature drawing
     */
    doc.setDrawColor(
      30,
      40,
      150
    );

    doc.setLineWidth(0.6);

    doc.line(
      signatureCenterX - 18,
      signatureY - 5,
      signatureCenterX - 13,
      signatureY - 11
    );

    doc.line(
      signatureCenterX - 13,
      signatureY - 11,
      signatureCenterX - 8,
      signatureY - 3
    );

    doc.line(
      signatureCenterX - 8,
      signatureY - 3,
      signatureCenterX - 2,
      signatureY - 12
    );

    doc.line(
      signatureCenterX - 2,
      signatureY - 12,
      signatureCenterX + 5,
      signatureY - 4
    );

    doc.line(
      signatureCenterX + 5,
      signatureY - 4,
      signatureCenterX + 12,
      signatureY - 10
    );

    doc.line(
      signatureCenterX + 12,
      signatureY - 10,
      signatureCenterX + 18,
      signatureY - 5
    );

    /*
     * Signature line
     */
    doc.setDrawColor(
      ...COLORS.dark
    );

    doc.setLineWidth(0.25);

    doc.line(
      signatureCenterX - 20,
      signatureY,
      signatureCenterX + 20,
      signatureY
    );

    doc.setTextColor(
      ...COLORS.dark
    );

    doc.setFont(
      "helvetica",
      "bold"
    );

    doc.setFontSize(6.2);

    doc.text(
      "Authorised Signatory",
      signatureCenterX,
      signatureY + 3.5,
      {
        align: "center",
      }
    );

    doc.setFont(
      "helvetica",
      "normal"
    );

    doc.setFontSize(5.8);

    doc.text(
      INSTITUTE_NAME,
      signatureCenterX,
      signatureY + 7,
      {
        align: "center",
      }
    );

    /* ======================================================================
       FOOTER
       ====================================================================== */

    doc.setFillColor(
      ...COLORS.purple
    );

    doc.rect(
      1.5,
      footerY,
      pageWidth - 3,
      footerHeight,
      "F"
    );

    doc.setTextColor(
      ...COLORS.white
    );

    doc.setFont(
      "helvetica",
      "bolditalic"
    );

    doc.setFontSize(9);

    doc.text(
      "Thank you for your payment!",
      pageWidth / 2,
      footerY + 6.5,
      {
        align: "center",
      }
    );

    doc.setDrawColor(
      ...COLORS.white
    );

    doc.setLineWidth(0.25);

    doc.line(
      7,
      footerY + 9.5,
      pageWidth - 7,
      footerY + 9.5
    );

    doc.setFont(
      "helvetica",
      "italic"
    );

    doc.setFontSize(6.5);

    doc.text(
      "All payments are accepted under the terms of non-refund and non-transfer.",
      pageWidth / 2,
      footerY + 15,
      {
        align: "center",
      }
    );

    /* ======================================================================
       DOWNLOAD
       ====================================================================== */

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