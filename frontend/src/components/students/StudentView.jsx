import { useEffect, useState } from "react";
import QRCode from "qrcode";
import {
  FiEdit2,
  FiMail,
  FiMapPin,
  FiPhone,
  FiX,
  FiDownload,
  FiGrid,
} from "react-icons/fi";

import { getAssetUrl } from "../../utils/assetUrl";

const StudentView = ({ student, onEdit, onClose }) => {
  const [qrImage, setQrImage] = useState("");
  const [qrError, setQrError] = useState("");
  const [showQR, setShowQR] = useState(false);
  const [qrLoading, setQrLoading] = useState(false);

  const fullName = [
    student?.firstName,
    student?.surname,
  ]
    .filter(Boolean)
    .join(" ");

  useEffect(() => {
    setQrImage("");
    setQrError("");
    setShowQR(false);
  }, [student?._id]);

  if (!student) return null;

  const generateStudentQR = async () => {
    if (!student?._id) {
      setQrError("Student ID is missing.");
      return;
    }

    setQrLoading(true);
    setQrError("");

    try {
      const qrText = `EMS-STUDENT:${student._id}`;

      const image = await QRCode.toDataURL(qrText, {
        width: 320,
        margin: 2,
        errorCorrectionLevel: "H",
      });

      setQrImage(image);
      setShowQR(true);
    } catch (error) {
      console.error("Student QR generation failed:", error);
      setQrError("Unable to generate this student's QR code.");
    } finally {
      setQrLoading(false);
    }
  };

  const downloadStudentQR = () => {
    if (!qrImage) return;

    const link = document.createElement("a");
    link.href = qrImage;
    link.download = `EMS-Student-${student.rollNo || student._id}-QR.png`;
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  return (
    <div className="student-view-overlay">
      <div className="student-view-modal">
        <div className="student-view-header">
          <div>
            <span>Student Details</span>
            <h2>{fullName}</h2>
            <small>{student.rollNo || "No roll number"}</small>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="student-close-button"
            aria-label="Close student details"
            title="Close"
          >
            <FiX size={22} />
          </button>
        </div>

        <div className="student-view-body">
          <div className="student-profile-summary">
            <div className="student-view-profile-image">
              {student.profileImage ? (
                <img
                  src={getAssetUrl(student.profileImage)}
                  alt={fullName}
                  onError={(event) => {
                    event.currentTarget.style.display = "none";
                  }}
                />
              ) : (
                <div className="student-view-profile-placeholder">
                  {(student.firstName || "S").charAt(0).toUpperCase()}
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
              <span>Father/Husband Name</span>
              <strong>{student.fatherName || "-"}</strong>
            </div>

            <div>
              <span>Mother Name</span>
              <strong>{student.motherName || "-"}</strong>
            </div>

            <div>
              <span>Date of Birth</span>
              <strong>
                {student.dob
                  ? new Date(student.dob).toLocaleDateString("en-IN")
                  : "-"}
              </strong>
            </div>

            <div>
              <span>Gender</span>
              <strong>{student.gender || "-"}</strong>
            </div>

            <div>
              <span>Mobile</span>
              <strong><FiPhone /> {student.mobile || "-"}</strong>
            </div>

            <div>
              <span>Email</span>
              <strong><FiMail /> {student.email || "-"}</strong>
            </div>

            <div>
              <span>Course</span>
              <strong>{student.course_id?.courseTitle || "-"}</strong>
            </div>

            <div>
              <span>Batch</span>
              <strong>{student.batch_id?.batch_name || "-"}</strong>
            </div>

            <div className="student-detail-full">
              <span>Address</span>
              <strong><FiMapPin /> {student.address || "-"}</strong>
            </div>
          </div>

          <section
            style={{
              marginTop: 22,
              padding: 16,
              border: "1px solid #e5e7eb",
              borderRadius: 8,
              textAlign: "center",
            }}
          >
            <h3 style={{ margin: "0 0 8px", fontSize: 16 }}>
              Student Attendance QR Code
            </h3>

            <p style={{ color: "#6b7280", fontSize: 12, marginBottom: 14 }}>
              Generate this student's QR code for the EMS Attendance Scanner.
            </p>

            {!showQR && (
              <button
                type="button"
                className="student-primary-button"
                onClick={generateStudentQR}
                disabled={qrLoading}
              >
                <FiGrid />
                {qrLoading ? "Generating..." : "Show QR Code"}
              </button>
            )}

            {qrError && (
              <p style={{ color: "#b91c1c", fontSize: 13 }}>
                {qrError}
              </p>
            )}

            {showQR && qrImage && (
              <div>
                <img
                  src={qrImage}
                  alt={`Attendance QR code for ${fullName}`}
                  style={{
                    display: "block",
                    width: 240,
                    height: 240,
                    maxWidth: "100%",
                    margin: "0 auto 12px",
                    imageRendering: "pixelated",
                  }}
                />

                <p style={{ color: "#6b7280", fontSize: 11 }}>
                  Roll No: {student.rollNo || "-"}
                </p>

                <button
                  type="button"
                  className="student-primary-button"
                  onClick={downloadStudentQR}
                  style={{ margin: 6 }}
                >
                  <FiDownload />
                  Download QR Code
                </button>

                <button
                  type="button"
                  className="student-secondary-button"
                  onClick={() => setShowQR(false)}
                  style={{ margin: 6 }}
                >
                  Hide QR Code
                </button>
              </div>
            )}
          </section>
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
            onClick={() => onEdit(student)}
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
