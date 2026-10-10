
import {
  FiEye,
  FiEdit2,
  FiTrash2,
  FiBookOpen,
} from "react-icons/fi";

const getCourseName = (subject) => {
  const course =
    subject?.course_id ||
    subject?.course ||
    subject?.courseId;

  if (!course) return "—";

  // A populated course relation is an object.
  if (typeof course === "object") {
    return (
      course.courseTitle ||
      course.courseName ||
      course.name ||
      course.title ||
      course.course_name ||
      course.code ||
      "—"
    );
  }

  // A raw ObjectId alone does not contain a display name.
  return "—";
};

export default function SubjectTable({
  subjects = [],
  loading = false,
  onView,
  onEdit,
  onDelete,
}) {
  if (loading) {
    return (
      <div
        className="subject-empty-state"
        role="status"
        aria-live="polite"
      >
        <div className="subject-spinner" />
        <p>Loading subjects...</p>
      </div>
    );
  }

  if (!subjects.length) {
    return (
      <div className="subject-empty-state">
        <FiBookOpen
          className="subject-empty-icon"
          aria-hidden="true"
        />
        <h3>No subjects found</h3>
        <p>Add a subject or change your search filters.</p>
      </div>
    );
  }

  return (
    <div className="subject-table-wrapper">
      <table className="subject-table">
        <thead>
          <tr>
            <th scope="col">S. No.</th>
            <th scope="col">Subject Name</th>
            <th scope="col">Subject Code</th>
            <th scope="col">Course</th>
            <th scope="col">Description</th>
            <th scope="col">Status</th>
            <th scope="col">Actions</th>
          </tr>
        </thead>

        <tbody>
          {subjects.map((subject, index) => {
            const subjectId = subject._id || subject.id;
            const isActive = subject.status === "Active";

            return (
              <tr key={subjectId || `${subject.subjectCode}-${index}`}>
                <td>{index + 1}</td>

                <td>
                  <span className="subject-table-name">
                    {subject.subjectName || "—"}
                  </span>
                </td>

                <td>
                  <span className="subject-table-code">
                    {subject.subjectCode || "—"}
                  </span>
                </td>

                <td>{getCourseName(subject)}</td>

                <td>
                  <span
                    className="subject-table-description"
                    title={subject.description || ""}
                  >
                    {subject.description || "—"}
                  </span>
                </td>

                <td>
                  <span
                    className={`subject-status-badge ${
                      isActive
                        ? "subject-status-active"
                        : "subject-status-inactive"
                    }`}
                  >
                    {subject.status || "Inactive"}
                  </span>
                </td>

                <td>
                  <div className="subject-actions">
                    <button
                      type="button"
                      className="subject-action-view"
                      onClick={() => onView?.(subjectId)}
                      disabled={!subjectId}
                      title="View subject"
                      aria-label={`View ${subject.subjectName || "subject"}`}
                    >
                      <FiEye />
                    </button>

                    <button
                      type="button"
                      className="subject-action-edit"
                      onClick={() => onEdit?.(subjectId)}
                      disabled={!subjectId}
                      title="Edit subject"
                      aria-label={`Edit ${subject.subjectName || "subject"}`}
                    >
                      <FiEdit2 />
                    </button>

                    <button
                      type="button"
                      className="subject-action-delete"
                      onClick={() => onDelete?.(subject)}
                      disabled={!subjectId}
                      title="Delete subject"
                      aria-label={`Delete ${subject.subjectName || "subject"}`}
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
}
