import {
  FiDownload,
  FiEdit2,
  FiEye,
  FiTrash2,
  FiCreditCard,
} from "react-icons/fi";

import { Link } from "react-router-dom";

// import { getAssetUrl } from "../../../utils/assetUrl";
import { getAssetUrl } from "../../utils/assetUrl";

// import {
//   getStudentPayments,
// } from "../../../services/receiptService";

// import { getStudentPayments } from "../../../services/receiptService";

import {
  getStudentPayments,
} from "../../services/receiptService";

// import generatePaymentReceipt from "../../../utils/generatePaymentReceipt";
import generatePaymentReceipt from "../../utils/generatePaymentReceipt";

const StudentTable = ({
  students,
  onView,
  onEdit,
  onDelete,
  onStatusChange,
  sortBy,
  sortOrder,
  onSort,
}) => {
  const renderSortIcon = (
    field
  ) => {
    if (sortBy !== field) {
      return null;
    }

    return sortOrder === "asc"
      ? " â†‘"
      : " â†“";
  };

  // const handleDownloadReceipt = async (
  //   student
  // ) => {
  //   try {
  //     if (!student?._id) {
  //       alert(
  //         "Student information is missing."
  //       );

  //       return;
  //     }

  //     const response =
  //       await getStudentPayments(
  //         student._id
  //       );

  //     const data =
  //       response?.data?.data;

  //     const payments = Array.isArray(
  //       data?.payments
  //     )
  //       ? data.payments
  //       : Array.isArray(
  //           response?.data?.payments
  //         )
  //       ? response.data.payments
  //       : [];

  //     /*
  //     * Only verified payments are allowed.
  //     */
  //     const verifiedPayments =
  //       payments.filter(
  //         (payment) =>
  //           payment.status ===
  //           "Verified"
  //       );

  //     if (
  //       verifiedPayments.length === 0
  //     ) {
  //       alert(
  //         "No verified payment receipt is available for this student."
  //       );

  //       return;
  //     }

  //     /*
  //     * Payment API is sorted by payment_date desc,
  //     * so first payment is the latest receipt.
  //     */
  //     const latestPayment =
  //       verifiedPayments[0];

  //     await generatePaymentReceipt(
  //       latestPayment,
  //       verifiedPayments
  //     );
  //   } catch (error) {
  //     console.error(
  //       "Receipt download error:",
  //       error
  //     );

  //     alert(
  //       error?.response?.data
  //         ?.message ||
  //         error?.message ||
  //         "Unable to download receipt."
  //     );
  //   }
  // };

//   const handleDownloadReceipt = async (student) => {
//   try {
//     if (!student?._id) {
//       alert("Student information is missing.");
//       return;
//     }

//     const response = await getStudentPayments(
//       student._id
//     );

//     const data = response?.data?.data;

//     const payments = Array.isArray(
//       data?.payments
//     )
//       ? data.payments
//       : Array.isArray(
//           response?.data?.payments
//         )
//       ? response.data.payments
//       : [];

//     const verifiedPayments =
//       payments.filter(
//         (payment) =>
//           payment.status === "Verified"
//       );

//     if (
//       verifiedPayments.length === 0
//     ) {
//       alert(
//         "No verified payment receipt is available for this student."
//       );
//       return;
//     }

//     /*
//      * Latest verified payment
//      */
//     const latestPayment =
//       [...verifiedPayments].sort(
//         (a, b) =>
//           new Date(
//             b.payment_date || 0
//           ).getTime() -
//           new Date(
//             a.payment_date || 0
//           ).getTime()
//       )[0];

//     /*
//      * Generate new styled receipt
//      * with complete payment history.
//      */
//     await generatePaymentReceipt(
//       latestPayment,
//       verifiedPayments
//     );
//   } catch (error) {
//     console.error(
//       "Receipt download error:",
//       error
//     );

//     alert(
//       error?.response?.data?.message ||
//         error?.message ||
//         "Unable to download receipt."
//     );
//   }
// };

// const handleDownloadReceipt = async (student) => {
//   try {
//     if (!student?._id) {
//       alert("Student information is missing.");
//       return;
//     }

//     const response =
//       await getStudentPayments(
//         student._id
//       );

//     const data =
//       response?.data?.data;

//     const payments =
//       Array.isArray(data?.payments)
//         ? data.payments
//         : Array.isArray(
//             response?.data?.payments
//           )
//         ? response.data.payments
//         : [];

//     const verifiedPayments =
//       payments.filter(
//         (payment) =>
//           payment.status ===
//           "Verified"
//       );

//     if (
//       verifiedPayments.length === 0
//     ) {
//       alert(
//         "No verified payment receipt is available for this student."
//       );
//       return;
//     }

//     /*
//      * Latest payment becomes the
//      * current receipt.
//      */
//     const latestPayment =
//       [...verifiedPayments].sort(
//         (a, b) =>
//           new Date(
//             b.payment_date || 0
//           ).getTime() -
//           new Date(
//             a.payment_date || 0
//           ).getTime()
//       )[0];

//     /*
//      * Generate receipt with
//      * complete payment history.
//      */
//     await generatePaymentReceipt(
//       latestPayment,
//       verifiedPayments
//     );
//   } catch (error) {
//     console.error(
//       "Receipt download error:",
//       error
//     );

//     alert(
//       error?.response?.data?.message ||
//         error?.message ||
//         "Unable to download receipt."
//     );
//   }
// };
const handleDownloadReceipt = async (student) => {
  try {
    if (!student?._id) {
      alert("Student information is missing.");
      return;
    }

    const response =
      await getStudentPayments(student._id);

    const data =
      response?.data?.data;

    const payments =
      Array.isArray(data?.payments)
        ? data.payments
        : Array.isArray(response?.data?.payments)
        ? response.data.payments
        : [];

    const verifiedPayments =
      payments.filter(
        (payment) =>
          payment.status === "Verified"
      );

    if (!verifiedPayments.length) {
      alert(
        "No verified payment receipt is available for this student."
      );
      return;
    }

    const latestPayment =
      [...verifiedPayments].sort(
        (a, b) =>
          new Date(
            b.payment_date || 0
          ).getTime() -
          new Date(
            a.payment_date || 0
          ).getTime()
      )[0];

    await generatePaymentReceipt(
      latestPayment,
      verifiedPayments
    );
  } catch (error) {
    console.error(
      "Receipt download error:",
      error
    );

    alert(
      error?.response?.data?.message ||
        error?.message ||
        "Unable to download receipt."
    );
  }
};


  return (
    <div className="student-table-wrapper">
      <table className="student-table">
        <thead>
          <tr>
            <th
              onClick={() =>
                onSort("rollNo")
              }
            >
              Roll No
              {renderSortIcon(
                "rollNo"
              )}
            </th>

            <th
              onClick={() =>
                onSort("firstName")
              }
            >
              Student
              {renderSortIcon(
                "firstName"
              )}
            </th>

            <th>Father Name</th>

            <th>Mobile</th>

            <th>Email</th>

            <th>Course</th>

            <th>Batch</th>

            <th
              onClick={() =>
                onSort("status")
              }
            >
              Status
              {renderSortIcon(
                "status"
              )}
            </th>

            <th>Actions</th>
          </tr>
        </thead>

        <tbody>
          {students.length === 0 ? (
            <tr>
              <td
                colSpan="9"
                className="student-table-empty"
              >
                No students found.
              </td>
            </tr>
          ) : (
            students.map(
              (student) => (
                <tr
                  key={student._id}
                >
                  <td>
                    <span className="student-roll">
                      {student.rollNo}
                    </span>
                  </td>

                  <td>
                    <div className="student-name-cell">
                      {/* {student.profileImage ? (
                        // <img
                        //   src={
                        //     student.profileImage
                        //   }
                        //   alt={
                        //     student.firstName
                        //   }
                        //   className="student-avatar"
                        // />
                        <img
                            src={getAssetUrl(student.profileImage)}
                            alt={`${student.firstName} ${student.surname || ""}`}
                            className="student-avatar"
                            onError={(event) => {
                                event.currentTarget.style.display = "none";
                                event.currentTarget.nextElementSibling?.classList.remove(
                                "student-avatar-fallback-hidden"
                                );
                            }}
                        />
                      ) : (
                        <div className="student-avatar student-avatar-placeholder">
                          {student.firstName
                            ?.charAt(0)
                            ?.toUpperCase()}
                        </div>
                      )} */}

                      <div className="student-avatar-wrapper">
                        {student.profileImage ? (
                            <img
                            src={getAssetUrl(student.profileImage)}
                            alt={`${student.firstName} ${student.surname || ""}`}
                            className="student-avatar"
                            onError={(event) => {
                                event.currentTarget.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(
                                `${student.firstName} ${student.surname || ""}`
                                )}&background=2563eb&color=fff`;
                            }}
                            />
                        ) : (
                            <div className="student-avatar student-avatar-placeholder">
                            {(student.firstName || "S").charAt(0).toUpperCase()}
                            </div>
                        )}
                        </div>

                      <div>
                        <strong>
                          {
                            student.firstName
                          }{" "}
                          {
                            student.surname
                          }
                        </strong>

                        <span>
                          {student.gender ||
                            "Gender not set"}
                        </span>
                      </div>
                    </div>
                  </td>

                  <td>
                    {student.fatherName ||
                      "-"}
                  </td>

                  <td>
                    {student.mobile}
                  </td>

                  <td>
                    {student.email ||
                      "-"}
                  </td>

                  <td>
                    {student.course_id?.courseTitle || "-"}
                  </td>

                  <td>
                    {student.batch_id?.batch_name || "-"}
                  </td>

                  <td>
                    <select
                      className={`student-status-select student-status-${student.status}`}
                      value={
                        student.status
                      }
                      onChange={(
                        event
                      ) =>
                        onStatusChange(
                          student,
                          event
                            .target
                            .value
                        )
                      }
                    >
                      <option value="active">
                        Active
                      </option>

                      <option value="inactive">
                        Inactive
                      </option>

                      <option value="suspended">
                        Suspended
                      </option>
                    </select>
                  </td>

                  <td>
                    <div className="student-actions">
                      <button
                        type="button"
                        title="View"
                        onClick={() =>
                          onView(
                            student
                          )
                        }
                      >
                        <FiEye />
                      </button>

                      <button
                        type="button"
                        title="Edit"
                        onClick={() =>
                          onEdit(
                            student
                          )
                        }
                      >
                        <FiEdit2 />
                      </button>

                      {/* <Link
                        to={`/admin/students/${student._id}/payments`}
                        className="student-action-button"
                        title="Payment History"
                      >
                        <FiCreditCard />
                      </Link> */}

                      <Link
                        to={`/admin/students/${student._id}/payments`}
                        className="student-action-button"
                        title="Payment History"
                      >
                        <FiCreditCard />
                      </Link>

                      <button
                        type="button"
                        title="Download Invoice / Receipt"
                        onClick={() => handleDownloadReceipt(student)}
                      >
                        <FiDownload />
                      </button>

                      <button
                        type="button"
                        title="Delete"
                        className="student-delete-action"
                        onClick={() =>
                          onDelete(
                            student
                          )
                        }
                      >
                        <FiTrash2 />
                      </button>
                    </div>
                  </td>
                </tr>
              )
            )
          )}
        </tbody>
      </table>
    </div>
  );
};

export default StudentTable;