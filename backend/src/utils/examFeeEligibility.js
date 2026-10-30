
import StudentAdmission from "../models/StudentAdmission.js";

export const getStudentExamFeeStatus = async (studentId, courseId) => {
  const admissions = await StudentAdmission.find({
    student_id: studentId,
    course_id: courseId,
    status: "Active",
  })
    .select("_id final_amount paid_amount")
    .lean();

  if (!admissions.length) {
    return {
      eligible: false,
      outstanding: 0,
      message:
        "No active admission was found for this exam course. Contact your institute administrator.",
    };
  }

  const outstanding = Number(
    admissions.reduce((total, admission) => {
      const fee = Number(admission.final_amount || 0);
      const paid = Number(admission.paid_amount || 0);

      return total + Math.max(0, fee - paid);
    }, 0).toFixed(2)
  );

  if (outstanding > 0) {
    return {
      eligible: false,
      outstanding,
      message:
        `Your course fee is due. Outstanding amount: ₹${outstanding.toLocaleString("en-IN")}. Please complete your fee payment before starting the exam.`,
    };
  }

  return {
    eligible: true,
    outstanding: 0,
    message: "Fee clearance verified.",
  };
};
