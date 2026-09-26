import {
  FiEdit2,
  FiMail,
  FiMapPin,
  FiPhone,
  FiUser,
} from "react-icons/fi";

import { getAssetUrl } from "../../utils/assetUrl";

const StudentView = ({
  student,
  onEdit,
  onClose,
}) => {
  if (!student) {
    return null;
  }

  const fullName = [
    student.firstName,
    student.surname,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className="student-view-overlay">
      <div className="student-view-modal">
        <div className="student-view-header">
          <div>
            <span>
              Student Details
            </span>

            <h2>{fullName}</h2>

            <small>
              {student.rollNo}
            </small>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="student-close-button"
          >
            ×
          </button>
        </div>

        <div className="student-view-body">
          <div className="student-profile-summary">
            {/* {student.profileImage ? (
              <img
                src={
                  student.profileImage
                }
                alt={fullName}
                className="student-profile-large"
              />
            ) : (
              <div className="student-profile-large student-avatar-placeholder">
                {student.firstName
                  ?.charAt(0)
                  ?.toUpperCase()}
              </div>
            )} */}

            <div className="student-view-profile-image">
                {student?.profileImage ? (
                    <img
                    src={getAssetUrl(student.profileImage)}
                    alt={`${student.firstName} ${student.surname || ""}`}
                    onError={(event) => {
                        event.currentTarget.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(
                        `${student.firstName} ${student.surname || ""}`
                        )}&background=2563eb&color=fff`;
                    }}
                    />
                ) : (
                    <div className="student-view-profile-placeholder">
                    {(student?.firstName || "S").charAt(0).toUpperCase()}
                    </div>
                )}
                </div>

            <div>
              <h3>{fullName}</h3>

              <span
                className={`student-view-status student-view-status-${student.status}`}
              >
                {student.status}
              </span>
            </div>
          </div>

          <div className="student-details-grid">
            <div>
              <span>
                Father/Husband Name
              </span>

              <strong>
                {student.fatherName ||
                  "-"}
              </strong>
            </div>

            <div>
              <span>
                Mother Name
              </span>

              <strong>
                {student.motherName ||
                  "-"}
              </strong>
            </div>

            <div>
              <span>
                Date of Birth
              </span>

              <strong>
                {student.dob
                  ? new Date(
                      student.dob
                    ).toLocaleDateString(
                      "en-IN"
                    )
                  : "-"}
              </strong>
            </div>

            <div>
              <span>
                Gender
              </span>

              <strong>
                {student.gender ||
                  "-"}
              </strong>
            </div>

            <div>
              <span>
                Mobile
              </span>

              <strong>
                <FiPhone />
                {student.mobile ||
                  "-"}
              </strong>
            </div>

            <div>
              <span>
                Email
              </span>

              <strong>
                <FiMail />
                {student.email ||
                  "-"}
              </strong>
            </div>

            <div>
              <span>
                Course
              </span>

              <strong>
                {student.course ||
                  "-"}
              </strong>
            </div>

            <div>
              <span>
                Batch
              </span>

              <strong>
                {student.batch ||
                  "-"}
              </strong>
            </div>

            <div className="student-detail-full">
              <span>
                Address
              </span>

              <strong>
                <FiMapPin />
                {student.address ||
                  "-"}
              </strong>
            </div>
          </div>
        </div>

        <div className="student-view-footer">
          <button
            type="button"
            className="student-secondary-button"
            onClick={onClose}
          >
            Close
          </button>

          <button
            type="button"
            className="student-primary-button"
            onClick={() =>
              onEdit(student)
            }
          >
            <FiEdit2 />
            Edit Student
          </button>
        </div>
      </div>
    </div>
  );
};

export default StudentView;