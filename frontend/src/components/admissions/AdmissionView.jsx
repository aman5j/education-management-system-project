import { FiX } from "react-icons/fi";

const formatCurrency = (value) => {
  return new Intl.NumberFormat(
    "en-IN",
    {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 2,
    }
  ).format(Number(value) || 0);
};

const formatDate = (value) => {
  if (!value) {
    return "-";
  }

  return new Date(value).toLocaleDateString(
    "en-IN",
    {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }
  );
};

const AdmissionView = ({
  admission,
  onClose,
}) => {
  if (!admission) {
    return null;
  }

  const student =
    admission.student;

  const studentName = [
    student?.firstName,
    student?.surname,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div
      className="admission-modal-overlay"
      onMouseDown={(event) => {
        if (
          event.target ===
          event.currentTarget
        ) {
          onClose();
        }
      }}
    >
      <div className="admission-view-modal">
        <div className="admission-modal-header">
          <div>
            <span>
              ADMISSION DETAILS
            </span>

            <h2>
              {studentName ||
                "Student Admission"}
            </h2>

            <small>
              {admission.rollNo}
            </small>
          </div>

          <button
            type="button"
            onClick={onClose}
          >
            <FiX />
          </button>
        </div>

        <div className="admission-view-body">
          <section>
            <h3>
              Student Information
            </h3>

            <div className="admission-details-grid">
              <div>
                <span>
                  Student
                </span>

                <strong>
                  {studentName ||
                    "-"}
                </strong>
              </div>

              <div>
                <span>
                  Roll Number
                </span>

                <strong>
                  {admission.rollNo ||
                    "-"}
                </strong>
              </div>

              <div>
                <span>
                  Mobile
                </span>

                <strong>
                  {student?.mobile ||
                    "-"}
                </strong>
              </div>

              <div>
                <span>
                  Email
                </span>

                <strong>
                  {student?.email ||
                    "-"}
                </strong>
              </div>
            </div>
          </section>

          <section>
            <h3>
              Course Information
            </h3>

            <div className="admission-details-grid">
              <div>
                <span>
                  Course Type
                </span>

                <strong>
                  {admission.courseType ||
                    "-"}
                </strong>
              </div>

              <div>
                <span>
                  Course
                </span>

                <strong>
                  {admission.course ||
                    "-"}
                </strong>
              </div>

              <div>
                <span>
                  Batch
                </span>

                <strong>
                  {admission.batch ||
                    "-"}
                </strong>
              </div>

              <div>
                <span>
                  Available Seats
                </span>

                <strong>
                  {admission.availableSeats ??
                    0}
                </strong>
              </div>
            </div>
          </section>

          <section>
            <h3>
              Fee Summary
            </h3>

            <div className="admission-fee-summary">
              <div>
                <span>
                  Course Fee
                </span>

                <strong>
                  {formatCurrency(
                    admission.courseFee
                  )}
                </strong>
              </div>

              <div>
                <span>
                  Discount
                </span>

                <strong>
                  -{" "}
                  {formatCurrency(
                    admission.discountAmount
                  )}
                </strong>
              </div>

              <div>
                <span>
                  GST
                </span>

                <strong>
                  +{" "}
                  {formatCurrency(
                    admission.gstAmount
                  )}
                </strong>
              </div>

              <div>
                <span>
                  Admission Fee
                </span>

                <strong>
                  +{" "}
                  {formatCurrency(
                    admission.admissionFee
                  )}
                </strong>
              </div>

              <div className="final">
                <span>
                  Final Amount
                </span>

                <strong>
                  {formatCurrency(
                    admission.finalAmount
                  )}
                </strong>
              </div>
            </div>
          </section>

          <section>
            <h3>
              Admission Details
            </h3>

            <div className="admission-details-grid">
              <div>
                <span>
                  Admission Date
                </span>

                <strong>
                  {formatDate(
                    admission.admissionDate
                  )}
                </strong>
              </div>

              <div>
                <span>
                  Referral By
                </span>

                <strong>
                  {admission.referralBy ||
                    "-"}
                </strong>
              </div>

              <div>
                <span>
                  Status
                </span>

                <strong>
                  {admission.status}
                </strong>
              </div>

              <div>
                <span>
                  Remark
                </span>

                <strong>
                  {admission.remark ||
                    "-"}
                </strong>
              </div>
            </div>
          </section>
        </div>

        <div className="admission-modal-footer">
          <button
            type="button"
            onClick={onClose}
            className="admission-secondary-button"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default AdmissionView;