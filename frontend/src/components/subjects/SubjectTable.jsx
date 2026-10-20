import { FiEye, FiEdit2, FiTrash2, FiBookOpen, FiList } from "react-icons/fi";

export default function SubjectTable({
  subjects = [],
  loading = false,
  onView,
  onEdit,
  onDelete,
  onQuestionBank,

  canView = false,
  canUpdate = false,
  canDelete = false,
  canViewQuestionBank = false,
  canManageQuestionBank = false,
}) {
  if (loading) {
    return (
      <div className="subject-empty-state" role="status">
        <div className="subject-spinner" />
        <p>Loading subjects...</p>
      </div>
    );
  }

  if (!subjects.length) {
    return (
      <div className="subject-empty-state">
        <FiBookOpen className="subject-empty-icon" aria-hidden="true" />
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
            <th>S. No.</th>
            <th>Subject Name</th>
            <th>Subject Code</th>
            <th>Description</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>

        <tbody>
          {subjects.map((subject, index) => {
            const id = subject._id || subject.id;
            const active = subject.status === "Active";

            return (
              <tr key={id || `${subject.subjectCode}-${index}`}>
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
                      active
                        ? "subject-status-active"
                        : "subject-status-inactive"
                    }`}
                  >
                    {subject.status || "Inactive"}
                  </span>
                </td>
                <td>
                  <div className="subject-actions">

                    {canViewQuestionBank && (
                    <button
                      type="button"
                      className="subject-action-view"
                      onClick={() => onQuestionBank?.(id)}
                      disabled={!id}
                      title="Manage Question Bank"
                      aria-label={`Manage Question Bank for ${subject.subjectName}`}
                    >
                      <FiList />
                    </button>
                    )}

                    {canView && (
                    <button
                      type="button"
                      className="subject-action-view"
                      onClick={() => onView?.(id)}
                      disabled={!id}
                      title="View subject"
                      aria-label="View subject"
                    >
                      <FiEye />
                    </button>
                    )}

                    {canUpdate && (
                    <button
                      type="button"
                      className="subject-action-edit"
                      onClick={() => onEdit?.(id)}
                      disabled={!id}
                      title="Edit subject"
                      aria-label="Edit subject"
                    >
                      <FiEdit2 />
                    </button>
                    )}

                    {canDelete && (
                    <button
                      type="button"
                      className="subject-action-delete"
                      onClick={() => onDelete?.(subject)}
                      disabled={!id}
                      title="Delete subject"
                      aria-label="Delete subject"
                    >
                      <FiTrash2 />
                    </button>
                    )}

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
