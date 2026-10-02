import jsPDF from "jspdf";
import QRCode from "qrcode";

/*
|--------------------------------------------------------------------------
| IT LEARNING INSTITUTE - PAYMENT RECEIPT
|--------------------------------------------------------------------------
*/

const INSTITUTE_NAME = "IT LEARNING INSTITUTE";
const INSTITUTE_SUBTITLE = "An ISO 9001:2015 Certified Organization";

const INSTITUTE_ADDRESS =
  "ADDRESS : 2ND FLOOR, NATRAJ GYM, CHAR SHAHAR KA NAKA, HAZIRA,\n" +
  "GWALIOR, MADHYA PRADESH 474003";

const WEBSITE = "www.itlearning.in";
const PHONE = "+91 9770622162";

/*
|--------------------------------------------------------------------------
| Colors
|--------------------------------------------------------------------------
*/

const COLORS = {
  purple: [42, 30, 145],
  darkPurple: [31, 25, 95],

  blue: [34, 143, 230],
  lightBlue: [232, 246, 255],

  green: [0, 190, 100],
  lightGreen: [232, 249, 240],

  orange: [255, 170, 0],
  lightOrange: [255, 248, 225],

  violet: [100, 35, 220],
  lightViolet: [245, 238, 255],

  dark: [20, 25, 45],
  gray: [90, 90, 90],
  lightGray: [235, 235, 235],
  white: [255, 255, 255],
  border: [190, 205, 220],
};

/*
|--------------------------------------------------------------------------
| Helpers
|--------------------------------------------------------------------------
*/

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

const formatCurrency = (value, symbol = "Rs.") => {
  const amount = Number(value || 0);

  return `${symbol} ${amount.toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
};

const getStudentName = (student = {}) => {
  return [student?.firstName, student?.surname]
    .filter(Boolean)
    .join(" ");
};

const getFrontendBaseUrl = () => {
  const configuredUrl = import.meta.env.VITE_FRONTEND_URL;

  if (configuredUrl) {
    return configuredUrl.replace(/\/+$/, "");
  }

  return window.location.origin;
};

const getCourseTitle = (admission = {}) => {
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

const getTotalFee = (admission = {}) => {
  return Number(
    admission?.final_amount ??
      admission?.totalFee ??
      0
  );
};

/*
|--------------------------------------------------------------------------
| Draw Section Header
|--------------------------------------------------------------------------
*/

const drawSectionHeader = (
  doc,
  {
    x,
    y,
    width,
    title,
    fillColor,
    iconText = "",
  }
) => {
  doc.setFillColor(...fillColor);

  doc.roundedRect(
    x,
    y,
    width,
    13,
    3,
    3,
    "F"
  );

  /*
   * Icon circle
   */
  doc.setFillColor(...COLORS.white);

  doc.circle(
    x + 8,
    y + 6.5,
    4.3,
    "F"
  );

  doc.setTextColor(...fillColor);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);

  doc.text(
    iconText,
    x + 8,
    y + 9,
    {
      align: "center",
    }
  );

  /*
   * Title
   */
  doc.setTextColor(...COLORS.dark);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);

  doc.text(
    title,
    x + 18,
    y + 8.5
  );
};

/*
|--------------------------------------------------------------------------
| Draw Key / Value Row
|--------------------------------------------------------------------------
*/

const drawKeyValue = (
  doc,
  {
    label,
    value,
    x,
    y,
    labelWidth = 38,
    valueWidth = 70,
    fontSize = 9.5,
    boldValue = true,
  }
) => {
  doc.setTextColor(...COLORS.dark);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(fontSize);

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
    boldValue ? "bold" : "normal"
  );

  const safeValue =
    value === undefined ||
    value === null ||
    value === ""
      ? "-"
      : String(value);

  const lines = doc.splitTextToSize(
    safeValue,
    valueWidth
  );

  doc.text(
    lines,
    x + labelWidth + 4,
    y
  );

  return lines.length;
};

/*
|--------------------------------------------------------------------------
| Draw Status Badge
|--------------------------------------------------------------------------
*/

const drawStatusBadge = (
  doc,
  text,
  x,
  y,
  width = 24
) => {
  doc.setFillColor(...COLORS.green);

  doc.roundedRect(
    x,
    y - 5,
    width,
    8,
    4,
    4,
    "F"
  );

  doc.setTextColor(...COLORS.white);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);

  doc.text(
    text,
    x + width / 2,
    y,
    {
      align: "center",
    }
  );
};

/*
|--------------------------------------------------------------------------
| Draw Table
|--------------------------------------------------------------------------
*/

const drawPaymentHistoryTable = (
  doc,
  {
    x,
    y,
    width,
    payments,
  }
) => {
  const columns = [
    {
      title: "Payment Date",
      width: width * 0.25,
    },
    {
      title: "Payment Mode",
      width: width * 0.25,
    },
    {
      title: "Paid Amount",
      width: width * 0.25,
    },
    {
      title: "Status",
      width: width * 0.25,
    },
  ];

  const headerHeight = 11;
  const rowHeight = 10;

  /*
   * Header
   */
  doc.setFillColor(...COLORS.lightBlue);

  doc.rect(
    x,
    y,
    width,
    headerHeight,
    "F"
  );

  doc.setDrawColor(...COLORS.border);
  doc.setLineWidth(0.3);

  doc.rect(
    x,
    y,
    width,
    headerHeight
  );

  let currentX = x;

  columns.forEach((column) => {
    doc.line(
      currentX,
      y,
      currentX,
      y + headerHeight
    );

    doc.setTextColor(...COLORS.dark);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);

    doc.text(
      column.title,
      currentX + column.width / 2,
      y + 7,
      {
        align: "center",
      }
    );

    currentX += column.width;
  });

  doc.line(
    x + width,
    y,
    x + width,
    y + headerHeight
  );

  /*
   * Rows
   */

  let rowY = y + headerHeight;

  payments.forEach((payment) => {
    doc.setFillColor(...COLORS.white);

    doc.rect(
      x,
      rowY,
      width,
      rowHeight,
      "F"
    );

    doc.setDrawColor(...COLORS.border);

    doc.rect(
      x,
      rowY,
      width,
      rowHeight
    );

    let cellX = x;

    const values = [
      formatDate(payment.payment_date),
      payment.payment_mode || "-",
      formatCurrency(payment.amount),
      "Paid",
    ];

    columns.forEach(
      (column, index) => {
        doc.line(
          cellX,
          rowY,
          cellX,
          rowY + rowHeight
        );

        doc.setTextColor(...COLORS.dark);
        doc.setFont(
          "helvetica",
          index === 3
            ? "bold"
            : "normal"
        );

        doc.setFontSize(8.5);

        if (index === 3) {
          doc.setFillColor(
            ...COLORS.lightGreen
          );

          doc.roundedRect(
            cellX +
              column.width / 2 -
              10,
            rowY + 2,
            20,
            6,
            3,
            3,
            "F"
          );

          doc.setTextColor(
            0,
            120,
            70
          );

          doc.text(
            values[index],
            cellX +
              column.width / 2,
            rowY + 6.2,
            {
              align: "center",
            }
          );
        } else {
          doc.text(
            values[index],
            cellX +
              column.width / 2,
            rowY + 6.5,
            {
              align: "center",
            }
          );
        }

        cellX += column.width;
      }
    );

    doc.line(
      x + width,
      rowY,
      x + width,
      rowY + rowHeight
    );

    rowY += rowHeight;
  });

  /*
   * If there are no payments
   */
  if (payments.length === 0) {
    doc.setFillColor(...COLORS.white);

    doc.rect(
      x,
      rowY,
      width,
      rowHeight,
      "F"
    );

    doc.setDrawColor(...COLORS.border);

    doc.rect(
      x,
      rowY,
      width,
      rowHeight
    );

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(...COLORS.gray);

    doc.text(
      "No payment history available.",
      x + width / 2,
      rowY + 6.5,
      {
        align: "center",
      }
    );

    rowY += rowHeight;
  }

  return rowY;
};

/*
|--------------------------------------------------------------------------
| Main Receipt Generator
|--------------------------------------------------------------------------
|
| Usage:
|
| generatePaymentReceipt(
|   latestPayment,
|   verifiedPayments
| );
|
|--------------------------------------------------------------------------
*/

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

    if (payment.status !== "Verified") {
      throw new Error(
        "Receipt can only be generated for a verified payment."
      );
    }

    /*
    |--------------------------------------------------------------------------
    | Receipt Number
    |--------------------------------------------------------------------------
    */

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

    /*
    |--------------------------------------------------------------------------
    | QR Verification URL
    |--------------------------------------------------------------------------
    */

    const frontendBaseUrl =
      getFrontendBaseUrl();

    const verificationUrl =
      `${frontendBaseUrl}/verify-receipt/${encodeURIComponent(
        receiptNo
      )}`;

    const qrDataUrl =
      await QRCode.toDataURL(
        verificationUrl,
        {
          width: 300,
          margin: 2,
          errorCorrectionLevel: "H",
        }
      );

    /*
    |--------------------------------------------------------------------------
    | Data
    |--------------------------------------------------------------------------
    */

    const student =
      payment.student_id || {};

    const admission =
      payment.admission_id || {};

    const studentName =
      getStudentName(student);

    const rollNo =
      student?.rollNo || "-";

    const courseTitle =
      getCourseTitle(admission);

    const batchName =
      getBatchName(admission);

    const totalFee =
      getTotalFee(admission);

    /*
     * Use all verified payments.
     */
    let verifiedPayments =
      Array.isArray(paymentHistory)
        ? paymentHistory.filter(
            (item) =>
              item?.status === "Verified"
          )
        : [];

    /*
     * Make sure current payment is
     * included.
     */
    const alreadyExists =
      verifiedPayments.some(
        (item) =>
          (item?.receipt_no ||
            item?.receiptNo) ===
          receiptNo
      );

    if (!alreadyExists) {
      verifiedPayments.push(payment);
    }

    /*
     * Sort payment history oldest -> newest
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
     * Total paid based on verified
     * payment history.
     */
    const totalPaidFromHistory =
      verifiedPayments.reduce(
        (sum, item) =>
          sum +
          Number(item?.amount || 0),
        0
      );

    /*
     * Prefer admission paid_amount
     * when available.
     */
    const admissionPaid =
      Number(
        admission?.paid_amount ??
          admission?.paidFee ??
          0
      );

    const totalPaid =
      admissionPaid >
      totalPaidFromHistory
        ? admissionPaid
        : totalPaidFromHistory;

    const currentPaymentAmount =
      Number(payment.amount || 0);

    const previouslyPaid = Math.max(
      0,
      totalPaid -
        currentPaymentAmount
    );

    const remainingFee = Math.max(
      0,
      totalFee - totalPaid
    );

    /*
    |--------------------------------------------------------------------------
    | PDF
    |--------------------------------------------------------------------------
    */

    const doc = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4",
    });

    const pageWidth =
      doc.internal.pageSize.getWidth();

    const pageHeight =
      doc.internal.pageSize.getHeight();

    const margin = 5;

    /*
    |--------------------------------------------------------------------------
    | Outer Border
    |--------------------------------------------------------------------------
    */

    doc.setDrawColor(...COLORS.purple);
    doc.setLineWidth(0.6);

    doc.rect(
      1,
      1,
      pageWidth - 2,
      pageHeight - 2
    );

    /*
    |--------------------------------------------------------------------------
    | TOP PURPLE STRIP
    |--------------------------------------------------------------------------
    */

    doc.setFillColor(
      ...COLORS.purple
    );

    doc.rect(
      1,
      1,
      pageWidth - 2,
      8,
      "F"
    );

    /*
    |--------------------------------------------------------------------------
    | HEADER
    |--------------------------------------------------------------------------
    */

    const headerTop = 9;
    const headerHeight = 49;

    /*
     * Orange logo circle
     */

    doc.setFillColor(
      255,
      90,
      20
    );

    doc.circle(
      36,
      24,
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

    doc.setFontSize(13);

    doc.text(
      "</>",
      36,
      28,
      {
        align: "center",
      }
    );

    /*
     * Institute name
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
      51,
      23
    );

    doc.setFontSize(9);

    doc.text(
      "institute",
      51,
      30
    );

    /*
     * Big institute heading
     */

    doc.setFontSize(16);

    doc.text(
      INSTITUTE_NAME,
      13,
      43
    );

    doc.setFontSize(9);

    doc.setFont(
      "helvetica",
      "bold"
    );

    doc.text(
      INSTITUTE_SUBTITLE,
      24,
      49
    );

    /*
     * Address
     */

    doc.setFont(
      "helvetica",
      "normal"
    );

    doc.setFontSize(7.5);

    const addressLines =
      INSTITUTE_ADDRESS.split(
        "\n"
      );

    doc.text(
      addressLines,
      pageWidth / 2 - 8,
      55,
      {
        align: "center",
      }
    );

    /*
     * Vertical separator
     */

    doc.setDrawColor(
      ...COLORS.dark
    );

    doc.setLineWidth(0.5);

    doc.line(
      125,
      14,
      125,
      58
    );

    /*
     * Payment Receipt heading
     */

    doc.setFont(
      "helvetica",
      "bold"
    );

    doc.setFontSize(17);

    doc.text(
      "PAYMENT RECEIPT",
      133,
      20
    );

    doc.setFontSize(9);

    doc.text(
      "Education Management System",
      133,
      27
    );

    /*
     * Receipt information box
     */

    doc.setFillColor(
      245,
      247,
      255
    );

    doc.roundedRect(
      130,
      32,
      70,
      22,
      4,
      4,
      "F"
    );

    doc.setFont(
      "helvetica",
      "normal"
    );

    doc.setFontSize(8.5);

    doc.setTextColor(
      ...COLORS.dark
    );

    doc.text(
      "Receipt No",
      134,
      39
    );

    doc.text(
      ":",
      159,
      39
    );

    doc.setFont(
      "helvetica",
      "bold"
    );

    doc.text(
      receiptNo,
      164,
      39
    );

    doc.setFont(
      "helvetica",
      "normal"
    );

    doc.text(
      "Payment Date",
      134,
      46
    );

    doc.text(
      ":",
      159,
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
      164,
      46
    );

    doc.setFont(
      "helvetica",
      "normal"
    );

    doc.text(
      "Status",
      134,
      53
    );

    doc.text(
      ":",
      159,
      53
    );

    drawStatusBadge(
      doc,
      "Verified",
      164,
      53,
      25
    );

    /*
    |--------------------------------------------------------------------------
    | CONTACT BAR
    |--------------------------------------------------------------------------
    */

    doc.setFillColor(
      ...COLORS.purple
    );

    doc.rect(
      1,
      58,
      pageWidth - 2,
      11,
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
      "www.itlearning.in",
      72,
      65,
      {
        align: "center",
      }
    );

    doc.text(
      "|",
      pageWidth / 2,
      65,
      {
        align: "center",
      }
    );

    doc.text(
      PHONE,
      143,
      65,
      {
        align: "center",
      }
    );

    /*
    |--------------------------------------------------------------------------
    | STUDENT DETAILS
    |--------------------------------------------------------------------------
    */

    let y = 73;

    const contentX = 6;
    const contentWidth =
      pageWidth - 12;

    drawSectionHeader(doc, {
      x: contentX,
      y,
      width: contentWidth,
      title: "Student Details",
      fillColor: COLORS.lightBlue,
      iconText: "S",
    });

    y += 18;

    doc.setDrawColor(
      ...COLORS.border
    );

    doc.setLineWidth(0.35);

    doc.roundedRect(
      contentX,
      y - 3,
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

    doc.line(
      110,
      y,
      110,
      y + 25
    );

    /*
     * Left
     */

    drawKeyValue(doc, {
      label: "Student Name",
      value:
        studentName || "-",
      x: 13,
      y,
      labelWidth: 37,
      valueWidth: 58,
      fontSize: 9.5,
    });

    y += 9;

    drawKeyValue(doc, {
      label: "Roll No",
      value: rollNo,
      x: 13,
      y,
      labelWidth: 37,
      valueWidth: 58,
      fontSize: 9.5,
    });

    y += 9;

    drawKeyValue(doc, {
      label: "Course",
      value: courseTitle,
      x: 13,
      y,
      labelWidth: 37,
      valueWidth: 58,
      fontSize: 9.5,
    });

    /*
     * Right
     */

    let rightY = y - 18;

    drawKeyValue(doc, {
      label: "Batch",
      value: batchName,
      x: 119,
      y: rightY,
      labelWidth: 32,
      valueWidth: 48,
      fontSize: 9.5,
    });

    rightY += 10;

    drawKeyValue(doc, {
      label: "Admission Date",
      value: formatDate(
        admission?.admission_date
      ),
      x: 119,
      y: rightY,
      labelWidth: 32,
      valueWidth: 48,
      fontSize: 9.5,
    });

    y += 19;

    /*
    |--------------------------------------------------------------------------
    | PAYMENT HISTORY
    |--------------------------------------------------------------------------
    */

    drawSectionHeader(doc, {
      x: contentX,
      y,
      width: contentWidth,
      title: "Payment History",
      fillColor: COLORS.lightGreen,
      iconText: "P",
    });

    y += 14;

    const historyBottom =
      drawPaymentHistoryTable(
        doc,
        {
          x: contentX,
          y,
          width: contentWidth,
          payments:
            verifiedPayments,
        }
      );

    y = historyBottom + 5;

    /*
    |--------------------------------------------------------------------------
    | FEE DETAILS
    |--------------------------------------------------------------------------
    */

    drawSectionHeader(doc, {
      x: contentX,
      y,
      width: contentWidth,
      title: "Fee Details",
      fillColor: COLORS.lightGreen,
      iconText: "F",
    });

    y += 13;

    const feeRows = [
      [
        "Total Fee",
        formatCurrency(
          totalFee
        ),
      ],
      [
        "Previously Paid",
        formatCurrency(
          previouslyPaid
        ),
      ],
      [
        "This Payment",
        formatCurrency(
          currentPaymentAmount
        ),
      ],
      [
        "Total Paid",
        formatCurrency(
          totalPaid
        ),
      ],
      [
        "Remaining Fee",
        formatCurrency(
          remainingFee
        ),
      ],
    ];

    const feeTableX =
      contentX;

    const feeTableWidth =
      contentWidth;

    const feeLabelWidth =
      125;

    const feeRowHeight = 9;

    feeRows.forEach(
      ([label, value], index) => {
        const rowTop = y;

        /*
         * Highlight Total Paid
         */
        if (index === 3) {
          doc.setFillColor(
            ...COLORS.lightBlue
          );

          doc.rect(
            feeTableX,
            rowTop,
            feeTableWidth,
            feeRowHeight,
            "F"
          );
        }

        doc.setDrawColor(
          ...COLORS.border
        );

        doc.rect(
          feeTableX,
          rowTop,
          feeTableWidth,
          feeRowHeight
        );

        doc.line(
          feeTableX +
            feeLabelWidth,
          rowTop,
          feeTableX +
            feeLabelWidth,
          rowTop +
            feeRowHeight
        );

        doc.setTextColor(
          ...COLORS.dark
        );

        doc.setFont(
          "helvetica",
          index === 3 ||
            index === 4
            ? "bold"
            : "normal"
        );

        doc.setFontSize(9);

        doc.text(
          label,
          feeTableX + 13,
          rowTop + 6.2
        );

        doc.text(
          value,
          feeTableX +
            feeTableWidth -
            5,
          rowTop + 6.2,
          {
            align: "right",
          }
        );

        y += feeRowHeight;
      }
    );

    /*
    |--------------------------------------------------------------------------
    | BOTTOM TWO COLUMNS
    |--------------------------------------------------------------------------
    */

    y += 4;

    const bottomWidth =
      (contentWidth - 4) / 2;

    const leftBoxX =
      contentX;

    const rightBoxX =
      contentX +
      bottomWidth +
      4;

    const bottomBoxHeight =
      51;

    /*
    |--------------------------------------------------------------------------
    | QR VERIFICATION BOX
    |--------------------------------------------------------------------------
    */

    doc.setFillColor(
      ...COLORS.lightViolet
    );

    doc.roundedRect(
      leftBoxX,
      y,
      bottomWidth,
      bottomBoxHeight,
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
      leftBoxX,
      y,
      bottomWidth,
      bottomBoxHeight,
      3,
      3
    );

    /*
     * Purple title
     */

    doc.setTextColor(
      ...COLORS.dark
    );

    doc.setFont(
      "helvetica",
      "bold"
    );

    doc.setFontSize(11);

    doc.text(
      "Receipt Verification",
      leftBoxX + 19,
      y + 10
    );

    /*
     * QR
     */

    doc.addImage(
      qrDataUrl,
      "PNG",
      leftBoxX + 6,
      y + 14,
      38,
      38
    );

    /*
     * Divider
     */

    doc.setDrawColor(
      ...COLORS.dark
    );

    doc.setLineWidth(0.4);

    doc.line(
      leftBoxX + 50,
      y + 15,
      leftBoxX + 50,
      y + 43
    );

    /*
     * QR instructions
     */

    doc.setFont(
      "helvetica",
      "normal"
    );

    doc.setFontSize(9);

    doc.text(
      "Scan this QR code",
      leftBoxX + 57,
      y + 27
    );

    doc.text(
      "to verify this receipt.",
      leftBoxX + 57,
      y + 34
    );

    /*
    |--------------------------------------------------------------------------
    | IMPORTANT NOTE BOX
    |--------------------------------------------------------------------------
    */

    doc.setFillColor(
      ...COLORS.lightOrange
    );

    doc.roundedRect(
      rightBoxX,
      y,
      bottomWidth,
      bottomBoxHeight,
      3,
      3,
      "F"
    );

    doc.setDrawColor(
      245,
      210,
      140
    );

    doc.roundedRect(
      rightBoxX,
      y,
      bottomWidth,
      bottomBoxHeight,
      3,
      3
    );

    doc.setTextColor(
      110,
      75,
      15
    );

    doc.setFont(
      "helvetica",
      "bold"
    );

    doc.setFontSize(11);

    doc.text(
      "Important Note",
      rightBoxX + 18,
      y + 10
    );

    /*
     * Green check 1
     */

    doc.setFillColor(
      ...COLORS.green
    );

    doc.circle(
      rightBoxX + 10,
      y + 22,
      3,
      "F"
    );

    doc.setTextColor(
      ...COLORS.white
    );

    doc.setFontSize(6);

    doc.text(
      "✓",
      rightBoxX + 10,
      y + 24,
      {
        align: "center",
      }
    );

    doc.setTextColor(
      ...COLORS.dark
    );

    doc.setFont(
      "helvetica",
      "normal"
    );

    doc.setFontSize(8.5);

    doc.text(
      "This is a computer generated",
      rightBoxX + 17,
      y + 21
    );

    doc.text(
      "payment receipt.",
      rightBoxX + 17,
      y + 27
    );

    /*
     * Green check 2
     */

    doc.setFillColor(
      ...COLORS.green
    );

    doc.circle(
      rightBoxX + 10,
      y + 36,
      3,
      "F"
    );

    doc.setTextColor(
      ...COLORS.white
    );

    doc.setFontSize(6);

    doc.text(
      "✓",
      rightBoxX + 10,
      y + 38,
      {
        align: "center",
      }
    );

    doc.setTextColor(
      ...COLORS.dark
    );

    doc.setFont(
      "helvetica",
      "normal"
    );

    doc.setFontSize(8.5);

    doc.text(
      "Receipt verification is available",
      rightBoxX + 17,
      y + 35
    );

    doc.text(
      "through the QR code.",
      rightBoxX + 17,
      y + 41
    );

    /*
    |--------------------------------------------------------------------------
    | AUTHORISED SIGNATORY
    |--------------------------------------------------------------------------
    */

    const signatureX =
      pageWidth - 43;

    const signatureY =
      y + 49;

    /*
     * Simple signature-style text.
     * Replace this with an image later
     * if you have your actual signature.
     */

    doc.setTextColor(
      20,
      30,
      140
    );

    doc.setFont(
      "times",
      "italic"
    );

    doc.setFontSize(17);

    doc.text(
      "Authorised",
      signatureX,
      signatureY,
      {
        align: "center",
      }
    );

    doc.setDrawColor(
      ...COLORS.dark
    );

    doc.setLineWidth(0.3);

    doc.line(
      signatureX - 23,
      signatureY + 3,
      signatureX + 23,
      signatureY + 3
    );

    doc.setTextColor(
      ...COLORS.dark
    );

    doc.setFont(
      "helvetica",
      "bold"
    );

    doc.setFontSize(7);

    doc.text(
      "Authorised Signatory",
      signatureX,
      signatureY + 8,
      {
        align: "center",
      }
    );

    doc.setFont(
      "helvetica",
      "normal"
    );

    doc.text(
      INSTITUTE_NAME,
      signatureX,
      signatureY + 12,
      {
        align: "center",
      }
    );

    /*
    |--------------------------------------------------------------------------
    | FOOTER
    |--------------------------------------------------------------------------
    */

    const footerHeight =
      19;

    const footerY =
      pageHeight -
      footerHeight -
      1;

    doc.setFillColor(
      ...COLORS.purple
    );

    doc.rect(
      1,
      footerY,
      pageWidth - 2,
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

    doc.setFontSize(10);

    doc.text(
      "Thank you for your payment!",
      pageWidth / 2,
      footerY + 7,
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
      footerY + 10,
      pageWidth - 7,
      footerY + 10
    );

    doc.setFont(
      "helvetica",
      "italic"
    );

    doc.setFontSize(8);

    doc.text(
      "All payments are accepted under the terms of non-refund and non-transfer.",
      pageWidth / 2,
      footerY + 16,
      {
        align: "center",
      }
    );

    /*
    |--------------------------------------------------------------------------
    | DOWNLOAD
    |--------------------------------------------------------------------------
    */

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