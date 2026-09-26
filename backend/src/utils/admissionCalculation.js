export const calculateAdmissionAmount = ({
  courseFee = 0,
  discountType = "amount",
  discountValue = 0,
  gstRate = 0,
  admissionFee = 0,
}) => {
  const normalizedCourseFee = Math.max(
    Number(courseFee) || 0,
    0
  );

  const normalizedDiscountValue = Math.max(
    Number(discountValue) || 0,
    0
  );

  const normalizedGstRate = Math.max(
    Number(gstRate) || 0,
    0
  );

  const normalizedAdmissionFee = Math.max(
    Number(admissionFee) || 0,
    0
  );

  let discountAmount = 0;

  if (discountType === "percentage") {
    discountAmount =
      (normalizedCourseFee *
        normalizedDiscountValue) /
      100;
  } else {
    discountAmount =
      normalizedDiscountValue;
  }

  discountAmount = Math.min(
    discountAmount,
    normalizedCourseFee
  );

  const taxableAmount =
    normalizedCourseFee - discountAmount;

  const gstAmount =
    (taxableAmount * normalizedGstRate) /
    100;

  const finalAmount =
    taxableAmount +
    gstAmount +
    normalizedAdmissionFee;

  return {
    courseFee: Number(
      normalizedCourseFee.toFixed(2)
    ),

    discountAmount: Number(
      discountAmount.toFixed(2)
    ),

    gstAmount: Number(
      gstAmount.toFixed(2)
    ),

    admissionFee: Number(
      normalizedAdmissionFee.toFixed(2)
    ),

    finalAmount: Number(
      finalAmount.toFixed(2)
    ),
  };
};