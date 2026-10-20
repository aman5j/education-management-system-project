import {
  FiDownload,
  FiEdit2,
  FiEye,
  FiFileText,
  FiTrash2,
  FiCreditCard,
} from "react-icons/fi";

import { Link } from "react-router-dom";
import { IoIosCall } from "react-icons/io";

import { MdOutgoingMail } from "react-icons/md";
import { MdDateRange } from "react-icons/md";



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
  canUpdateStudent = false,
  canDeleteStudent = false,
  canManageDocuments = false,
  canViewPayments = false,
  
  students,
  onView,
  onEdit,
  onDelete,
  onStatusChange,
  onDocuments,
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
    <div className="common-table-wrapper">
      <table className="common-table">
        <thead>
          <tr>
            

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

           

            <th>Contact</th>

           

            {/* <th>Course</th> */}

            <th>Create</th>

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
                    <div className="student-name-cell">
                     

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
                        {student.fatherName ||
                      "Father Name -"}

                        {/* <span>
                          {student.gender ||
                            "Gender not set"}
                        </span> */}
                           {student.signature ? (
  <img
    src={getAssetUrl(student.signature)}
    alt="Student Signature" height="20px"
    className="student-signature"
    onError={(event) => {
      event.currentTarget.style.display = "none";
    }}
  />
) : (
  <span className="signature-not-available">
    No Signature
  </span>
)}

                      </div>
                    </div>
                  </td>
                    <td>
                    <span className="student-roll">
                      {student.rollNo}
                    </span>
                  </td>

                  <td>
                    <div className="contact-details">
                     <div className="contact-li"> <IoIosCall />  <span>{student.mobile}</span></div>
                    <div className="contact-li"> <MdOutgoingMail /> <span>{student.email || "-"}</span></div>
                    </div>
                  </td>

                  <td>

                     <div className="contact-details">
                     <div className="contact-li"><MdDateRange />  <span>{student.createdAt
  ? new Date(student.createdAt).toLocaleDateString("en-GB")
  : "-"}</span></div>
                    
                    </div>

                    

 
                  </td>

                  <td>
                    {canUpdateStudent ? (
                    // Keep your existing status <select> here.
                    // Do not change its options or onChange handler.
                    <select
                      className={`dropdown-status status-${student.status}`}
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

                    ) : (
                      <span>{student.status}</span>
                    )}
                  </td>

                  <td>
                    <div className="student-actions">
                      <button className="tooltip" data-tooltip="View Student"
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


                      {/* DOCUMENTS */}

                      {canUpdateStudent && (
                        <button
                          type="button"
                          title="Edit"
                          onClick={() => onEdit(student)}
                        >
                          <FiEdit2 />
                        </button>
                      )}

                      {canManageDocuments && (
                      // Keep the existing Manage Documents button here.
                      <button
                        type="button" 
                        title="Manage Documents"
                        className="tooltip student-document-table-action" data-tooltip="Upload Document"
                        onClick={() =>
                          onDocuments?.(student)
                        }
                      >
                        <FiFileText />

                        {Array.isArray(
                          student.uploadDocument
                        ) &&
                          student.uploadDocument.length >
                            0 && (
                            <span className="student-document-count">
                              {
                                student.uploadDocument.length
                              }
                            </span>
                          )}
                      </button>
                      )}

                      {/* <Link
                        to={`/admin/students/${student._id}/payments`}
                        className="student-action-button"
                        title="Payment History"
                      >
                        <FiCreditCard />
                      </Link> */}

                      {canViewPayments && (
                      // Keep the existing Payment History <Link> here.
                      <Link
                        to={`/admin/students/${student._id}/payments`}
                        
                        className="tooltip student-action-button" data-tooltip="Payment History"
                        
                      >
                        <FiCreditCard />
                      </Link>
                      )}

                      
                      {canViewPayments && (
                        <button
                          className="tooltip"
                          data-tooltip="Download Fees Receipt"
                          type="button"
                          onClick={() => handleDownloadReceipt(student)}
                        >
                          <FiDownload />
                        </button>
                      )}


                      {canDeleteStudent && (
                        <button
                          type="button"
                          title="Delete"
                          className="student-delete-action"
                          onClick={() => onDelete(student)}
                        >
                          <FiTrash2 />
                        </button>
                      )}

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