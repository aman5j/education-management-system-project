import jsPDF from "jspdf";
import QRCode from "qrcode";

/* =========================================================
   IT LEARNING INSTITUTE - PAYMENT RECEIPT
   ========================================================= */

const INSTITUTE_NAME = "IT LEARNING INSTITUTE";
const INSTITUTE_SUBTITLE =
  "An ISO 9001:2015 Certified Organization";

const INSTITUTE_ADDRESS =
  "ADDRESS : 2ND FLOOR, NATRAJ GYM, CHAR SHAHAR KA NAKA, HAZIRA,\n" +
  "GWALIOR, MADHYA PRADESH 474003";

const WEBSITE = "www.itlearning.in";
const PHONE = "+91 9770622162";

/* =========================================================
   COLORS
   ========================================================= */

const COLORS = {
  purple: [43, 30, 145],
  darkPurple: [31, 24, 105],

  dark: [15, 22, 45],
  gray: [90, 90, 100],
  border: [195, 205, 220],
  white: [255, 255, 255],

  blueHeader: [232, 246, 255],
  blue: [25, 140, 235],

  greenHeader: [232, 249, 240],
  green: [0, 185, 100],
  lightGreen: [225, 248, 237],

  violetHeader: [246, 239, 255],
  violet: [100, 30, 215],

  yellowHeader: [255, 248, 225],
  yellow: [240, 165, 0],

  orange: [255, 91, 18],
};

/* =========================================================
   BASIC HELPERS
   ========================================================= */

const formatMoney = (value) => {
  return `Rs. ${Number(value || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
};

const formatDate = (value) => {
  if (!value) return "-";

  const d = new Date(value);

  if (Number.isNaN(d.getTime())) {
    return "-";
  }

  return d.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
};

const getStudentName = (student = {}) => {
  return (
    [student.firstName, student.surname]
      .filter(Boolean)
      .join(" ") || "-"
  );
};

const getFrontendBaseUrl = () => {
  const configured =
    import.meta.env.VITE_FRONTEND_URL;

  return (
    configured || window.location.origin
  ).replace(/\/+$/, "");
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

/* =========================================================
   VECTOR ICONS
   These do NOT depend on external icon fonts.
   ========================================================= */

const drawPersonIcon = (
  doc,
  cx,
  cy,
  color,
  scale = 1
) => {
  doc.setFillColor(...color);

  // Head
  doc.circle(
    cx,
    cy - 2.2 * scale,
    1.8 * scale,
    "F"
  );

  // Body
  doc.roundedRect(
    cx - 3.8 * scale,
    cy + 0.2 * scale,
    7.6 * scale,
    4.6 * scale,
    2 * scale,
    2 * scale,
    "F"
  );
};

const drawDocumentIcon = (
  doc,
  cx,
  cy,
  color,
  scale = 1
) => {
  doc.setDrawColor(...color);
  doc.setLineWidth(0.7 * scale);

  doc.roundedRect(
    cx - 3.2 * scale,
    cy - 4.2 * scale,
    6.4 * scale,
    8.4 * scale,
    0.8 * scale,
    0.8 * scale,
    "S"
  );

  doc.line(
    cx - 1.8 * scale,
    cy - 1.5 * scale,
    cx + 1.8 * scale,
    cy - 1.5 * scale
  );

  doc.line(
    cx - 1.8 * scale,
    cy + 0.2 * scale,
    cx + 1.8 * scale,
    cy + 0.2 * scale
  );

  doc.line(
    cx - 1.8 * scale,
    cy + 1.9 * scale,
    cx + 1.1 * scale,
    cy + 1.9 * scale
  );
};

const drawQrIcon = (
  doc,
  cx,
  cy,
  color,
  scale = 1
) => {
  doc.setDrawColor(...color);
  doc.setFillColor(...color);
  doc.setLineWidth(0.6 * scale);

  const size = 2.5 * scale;

  const finder = (x, y) => {
    doc.rect(
      x,
      y,
      size * 2.2,
      size * 2.2,
      "S"
    );

    doc.rect(
      x + size * 0.65,
      y + size * 0.65,
      size * 0.9,
      size * 0.9,
      "F"
    );
  };

  finder(
    cx - size * 2.7,
    cy - size * 2.7
  );

  finder(
    cx + size * 0.5,
    cy - size * 2.7
  );

  finder(
    cx - size * 2.7,
    cy + size * 0.5
  );

  doc.rect(
    cx + size * 0.7,
    cy + size * 0.7,
    size,
    size,
    "F"
  );

  doc.rect(
    cx + size * 2,
    cy + size * 2,
    size,
    size,
    "F"
  );
};

const drawGlobeIcon = (
  doc,
  cx,
  cy,
  color,
  scale = 1
) => {
  doc.setDrawColor(...color);
  doc.setLineWidth(0.55 * scale);

  doc.circle(
    cx,
    cy,
    3.3 * scale,
    "S"
  );

  doc.ellipse(
    cx,
    cy,
    1.35 * scale,
    3.3 * scale,
    "S"
  );

  doc.line(
    cx - 3.3 * scale,
    cy,
    cx + 3.3 * scale,
    cy
  );
};

const drawPhoneIcon = (
  doc,
  cx,
  cy,
  color,
  scale = 1
) => {
  doc.setDrawColor(...color);
  doc.setLineWidth(0.7 * scale);

  doc.roundedRect(
    cx - 2.2 * scale,
    cy - 3.4 * scale,
    4.4 * scale,
    6.8 * scale,
    1 * scale,
    1 * scale,
    "S"
  );

  doc.setFillColor(...color);

  doc.circle(
    cx,
    cy + 2.35 * scale,
    0.35 * scale,
    "F"
  );
};

const drawCheckIcon = (
  doc,
  cx,
  cy
) => {
  doc.setFillColor(
    ...COLORS.green
  );

  doc.circle(
    cx,
    cy,
    2.6,
    "F"
  );

  doc.setDrawColor(
    ...COLORS.white
  );

  doc.setLineWidth(0.7);

  doc.line(
    cx - 1.1,
    cy,
    cx - 0.3,
    cy + 1
  );

  doc.line(
    cx - 0.3,
    cy + 1,
    cx + 1.5,
    cy - 1.1
  );
};

/* =========================================================
   SECTION HEADER
   ========================================================= */

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

  // White icon circle
  doc.setFillColor(
    ...COLORS.white
  );

  doc.circle(
    x + 10,
    y + 7,
    5.1,
    "F"
  );

  if (icon === "person") {
    drawPersonIcon(
      doc,
      x + 10,
      y + 7,
      iconColor,
      0.75
    );
  }

  if (icon === "document") {
    drawDocumentIcon(
      doc,
      x + 10,
      y + 7,
      iconColor,
      0.8
    );
  }

  if (icon === "qr") {
    drawQrIcon(
      doc,
      x + 10,
      y + 7,
      iconColor,
      0.8
    );
  }

  if (icon === "note") {
    drawDocumentIcon(
      doc,
      x + 10,
      y + 7,
      iconColor,
      0.8
    );
  }

  doc.setTextColor(
    ...COLORS.dark
  );

  doc.setFont(
    "helvetica",
    "bold"
  );

  doc.setFontSize(13.5);

  doc.text(
    title,
    x + 20,
    y + 9.2
  );
};

/* =========================================================
   KEY VALUE
   ========================================================= */

const drawKeyValue = (
  doc,
  {
    label,
    value,
    x,
    y,
    labelWidth = 34,
    valueWidth = 55,
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

/* =========================================================
   STATUS
   ========================================================= */

const drawStatusBadge = (
  doc,
  x,
  y,
  text = "Verified",
  width = 26
) => {
  doc.setFillColor(
    ...COLORS.green
  );

  doc.roundedRect(
    x,
    y - 4.5,
    width,
    7.5,
    3.7,
    3.7,
    "F"
  );

  doc.setTextColor(
    ...COLORS.white
  );

  doc.setFont(
    "helvetica",
    "bold"
  );

  doc.setFontSize(6.7);

  doc.text(
    text,
    x + width / 2,
    y + 0.2,
    {
      align: "center",
    }
  );
};

/* =========================================================
   PAYMENT HISTORY TABLE
   ========================================================= */

const drawPaymentHistory = (
  doc,
  {
    x,
    y,
    width,
    payments,
  }
) => {
  const headerHeight = 9;
  const rowHeight = 8.5;

  const colWidths = [
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

  // Header
  doc.setFillColor(
    ...COLORS.blueHeader
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
      const cw =
        colWidths[index];

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

      doc.setFontSize(7.5);

      doc.text(
        header,
        currentX + cw / 2,
        y + 5.8,
        {
          align: "center",
        }
      );

      currentX += cw;
    }
  );

  let rowY =
    y + headerHeight;

  payments.forEach(
    (payment) => {
      currentX = x;

      doc.setFillColor(
        ...COLORS.white
      );

      doc.rect(
        x,
        rowY,
        width,
        rowHeight,
        "F"
      );

      doc.setDrawColor(
        ...COLORS.border
      );

      doc.rect(
        x,
        rowY,
        width,
        rowHeight
      );

      const values = [
        formatDate(
          payment.payment_date
        ),
        payment.payment_mode || "-",
        formatMoney(payment.amount),
        "Paid",
      ];

      values.forEach(
        (value, index) => {
          const cw =
            colWidths[index];

          if (index > 0) {
            doc.line(
              currentX,
              rowY,
              currentX,
              rowY + rowHeight
            );
          }

          if (index === 3) {
            doc.setFillColor(
              ...COLORS.lightGreen
            );

            doc.roundedRect(
              currentX +
                cw / 2 -
                10,
              rowY + 1.8,
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

            doc.setFontSize(6.5);

            doc.text(
              value,
              currentX +
                cw / 2,
              rowY + 5.2,
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

            doc.setFontSize(7.3);

            doc.text(
              value,
              currentX +
                cw / 2,
              rowY + 5.5,
              {
                align: "center",
              }
            );
          }

          currentX += cw;
        }
      );

      rowY += rowHeight;
    }
  );

  return rowY;
};

/* =========================================================
   MAIN RECEIPT
   ========================================================= */

const generatePaymentReceipt = async (
  payment,
  paymentHistory = []
) => {
  try {
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

    /* -----------------------------------------------------
       Receipt number
       ----------------------------------------------------- */

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

    /* -----------------------------------------------------
       QR verification URL
       ----------------------------------------------------- */

    const verificationUrl =
      `${getFrontendBaseUrl()}/verify-receipt/${encodeURIComponent(
        receiptNo
      )}`;

    const qrDataUrl =
      await QRCode.toDataURL(
        verificationUrl,
        {
          width: 400,
          margin: 2,
          errorCorrectionLevel: "H",
        }
      );

    /* -----------------------------------------------------
       Data
       ----------------------------------------------------- */

    const student =
      payment.student_id || {};

    const admission =
      payment.admission_id || {};

    const studentFullName =
      getStudentName(student);

    const course =
      getCourseName(admission);

    const batch =
      getBatchName(admission);

    const totalFee =
      Number(
        admission?.final_amount ??
          admission?.totalFee ??
          0
      );

    const currentPayment =
      Number(payment.amount || 0);

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

    /*
     * Add current payment if it is not
     * already in the history.
     */
    const currentExists =
      verifiedPayments.some(
        (item) =>
          (item?.receipt_no ||
            item?.receiptNo) ===
          receiptNo
      );

    if (!currentExists) {
      verifiedPayments.push(
        payment
      );
    }

    /*
     * Oldest -> newest
     */
    verifiedPayments.sort(
      (a, b) =>
        new Date(
          a.payment_date || 0
        ).getTime() -
        new Date(
          b.payment_date || 0
        ).getTime()
    );

    /*
     * Keep maximum five rows so the
     * complete receipt remains one A4 page.
     */
    const displayedPayments =
      verifiedPayments.slice(-5);

    const paymentHistoryTotal =
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
      admissionPaid,
      paymentHistoryTotal
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

    /* -----------------------------------------------------
       PDF
       ----------------------------------------------------- */

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

    /* -----------------------------------------------------
       Outer border
       ----------------------------------------------------- */

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

    /* -----------------------------------------------------
       Top purple strip
       ----------------------------------------------------- */

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

    /* -----------------------------------------------------
       HEADER
       ----------------------------------------------------- */

    const headerTop = 8.5;

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

    doc.setFontSize(11);

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
      INSTITUTE_SUBTITLE,
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
     * Payment receipt title
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

    doc.setFontSize(7.5);

    doc.text(
      receiptNo,
      163,
      39
    );

    doc.setFont(
      "helvetica",
      "normal"
    );

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

    drawStatusBadge(
      doc,
      163,
      53,
      "Verified",
      26
    );

    /* -----------------------------------------------------
       CONTACT BAR
       ----------------------------------------------------- */

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
      50,
      64.5,
      COLORS.white,
      0.9
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
      COLORS.white,
      0.9
    );

    doc.text(
      PHONE,
      145,
      66,
      {
        align: "center",
      }
    );

    /* -----------------------------------------------------
       STUDENT DETAILS
       ----------------------------------------------------- */

    const studentHeaderY =
      74;

    drawSectionHeader(
      doc,
      {
        x: margin,
        y: studentHeaderY,
        width: contentWidth,
        title: "Student Details",
        background:
          COLORS.blueHeader,
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
     * Vertical divider
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
        value:
          studentFullName,
        x: 13,
        y:
          studentBoxY + 9,
        labelWidth: 34,
        valueWidth: 58,
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
        valueWidth: 58,
      }
    );

    drawKeyValue(
      doc,
      {
        label: "Course",
        value: course,
        x: 13,
        y:
          studentBoxY + 27,
        labelWidth: 34,
        valueWidth: 58,
      }
    );

    drawKeyValue(
      doc,
      {
        label: "Batch",
        value: batch,
        x: 118,
        y:
          studentBoxY + 9,
        labelWidth: 31,
        valueWidth: 47,
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
        valueWidth: 47,
      }
    );

    /* -----------------------------------------------------
       PAYMENT HISTORY
       ----------------------------------------------------- */

    const paymentHeaderY =
      119;

    drawSectionHeader(
      doc,
      {
        x: margin,
        y: paymentHeaderY,
        width: contentWidth,
        title: "Payment History",
        background:
          COLORS.greenHeader,
        icon: "document",
        iconColor:
          COLORS.green,
      }
    );

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

    /* -----------------------------------------------------
       FEE DETAILS
       ----------------------------------------------------- */

    const feeHeaderY =
      181;

    drawSectionHeader(
      doc,
      {
        x: margin,
        y: feeHeaderY,
        width: contentWidth,
        title: "Fee Details",
        background:
          COLORS.greenHeader,
        icon: "document",
        iconColor:
          COLORS.green,
      }
    );

    const feeTop =
      feeHeaderY + 14;

    const feeRowHeight =
      7.6;

    const labelColumnWidth =
      125;

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
        formatMoney(currentPayment),
      ],
      [
        "Total Paid",
        formatMoney(totalPaid),
      ],
      [
        "Remaining Fee",
        formatMoney(remainingFee),
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
            ...COLORS.blueHeader
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
            labelColumnWidth,
          rowY,
          margin +
            labelColumnWidth,
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

        doc.setFontSize(8.8);

        doc.text(
          label,
          margin + 13,
          rowY + 5.2
        );

        doc.text(
          value,
          margin +
            contentWidth -
            6,
          rowY + 5.2,
          {
            align: "right",
          }
        );
      }
    );

    /* -----------------------------------------------------
       LOWER AREA
       ----------------------------------------------------- */

    const lowerY =
      236;

    const gap = 5;

    const lowerWidth =
      (contentWidth - gap) /
      2;

    const lowerHeight =
      37;

    /* -----------------------------------------------------
       QR VERIFICATION BOX
       ----------------------------------------------------- */

    doc.setFillColor(
      ...COLORS.violetHeader
    );

    doc.roundedRect(
      margin,
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
      margin,
      lowerY,
      lowerWidth,
      lowerHeight,
      3,
      3
    );

    drawSectionHeader(
      doc,
      {
        x: margin,
        y: lowerY,
        width: lowerWidth,
        title: "Receipt Verification",
        background:
          COLORS.violetHeader,
        icon: "qr",
        iconColor:
          COLORS.violet,
      }
    );

    /*
     * QR
     */
    doc.addImage(
      qrDataUrl,
      "PNG",
      margin + 7,
      lowerY + 15,
      29,
      29
    );

    /*
     * Divider
     */
    doc.setDrawColor(
      ...COLORS.dark
    );

    doc.setLineWidth(0.3);

    doc.line(
      margin + 43,
      lowerY + 15,
      margin + 43,
      lowerY + 32
    );

    doc.setTextColor(
      ...COLORS.dark
    );

    doc.setFont(
      "helvetica",
      "normal"
    );

    doc.setFontSize(8.8);

    doc.text(
      "Scan this QR code",
      margin + 50,
      lowerY + 24
    );

    doc.text(
      "to verify this receipt.",
      margin + 50,
      lowerY + 31
    );

    /* -----------------------------------------------------
       IMPORTANT NOTE BOX
       ----------------------------------------------------- */

    const noteX =
      margin +
      lowerWidth +
      gap;

    doc.setFillColor(
      ...COLORS.yellowHeader
    );

    doc.roundedRect(
      noteX,
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
      noteX,
      lowerY,
      lowerWidth,
      lowerHeight,
      3,
      3
    );

    drawSectionHeader(
      doc,
      {
        x: noteX,
        y: lowerY,
        width: lowerWidth,
        title: "Important Note",
        background:
          COLORS.yellowHeader,
        icon: "note",
        iconColor:
          COLORS.yellow,
      }
    );

    drawCheckIcon(
      doc,
      noteX + 9,
      lowerY + 20
    );

    doc.setTextColor(
      ...COLORS.dark
    );

    doc.setFont(
      "helvetica",
      "normal"
    );

    doc.setFontSize(7.8);

    doc.text(
      "This is a computer generated",
      noteX + 16,
      lowerY + 19.5
    );

    doc.text(
      "payment receipt.",
      noteX + 16,
      lowerY + 25
    );

    drawCheckIcon(
      doc,
      noteX + 9,
      lowerY + 31
    );

    doc.text(
      "Receipt verification is available",
      noteX + 16,
      lowerY + 30.5
    );

    doc.text(
      "through the QR code.",
      noteX + 16,
      lowerY + 36
    );

    /* -----------------------------------------------------
       AUTHORISED SIGNATORY
       BELOW THE NOTE BOX
       ----------------------------------------------------- */

    const signatureCenterX =
      noteX +
      lowerWidth / 2;

    const signatureY =
      lowerY +
      lowerHeight +
      8;

    /*
     * Signature-style vector
     */
    doc.setDrawColor(
      35,
      45,
      145
    );

    doc.setLineWidth(0.65);

    doc.line(
      signatureCenterX - 19,
      signatureY - 3,
      signatureCenterX - 13,
      signatureY - 9
    );

    doc.line(
      signatureCenterX - 13,
      signatureY - 9,
      signatureCenterX - 8,
      signatureY - 1
    );

    doc.line(
      signatureCenterX - 8,
      signatureY - 1,
      signatureCenterX - 1,
      signatureY - 10
    );

    doc.line(
      signatureCenterX - 1,
      signatureY - 10,
      signatureCenterX + 5,
      signatureY - 2
    );

    doc.line(
      signatureCenterX + 5,
      signatureY - 2,
      signatureCenterX + 13,
      signatureY - 8
    );

    doc.line(
      signatureCenterX + 13,
      signatureY - 8,
      signatureCenterX + 18,
      signatureY - 3
    );

    doc.setDrawColor(
      ...COLORS.dark
    );

    doc.setLineWidth(0.25);

    doc.line(
      signatureCenterX - 22,
      signatureY,
      signatureCenterX + 22,
      signatureY
    );

    doc.setTextColor(
      ...COLORS.dark
    );

    doc.setFont(
      "helvetica",
      "bold"
    );

    doc.setFontSize(6.5);

    doc.text(
      "Authorised Signatory",
      signatureCenterX,
      signatureY + 4,
      {
        align: "center",
      }
    );

    doc.setFont(
      "helvetica",
      "normal"
    );

    doc.setFontSize(6.2);

    doc.text(
      INSTITUTE_NAME,
      signatureCenterX,
      signatureY + 8,
      {
        align: "center",
      }
    );

    /* -----------------------------------------------------
       FOOTER
       ----------------------------------------------------- */

    const footerY =
      277;

    const footerHeight =
      18.5;

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

    doc.setFontSize(9.5);

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

    doc.setFontSize(6.8);

    doc.text(
      "All payments are accepted under the terms of non-refund and non-transfer.",
      pageWidth / 2,
      footerY + 15,
      {
        align: "center",
      }
    );

    /* -----------------------------------------------------
       DOWNLOAD
       ----------------------------------------------------- */

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