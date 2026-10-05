import api from "./api";

const uploadReceiptPdf = async (
  pdfBlob,
  receiptNo
) => {
  if (!pdfBlob) {
    throw new Error("Receipt PDF is missing.");
  }

  if (!receiptNo) {
    throw new Error("Receipt number is missing.");
  }

  const formData = new FormData();

  formData.append(
    "receipt",
    pdfBlob,
    `Payment-Receipt-${receiptNo}.pdf`
  );

  formData.append(
    "receiptNo",
    receiptNo
  );

  const response = await api.post(
    "/receipts/upload",
    formData,
    {
      headers: {
        // IMPORTANT:
        // Override api.js JSON header only
        // for this request.
        // Browser/Axios will create the
        // multipart boundary automatically.
        "Content-Type": undefined,
      },
    }
  );

  return response.data;
};

export default uploadReceiptPdf;