import jsPDF from "jspdf";
import QRCode from "qrcode";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

import {
  FaUserGraduate,
  FaFileInvoiceDollar,
  FaQrcode,
  FaCircleCheck,
  FaGlobe,
  FaPhone,
  FaFileCircleCheck,
} from "react-icons/fa6";

/*
|--------------------------------------------------------------------------
| IT LEARNING INSTITUTE
| PAYMENT RECEIPT GENERATOR
|--------------------------------------------------------------------------
|
| QR FLOW:
|
| QR CODE
|    ↓
| /verify-receipt/:receiptNo
|    ↓
| VerifyReceipt.jsx
|    ↓
| /api/public/receipts/verify/:receiptNo
|
|--------------------------------------------------------------------------
*/

const INSTITUTE_NAME = "IT LEARNING INSTITUTE";

const INSTITUTE_TAGLINE =
  "An ISO 9001:2015 Certified Organization";

const INSTITUTE_ADDRESS =
  "ADDRESS : 2ND FLOOR, NATRAJ GYM, CHAR SHAHAR KA NAKA, HAZIRA,\n" +
  "GWALIOR, MADHYA PRADESH 474003";

const WEBSITE = "www.itlearning.in";

const PHONE = "+91 9770622162";

/*
|--------------------------------------------------------------------------
| Institute Logo
|--------------------------------------------------------------------------
|
| Put your logo here:
|
| frontend/public/assets/institute-logo.png
|
*/

const INSTITUTE_LOGO_URL =
  "/assets/institute-logo.png";

/*
|--------------------------------------------------------------------------
| COLORS
|--------------------------------------------------------------------------
*/

const COLORS = {
  purple: [42, 30, 145],
  darkPurple: [30, 20, 105],

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

  gray: [100, 105, 115],

  border: [190, 202, 218],

  white: [255, 255, 255],
};

/*
|--------------------------------------------------------------------------
| BASIC HELPERS
|--------------------------------------------------------------------------
*/

const formatDate = (value) => {
  if (!value) {
    return "-";
  }

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
  return `Rs. ${Number(value || 0).toLocaleString(
    "en-IN",
    {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }
  )}`;
};

const getStudentName = (student = {}) => {
  return (
    [
      student?.firstName,
      student?.surname,
    ]
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

/*
|--------------------------------------------------------------------------
| RECEIPT VERIFICATION URL
|--------------------------------------------------------------------------
|
| IMPORTANT:
|
| For production:
|
| VITE_RECEIPT_VERIFY_BASE_URL=https://YOUR-FRONTEND-DOMAIN
|
| Example:
|
| VITE_RECEIPT_VERIFY_BASE_URL=https://your-site.netlify.app
|
| DO NOT use the Render backend URL here.
|
|--------------------------------------------------------------------------
*/

// const getReceiptVerificationBaseUrl = () => {
//   const configuredUrl =
//     // import.meta.env.VITE_RECEIPT_VERIFY_BASE_URL;
//     import.meta.env.VITE_API_URL || "https://education-management-backend-79g1.onrender.com/api";

//   if (configuredUrl?.trim()) {
//     return configuredUrl
//       .trim()
//       .replace(/\/+$/, "");
//   }

//   const frontendUrl =
//     import.meta.env.VITE_FRONTEND_URL || "https://education-management-frontend.netlify.app/";

//   if (frontendUrl?.trim()) {
//     return frontendUrl
//       .trim()
//       .replace(/\/+$/, "");
//   }

//   /*
//   |--------------------------------------------------------------------------
//   | Development fallback
//   |--------------------------------------------------------------------------
//   |
//   | This works when clicking the QR from the same computer.
//   |
//   | For scanning from a phone while developing locally,
//   | use VITE_RECEIPT_VERIFY_BASE_URL with your PC LAN IP.
//   |
//   */

//   return window.location.origin.replace(
//     /\/+$/,
//     ""
//   );
// };

const getReceiptVerificationBaseUrl = () => {
  const frontendUrl = import.meta.env.VITE_FRONTEND_URL;

  if (frontendUrl?.trim()) {
    return frontendUrl.trim().replace(/\/+$/, "");
  }

  return "https://education-management-frontend.netlify.app";
};

const getReceiptVerificationUrl = (
  receiptNo
) => {
  if (!receiptNo) {
    throw new Error(
      "Receipt number is missing."
    );
  }

  const baseUrl =
    getReceiptVerificationBaseUrl();

  return `${baseUrl}/verify-receipt/${encodeURIComponent(
    receiptNo
  )}`;
};

/*
|--------------------------------------------------------------------------
| IMAGE LOADER
|--------------------------------------------------------------------------
*/

const loadImageAsDataUrl = async (
  imageUrl
) => {
  return new Promise(
    (resolve, reject) => {
      const image = new Image();

      image.onload = () => {
        try {
          const canvas =
            document.createElement(
              "canvas"
            );

          canvas.width =
            image.naturalWidth ||
            image.width;

          canvas.height =
            image.naturalHeight ||
            image.height;

          const context =
            canvas.getContext("2d");

          if (!context) {
            reject(
              new Error(
                "Unable to create canvas context."
              )
            );
            return;
          }

          context.drawImage(
            image,
            0,
            0
          );

          resolve(
            canvas.toDataURL(
              "image/png"
            )
          );
        } catch (error) {
          reject(error);
        }
      };

      image.onerror = () => {
        reject(
          new Error(
            `Unable to load institute logo: ${imageUrl}`
          )
        );
      };

      image.src = imageUrl;
    }
  );
};

/*
|--------------------------------------------------------------------------
| REACT ICON -> PNG
|--------------------------------------------------------------------------
*/

const reactIconToPng = async (
  Icon,
  color = "#000000",
  size = 128
) => {
  const svgMarkup =
    renderToStaticMarkup(
      React.createElement(
        Icon,
        {
          size,
          color,
        }
      )
    );

  const svgDataUrl =
    `data:image/svg+xml;charset=utf-8,${encodeURIComponent(
      svgMarkup
    )}`;

  return new Promise(
    (resolve, reject) => {
      const image = new Image();

      image.onload = () => {
        try {
          const canvas =
            document.createElement(
              "canvas"
            );

          canvas.width = size;
          canvas.height = size;

          const context =
            canvas.getContext("2d");

          if (!context) {
            reject(
              new Error(
                "Unable to create icon canvas."
              )
            );
            return;
          }

          context.clearRect(
            0,
            0,
            size,
            size
          );

          context.drawImage(
            image,
            0,
            0,
            size,
            size
          );

          resolve(
            canvas.toDataURL(
              "image/png"
            )
          );
        } catch (error) {
          reject(error);
        }
      };

      image.onerror = () => {
        reject(
          new Error(
            "Unable to render React Icon."
          )
        );
      };

      image.src = svgDataUrl;
    }
  );
};

/*
|--------------------------------------------------------------------------
| DRAW ICON
|--------------------------------------------------------------------------
*/

const addIcon = (
  doc,
  iconDataUrl,
  x,
  y,
  size
) => {
  doc.addImage(
    iconDataUrl,
    "PNG",
    x,
    y,
    size,
    size
  );
};

/*
|--------------------------------------------------------------------------
| SECTION HEADER
|--------------------------------------------------------------------------
*/

const drawSectionHeader = (
  doc,
  {
    x,
    y,
    width,
    title,
    background,
    iconDataUrl,
  }
) => {
  const height = 13;

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
    y + 6.5,
    4.8,
    "F"
  );

  addIcon(
    doc,
    iconDataUrl,
    x + 7.2,
    y + 3.7,
    5.6
  );

  doc.setTextColor(
    ...COLORS.dark
  );

  doc.setFont(
    "helvetica",
    "bold"
  );

  doc.setFontSize(12);

  doc.text(
    title,
    x + 19,
    y + 8.5
  );
};

/*
|--------------------------------------------------------------------------
| KEY VALUE
|--------------------------------------------------------------------------
*/

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

  doc.setFontSize(8.2);

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

/*
|--------------------------------------------------------------------------
| VERIFIED BADGE
|--------------------------------------------------------------------------
*/

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
    y - 4,
    24,
    7,
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

  doc.setFontSize(6.5);

  doc.text(
    "Verified",
    x + 12,
    y + 0.3,
    {
      align: "center",
    }
  );
};

/*
|--------------------------------------------------------------------------
| PAYMENT HISTORY
|--------------------------------------------------------------------------
*/

const drawPaymentHistory = (
  doc,
  {
    x,
    y,
    width,
    payments,
  }
) => {
  const headerHeight = 8.2;

  const rowHeight = 6.2;

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

  /*
  |--------------------------------------------------------------------------
  | Header
  |--------------------------------------------------------------------------
  */

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

  doc.setLineWidth(0.25);

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

      doc.setFontSize(6.3);

      doc.text(
        header,
        currentX +
          columnWidth / 2,
        y + 5.3,
        {
          align: "center",
        }
      );

      currentX += columnWidth;
    }
  );

  /*
  |--------------------------------------------------------------------------
  | Rows
  |--------------------------------------------------------------------------
  */

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
                9,
              currentY + 0.7,
              18,
              4.8,
              2.4,
              2.4,
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

            doc.setFontSize(5.6);

            doc.text(
              value,
              currentX +
                columnWidth / 2,
              currentY + 4.1,
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

            doc.setFontSize(6.1);

            doc.text(
              value,
              currentX +
                columnWidth / 2,
              currentY + 4.2,
              {
                align: "center",
              }
            );
          }

          currentX +=
            columnWidth;
        }
      );

      currentY += rowHeight;
    }
  );

  return currentY;
};

/*
|--------------------------------------------------------------------------
| MAIN FUNCTION
|--------------------------------------------------------------------------
*/

const generatePaymentReceipt = async (
  payment,
  paymentHistory = []
) => {
  try {
    /*
    |--------------------------------------------------------------------------
    | VALIDATION
    |--------------------------------------------------------------------------
    */

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

    /*
    |--------------------------------------------------------------------------
    | RECEIPT NUMBER
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
    | VERIFICATION URL
    |--------------------------------------------------------------------------
    */

    const verificationUrl =
      getReceiptVerificationUrl(
        receiptNo
      );

    console.log(
      "========================================"
    );

    console.log(
      "Receipt QR Verification URL:"
    );

    console.log(
      verificationUrl
    );

    console.log(
      "========================================"
    );

    /*
    |--------------------------------------------------------------------------
    | HIGH-RESOLUTION QR CODE
    |--------------------------------------------------------------------------
    |
    | Important:
    |
    | width = 1600
    | margin = 10
    | errorCorrectionLevel = H
    |
    | These settings make the physical QR much
    | easier for phone cameras to scan.
    |
    */

const qrDataUrl =
  await QRCode.toDataURL(
    verificationUrl,
    {
      type: "image/png",

      // High resolution source
      width: 2000,

      // Large white quiet zone around QR
      margin: 12,

      // M is better here because the URL is short
      // and it keeps the QR less dense and easier to scan.
      errorCorrectionLevel: "M",

      color: {
        dark: "#000000",
        light: "#FFFFFF",
      },
    }
  );

    /*
    |--------------------------------------------------------------------------
    | ICONS
    |--------------------------------------------------------------------------
    */

    const [
      userIcon,
      documentIcon,
      qrIcon,
      checkIcon,
      globeIcon,
      phoneIcon,
      noteIcon,
    ] = await Promise.all([
      reactIconToPng(
        FaUserGraduate,
        "#148CEB",
        128
      ),

      reactIconToPng(
        FaFileInvoiceDollar,
        "#00B964",
        128
      ),

      reactIconToPng(
        FaQrcode,
        "#691EDC",
        128
      ),

      reactIconToPng(
        FaCircleCheck,
        "#00B964",
        128
      ),

      reactIconToPng(
        FaGlobe,
        "#FFFFFF",
        128
      ),

      reactIconToPng(
        FaPhone,
        "#FFFFFF",
        128
      ),

      reactIconToPng(
        FaFileCircleCheck,
        "#F2AA00",
        128
      ),
    ]);

    /*
    |--------------------------------------------------------------------------
    | INSTITUTE LOGO
    |--------------------------------------------------------------------------
    */

    let instituteLogo = null;

    try {
      instituteLogo =
        await loadImageAsDataUrl(
          INSTITUTE_LOGO_URL
        );
    } catch (logoError) {
      console.warn(
        "Institute logo could not be loaded:",
        logoError
      );
    }

    /*
    |--------------------------------------------------------------------------
    | DATA
    |--------------------------------------------------------------------------
    */

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

    /*
    |--------------------------------------------------------------------------
    | PAYMENT HISTORY
    |--------------------------------------------------------------------------
    */

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
    |--------------------------------------------------------------------------
    | Latest five payments
    |--------------------------------------------------------------------------
    */

    const displayedPayments =
      verifiedPayments.slice(-5);

    /*
    |--------------------------------------------------------------------------
    | FEE CALCULATION
    |--------------------------------------------------------------------------
    */

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

    const totalPaid =
      Math.max(
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

    /*
    |--------------------------------------------------------------------------
    | PDF
    |--------------------------------------------------------------------------
    */

    const doc =
      new jsPDF({
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

    /*
    |--------------------------------------------------------------------------
    | PAGE BORDER
    |--------------------------------------------------------------------------
    */

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

    /*
    |--------------------------------------------------------------------------
    | TOP STRIP
    |--------------------------------------------------------------------------
    */

    doc.setFillColor(
      ...COLORS.purple
    );

    doc.rect(
      1.5,
      1.5,
      pageWidth - 3,
      6,
      "F"
    );

    /*
    |--------------------------------------------------------------------------
    | HEADER
    |--------------------------------------------------------------------------
    */

    if (instituteLogo) {
      doc.addImage(
        instituteLogo,
        "PNG",
        10,
        10,
        29,
        20
      );
    } else {
      doc.setFillColor(
        ...COLORS.orange
      );

      doc.circle(
        24,
        20,
        9,
        "F"
      );

      doc.setTextColor(
        ...COLORS.white
      );

      doc.setFont(
        "helvetica",
        "bold"
      );

      doc.setFontSize(8);

      doc.text(
        "</>",
        24,
        23,
        {
          align: "center",
        }
      );
    }

    /*
    |--------------------------------------------------------------------------
    | Institute Name
    |--------------------------------------------------------------------------
    */

    doc.setTextColor(
      ...COLORS.dark
    );

    doc.setFont(
      "helvetica",
      "bold"
    );

    doc.setFontSize(13);

    doc.text(
      "IT Learning",
      43,
      20
    );

    doc.setFontSize(6.5);

    doc.text(
      "institute",
      43,
      25
    );

    doc.setFontSize(12);

    doc.text(
      INSTITUTE_NAME,
      11,
      42
    );

    /*
    |--------------------------------------------------------------------------
    | Tagline
    |--------------------------------------------------------------------------
    */

    doc.setFontSize(6.5);

    doc.text(
      INSTITUTE_TAGLINE,
      29,
      47
    );

    /*
    |--------------------------------------------------------------------------
    | Address
    |--------------------------------------------------------------------------
    */

    doc.setFont(
      "helvetica",
      "normal"
    );

    doc.setFontSize(5.7);

    doc.text(
      INSTITUTE_ADDRESS.split(
        "\n"
      ),
      59,
      53,
      {
        align: "center",
      }
    );

    /*
    |--------------------------------------------------------------------------
    | Header divider
    |--------------------------------------------------------------------------
    */

    doc.setDrawColor(
      ...COLORS.dark
    );

    doc.setLineWidth(0.35);

    doc.line(
      124,
      11,
      124,
      57
    );

    /*
    |--------------------------------------------------------------------------
    | Payment Receipt title
    |--------------------------------------------------------------------------
    */

    doc.setFont(
      "helvetica",
      "bold"
    );

    doc.setFontSize(13.5);

    doc.text(
      "PAYMENT RECEIPT",
      130,
      20
    );

    doc.setFontSize(6.8);

    doc.text(
      "Education Management System",
      130,
      26
    );

    /*
    |--------------------------------------------------------------------------
    | Receipt box
    |--------------------------------------------------------------------------
    */

    doc.setFillColor(
      246,
      247,
      255
    );

    doc.roundedRect(
      128,
      30,
      76,
      27,
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

    doc.setFontSize(7);

    doc.text(
      "Receipt No",
      132,
      37
    );

    doc.text(
      ":",
      157,
      37
    );

    doc.setFont(
      "helvetica",
      "bold"
    );

    doc.setFontSize(6.4);

    doc.text(
      receiptNo,
      162,
      37
    );

    doc.setFont(
      "helvetica",
      "normal"
    );

    doc.setFontSize(7);

    doc.text(
      "Payment Date",
      132,
      45
    );

    doc.text(
      ":",
      157,
      45
    );

    doc.setFont(
      "helvetica",
      "bold"
    );

    doc.text(
      formatDate(
        payment.payment_date
      ),
      162,
      45
    );

    doc.setFont(
      "helvetica",
      "normal"
    );

    doc.text(
      "Status",
      132,
      53
    );

    doc.text(
      ":",
      157,
      53
    );

    drawVerifiedBadge(
      doc,
      162,
      53
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
      1.5,
      59,
      pageWidth - 3,
      10,
      "F"
    );

    addIcon(
      doc,
      globeIcon,
      45,
      61.2,
      6
    );

    doc.setTextColor(
      ...COLORS.white
    );

    doc.setFont(
      "helvetica",
      "bold"
    );

    doc.setFontSize(7.5);

    doc.text(
      WEBSITE,
      53,
      65.5
    );

    doc.text(
      "|",
      pageWidth / 2,
      65.5,
      {
        align: "center",
      }
    );

    addIcon(
      doc,
      phoneIcon,
      122,
      61.2,
      6
    );

    doc.text(
      PHONE,
      130,
      65.5
    );

    /*
    |--------------------------------------------------------------------------
    | STUDENT DETAILS
    |--------------------------------------------------------------------------
    */

    const studentHeaderY = 74;

    drawSectionHeader(
      doc,
      {
        x: margin,
        y: studentHeaderY,
        width: contentWidth,
        title: "Student Details",
        background:
          COLORS.lightBlue,
        iconDataUrl:
          userIcon,
      }
    );

    const studentBoxY =
      studentHeaderY + 13;

    doc.setDrawColor(
      ...COLORS.border
    );

    doc.setLineWidth(0.25);

    doc.roundedRect(
      margin,
      studentBoxY,
      contentWidth,
      28,
      3,
      3
    );

    /*
    |--------------------------------------------------------------------------
    | Student divider
    |--------------------------------------------------------------------------
    */

    doc.setDrawColor(
      ...COLORS.blue
    );

    doc.setLineWidth(0.35);

    doc.line(
      110,
      studentBoxY + 4,
      110,
      studentBoxY + 24
    );

    /*
    |--------------------------------------------------------------------------
    | Student left
    |--------------------------------------------------------------------------
    */

    drawKeyValue(
      doc,
      {
        label: "Student Name",
        value: studentName,
        x: 12,
        y:
          studentBoxY + 8,
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
        x: 12,
        y:
          studentBoxY + 16,
        labelWidth: 34,
        valueWidth: 58,
      }
    );

    drawKeyValue(
      doc,
      {
        label: "Course",
        value: courseName,
        x: 12,
        y:
          studentBoxY + 24,
        labelWidth: 34,
        valueWidth: 58,
      }
    );

    /*
    |--------------------------------------------------------------------------
    | Student right
    |--------------------------------------------------------------------------
    */

    drawKeyValue(
      doc,
      {
        label: "Batch",
        value: batchName,
        x: 117,
        y:
          studentBoxY + 8,
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
        x: 117,
        y:
          studentBoxY + 16,
        labelWidth: 31,
        valueWidth: 48,
      }
    );

    /*
    |--------------------------------------------------------------------------
    | PAYMENT HISTORY
    |--------------------------------------------------------------------------
    */

    const paymentHeaderY = 117;

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
        iconDataUrl:
          documentIcon,
      }
    );

    const paymentTableBottom =
      drawPaymentHistory(
        doc,
        {
          x: margin,
          y:
            paymentHeaderY +
            13,
          width: contentWidth,
          payments:
            displayedPayments,
        }
      );

    /*
    |--------------------------------------------------------------------------
    | FEE DETAILS
    |--------------------------------------------------------------------------
    */

    const feeHeaderY =
      paymentTableBottom + 3;

    drawSectionHeader(
      doc,
      {
        x: margin,
        y: feeHeaderY,
        width: contentWidth,
        title: "Fee Details",
        background:
          COLORS.lightGreen,
        iconDataUrl:
          documentIcon,
      }
    );

    const feeTop =
      feeHeaderY + 13;

    const feeRowHeight = 6.5;

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

        /*
        |--------------------------------------------------------------------------
        | Total Paid highlight
        |--------------------------------------------------------------------------
        */

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

        doc.setFontSize(7.3);

        doc.text(
          label,
          margin + 13,
          rowY + 4.5
        );

        doc.text(
          value,
          margin +
            contentWidth -
            6,
          rowY + 4.5,
          {
            align: "right",
          }
        );
      }
    );

    /*
    |--------------------------------------------------------------------------
    | LOWER AREA
    |--------------------------------------------------------------------------
    */

    const lowerY =
      feeTop +
      feeRows.length *
        feeRowHeight +
      4;

    const lowerGap = 5;

    const lowerWidth =
      (contentWidth -
        lowerGap) /
      2;

    /*
    |--------------------------------------------------------------------------
    | QR BOX HEIGHT
    |--------------------------------------------------------------------------
    |
    | Increased from 34mm to 40mm because the
    | physical QR is now 24mm.
    |
    */

    const lowerHeight = 46;

    /*
    |--------------------------------------------------------------------------
    | QR BOX
    |--------------------------------------------------------------------------
    */

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
        iconDataUrl:
          qrIcon,
      }
    );

    /*
    |--------------------------------------------------------------------------
    | PHYSICAL QR CODE
    |--------------------------------------------------------------------------
    |
    | IMPORTANT:
    |
    | 24mm printed size
    | High-resolution source
    | Large quiet zone
    | Error correction H
    |
    */

  const qrX =
  qrBoxX + 5;

const qrY =
  lowerY + 14;

const qrSize = 31;

    /*
    |--------------------------------------------------------------------------
    | Add QR image
    |--------------------------------------------------------------------------
    */

doc.addImage(
  qrDataUrl,
  "PNG",
  qrX,
  qrY,
  qrSize,
  qrSize,
  undefined,
  "NONE"
);
    /*
    |--------------------------------------------------------------------------
    | CLICKABLE QR
    |--------------------------------------------------------------------------
    |
    | This allows clicking the QR inside a PDF
    | viewer.
    |
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
    |--------------------------------------------------------------------------
    | QR TEXT
    |--------------------------------------------------------------------------
    */

    doc.setTextColor(
      ...COLORS.dark
    );

    doc.setFont(
      "helvetica",
      "normal"
    );

    doc.setFontSize(6.2);

    doc.text(
      "Scan to verify receipt",
      qrX +
        qrSize / 2,
      qrY +
        qrSize +
        4,
      {
        align: "center",
      }
    );

    /*
    |--------------------------------------------------------------------------
    | QR DIVIDER
    |--------------------------------------------------------------------------
    */

    doc.setDrawColor(
      ...COLORS.dark
    );

    doc.setLineWidth(0.25);

    doc.line(
  qrBoxX + 45,
  lowerY + 14,
  qrBoxX + 45,
  lowerY + 40
);

    /*
    |--------------------------------------------------------------------------
    | QR DESCRIPTION
    |--------------------------------------------------------------------------
    */

    doc.setTextColor(
      ...COLORS.dark
    );

    doc.setFont(
      "helvetica",
      "normal"
    );

    doc.setFontSize(6.8);

    doc.text(
  "Scan this QR code",
  qrBoxX + 50,
  lowerY + 23
);

doc.text(
  "to verify this receipt.",
  qrBoxX + 50,
  lowerY + 29
);

    /*
    |--------------------------------------------------------------------------
    | IMPORTANT NOTE
    |--------------------------------------------------------------------------
    */

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
        iconDataUrl:
          noteIcon,
      }
    );

    /*
    |--------------------------------------------------------------------------
    | Note 1
    |--------------------------------------------------------------------------
    */

    addIcon(
      doc,
      checkIcon,
      noteBoxX + 5.8,
      lowerY + 17.3,
      5.5
    );

    doc.setTextColor(
      ...COLORS.dark
    );

    doc.setFont(
      "helvetica",
      "normal"
    );

    doc.setFontSize(6.2);

    doc.text(
      "This is a computer generated",
      noteBoxX + 13,
      lowerY + 19
    );

    doc.text(
      "payment receipt.",
      noteBoxX + 13,
      lowerY + 24
    );

    /*
    |--------------------------------------------------------------------------
    | Note 2
    |--------------------------------------------------------------------------
    */

    addIcon(
      doc,
      checkIcon,
      noteBoxX + 5.8,
      lowerY + 27.5,
      5.5
    );

    doc.text(
      "Receipt verification is available",
      noteBoxX + 13,
      lowerY + 29
    );

    doc.text(
      "through the QR code.",
      noteBoxX + 13,
      lowerY + 33
    );

    /*
    |--------------------------------------------------------------------------
    | FOOTER POSITION
    |--------------------------------------------------------------------------
    */

    const footerHeight = 17;

    const footerY =
      pageHeight -
      footerHeight -
      1.5;

    /*
    |--------------------------------------------------------------------------
    | AUTHORISED SIGNATURE
    |--------------------------------------------------------------------------
    |
    | Signature remains outside Important Note.
    |
    */

    const signatureCenterX =
      noteBoxX +
      lowerWidth / 2;

    const signatureY =
      footerY - 7;

    /*
    |--------------------------------------------------------------------------
    | Signature strokes
    |--------------------------------------------------------------------------
    */

    doc.setDrawColor(
      35,
      45,
      150
    );

    doc.setLineWidth(0.55);

    doc.line(
      signatureCenterX - 14,
      signatureY - 4,
      signatureCenterX - 10,
      signatureY - 9
    );

    doc.line(
      signatureCenterX - 10,
      signatureY - 9,
      signatureCenterX - 6,
      signatureY - 3
    );

    doc.line(
      signatureCenterX - 6,
      signatureY - 3,
      signatureCenterX,
      signatureY - 10
    );

    doc.line(
      signatureCenterX,
      signatureY - 10,
      signatureCenterX + 5,
      signatureY - 4
    );

    doc.line(
      signatureCenterX + 5,
      signatureY - 4,
      signatureCenterX + 10,
      signatureY - 8
    );

    doc.line(
      signatureCenterX + 10,
      signatureY - 8,
      signatureCenterX + 14,
      signatureY - 4
    );

    /*
    |--------------------------------------------------------------------------
    | Signature line
    |--------------------------------------------------------------------------
    */

    doc.setDrawColor(
      ...COLORS.dark
    );

    doc.setLineWidth(0.25);

    doc.line(
      signatureCenterX - 18,
      signatureY,
      signatureCenterX + 18,
      signatureY
    );

    doc.setTextColor(
      ...COLORS.dark
    );

    doc.setFont(
      "helvetica",
      "bold"
    );

    doc.setFontSize(5.8);

    doc.text(
      "Authorised Signatory",
      signatureCenterX,
      signatureY + 3.2,
      {
        align: "center",
      }
    );

    doc.setFont(
      "helvetica",
      "normal"
    );

    doc.setFontSize(5.4);

    doc.text(
      INSTITUTE_NAME,
      signatureCenterX,
      signatureY + 6.5,
      {
        align: "center",
      }
    );

    /*
    |--------------------------------------------------------------------------
    | FOOTER
    |--------------------------------------------------------------------------
    */

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

    doc.setFontSize(8);

    doc.text(
      "Thank you for your payment!",
      pageWidth / 2,
      footerY + 6,
      {
        align: "center",
      }
    );

    doc.setDrawColor(
      ...COLORS.white
    );

    doc.setLineWidth(0.2);

    doc.line(
      7,
      footerY + 9,
      pageWidth - 7,
      footerY + 9
    );

    doc.setFont(
      "helvetica",
      "italic"
    );

    doc.setFontSize(5.7);

    doc.text(
      "All payments are accepted under the terms of non-refund and non-transfer.",
      pageWidth / 2,
      footerY + 14,
      {
        align: "center",
      }
    );

    /*
    |--------------------------------------------------------------------------
    | DEBUG
    |--------------------------------------------------------------------------
    */

    console.log(
      "Payment receipt generated successfully."
    );

    console.log(
      "Receipt:",
      receiptNo
    );

    console.log(
      "QR URL:",
      verificationUrl
    );

    /*
    |--------------------------------------------------------------------------
    | DOWNLOAD
    |--------------------------------------------------------------------------
    */

    // doc.save(
    //   `Payment-Receipt-${receiptNo}.pdf`
    // );
    const pdfBlob = doc.output("blob");

    doc.save(`Payment-Receipt-${receiptNo}.pdf`);

    return pdfBlob;
    
  } catch (error) {
    console.error(
      "Payment receipt generation error:",
      error
    );

    throw error;
  }
};

export default generatePaymentReceipt;