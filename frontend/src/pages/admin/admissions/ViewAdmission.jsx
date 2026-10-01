import {
  useEffect,
  useState,
} from "react";

import {
  Link,
  useNavigate,
  useParams,
} from "react-router-dom";

import {
  getAdmission,
} from "../../../services/admissionService";

const money = (value) =>
  `₹${Number(
    value || 0
  ).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

const formatDate = (
  value
) => {
  if (!value) {
    return "—";
  }

  return new Date(
    value
  ).toLocaleDateString(
    "en-IN"
  );
};

const ViewAdmission = () => {
  const { id } =
    useParams();

  const navigate =
    useNavigate();

  const [admission, setAdmission] =
    useState(null);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  useEffect(() => {
    const loadAdmission =
      async () => {
        try {
          const response =
            await getAdmission(id);

          setAdmission(
            response?.data?.data
          );
        } catch (loadError) {
          console.error(
            loadError
          );

          setError(
            loadError?.response
              ?.data?.message ||
              "Unable to load admission."
          );
        } finally {
          setLoading(false);
        }
      };

    loadAdmission();
  }, [id]);

  if (loading) {
    return (
      <div className="admission-state">
        Loading admission...
      </div>
    );
  }

  if (error) {
    return (
      <div className="admission-error">
        {error}
      </div>
    );
  }

  if (!admission) {
    return (
      <div className="admission-empty">
        Admission not found.
      </div>
    );
  }

  const student =
    admission.student_id;

  const course =
    admission.course_id;

  const batch =
    admission.batch_id;

  const remaining =
    Math.max(
      0,
      Number(
        admission.final_amount || 0
      ) -
        Number(
          admission.paid_amount || 0
        )
    );

  return (
    <div className="admission-page">
      <div className="admission-page-header">
        <div>
          <h1>
            Admission Details
          </h1>

          <p>
            View complete admission
            information.
          </p>
        </div>

        <div className="admission-header-actions">
          <Link
            to={`/admin/admissions/${id}/edit`}
            className="admission-primary-button"
          >
            Edit Admission
          </Link>

          <button
            type="button"
            className="admission-secondary-button"
            onClick={() =>
              navigate(
                "/admin/admissions"
              )
            }
          >
            Back
          </button>
        </div>
      </div>

      <div className="admission-view-card">
        <div className="admission-view-section">
          <h3>
            Student Information
          </h3>

          <div className="admission-details-grid">
            <div>
              <span>
                Roll No
              </span>

              <strong>
                {student?.rollNo ||
                  "—"}
              </strong>
            </div>

            <div>
              <span>
                Student Name
              </span>

              <strong>
                {[
                  student?.firstName,
                  student?.surname,
                ]
                  .filter(Boolean)
                  .join(" ") ||
                  "—"}
              </strong>
            </div>

            <div>
              <span>
                Mobile
              </span>

              <strong>
                {student?.mobile ||
                  "—"}
              </strong>
            </div>

            <div>
              <span>
                Email
              </span>

              <strong>
                {student?.email ||
                  "—"}
              </strong>
            </div>
          </div>
        </div>

        <div className="admission-view-section">
          <h3>
            Course Information
          </h3>

          <div className="admission-details-grid">
            <div>
              <span>
                Course
              </span>

              <strong>
                {course?.courseTitle ||
                  "—"}
              </strong>
            </div>

            <div>
              <span>
                Course Type
              </span>

              <strong>
                {admission.course_type ||
                  course?.courseType ||
                  "—"}
              </strong>
            </div>

            <div>
              <span>
                Batch
              </span>

              <strong>
                {batch?.batch_name ||
                  "—"}
              </strong>
            </div>

            <div>
              <span>
                Available Seats
              </span>

              <strong>
                {batch?.available_seats ??
                  "—"}
              </strong>
            </div>
          </div>
        </div>

        <div className="admission-view-section">
          <h3>
            Fee Information
          </h3>

          <div className="admission-details-grid">
            <div>
              <span>
                Course Fee
              </span>

              <strong>
                {money(
                  admission.course_fee
                )}
              </strong>
            </div>

            <div>
              <span>
                Discount
              </span>

              <strong>
                {admission.discount_type ||
                  "Amount"}{" "}
                —{" "}
                {money(
                  admission.discount_value
                )}
              </strong>
            </div>

            <div>
              <span>
                GST
              </span>

              <strong>
                {money(
                  admission.gst_amount
                )}
              </strong>
            </div>

            <div>
              <span>
                Admission Fee
              </span>

              <strong>
                {money(
                  admission.admission_fee
                )}
              </strong>
            </div>

            <div>
              <span>
                Final Amount
              </span>

              <strong className="admission-highlight">
                {money(
                  admission.final_amount
                )}
              </strong>
            </div>

            <div>
              <span>
                Paid Amount
              </span>

              <strong>
                {money(
                  admission.paid_amount
                )}
              </strong>
            </div>

            <div>
              <span>
                Remaining Amount
              </span>

              <strong className="admission-danger-text">
                {money(
                  remaining
                )}
              </strong>
            </div>
          </div>
        </div>

        <div className="admission-view-section">
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
                  admission.admission_date
                )}
              </strong>
            </div>

            <div>
              <span>
                Referral By
              </span>

              <strong>
                {admission.referral_source ||
                  "—"}
              </strong>
            </div>

            <div>
              <span>
                Status
              </span>

              <strong>
                <span
                  className={`admission-status admission-status-${String(
                    admission.status
                  ).toLowerCase()}`}
                >
                  {
                    admission.status
                  }
                </span>
              </strong>
            </div>

            <div className="admission-detail-full">
              <span>
                Remark
              </span>

              <strong>
                {admission.remark ||
                  "—"}
              </strong>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ViewAdmission;