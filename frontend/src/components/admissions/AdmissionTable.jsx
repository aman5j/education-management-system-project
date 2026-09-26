import {
  FiEdit2,
  FiEye,
  FiTrash2,
} from "react-icons/fi";

const formatCurrency = (value) => {
  return new Intl.NumberFormat(
    "en-IN",
    {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
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

const AdmissionTable = ({
  admissions,
  onView,
  onEdit,
  onDelete,
  onStatusChange,
}) => {
  if (!admissions.length) {
    return (
      <div className="admission-empty">
        No admissions found.
      </div>
    );
  }

  return (
    <div className="admission-table-wrapper">
      <table className="admission-table">
        <thead>
          <tr>
            <th>ROLL NO</th>
            <th>STUDENT</th>
            <th>COURSE</th>
            <th>BATCH</th>
            <th>FEE</th>
            <th>FINAL AMOUNT</th>
            <th>ADMISSION DATE</th>
            <th>STATUS</th>
            <th>ACTIONS</th>
          </tr>
        </thead>

        <tbody>
          {admissions.map((admission) => {
            const student =
              admission.student;

            const studentName = [
              student?.firstName,
              student?.surname,
            ]
              .filter(Boolean)
              .join(" ");

            return (
              <tr key={admission._id}>
                <td>
                  <span className="admission-roll">
                    {admission.rollNo}
                  </span>
                </td>

                <td>
                  <div className="admission-student">
                    <div className="admission-student-avatar">
                      {(
                        student?.firstName ||
                        "S"
                      )
                        .charAt(0)
                        .toUpperCase()}
                    </div>

                    <div>
                      <strong>
                        {studentName ||
                          "Unknown Student"}
                      </strong>

                      <small>
                        {student?.mobile ||
                          "-"}
                      </small>
                    </div>
                  </div>
                </td>

                <td>
                  {admission.course ||
                    "-"}
                </td>

                <td>
                  {admission.batch ||
                    "-"}
                </td>

                <td>
                  {formatCurrency(
                    admission.courseFee
                  )}
                </td>

                <td>
                  <strong>
                    {formatCurrency(
                      admission.finalAmount
                    )}
                  </strong>
                </td>

                <td>
                  {formatDate(
                    admission.admissionDate
                  )}
                </td>

                <td>
                  <select
                    className={`admission-status-select admission-status-${admission.status}`}
                    value={
                      admission.status
                    }
                    onChange={(event) =>
                      onStatusChange(
                        admission._id,
                        event.target.value
                      )
                    }
                  >
                    <option value="active">
                      Active
                    </option>

                    <option value="inactive">
                      Inactive
                    </option>

                    <option value="cancelled">
                      Cancelled
                    </option>
                  </select>
                </td>

                <td>
                  <div className="admission-actions">
                    <button
                      type="button"
                      title="View"
                      onClick={() =>
                        onView(admission)
                      }
                    >
                      <FiEye />
                    </button>

                    <button
                      type="button"
                      title="Edit"
                      onClick={() =>
                        onEdit(admission)
                      }
                    >
                      <FiEdit2 />
                    </button>

                    <button
                      type="button"
                      title="Delete"
                      className="danger"
                      onClick={() =>
                        onDelete(admission)
                      }
                    >
                      <FiTrash2 />
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

export default AdmissionTable;