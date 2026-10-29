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
    <div className="common-table-wrapper">
      <table className="common-table">
        <thead>
          <tr>
            {/* <th>S. No.</th> */}
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
                {/* <td>{index + 1}</td> */}
                <td>
                 <strong className="tabletitle"> {subject.subjectName || "—"}</strong>
                   
                 
                </td>
                <td>
                  <span className="batchtag">
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
                  <div className="admission-actions">

                    {canViewQuestionBank && (
                    <button
                      type="button"
                      className="tooltip" data-tooltip="Manage Question Bank"
                      onClick={() => onQuestionBank?.(id)}
                      disabled={!id}
                     
                      aria-label={`Manage Question Bank for ${subject.subjectName}`}
                    >
                      <FiList />
                    </button>
                    )}

                    {canView && (
                    <button
                      type="button"
                     className="tooltip" data-tooltip="View subject"
                      onClick={() => onView?.(id)}
                      disabled={!id}
                   
                      aria-label="View subject"
                    >
                      <FiEye />
                    </button>
                    )}

                    {canUpdate && (
                    <button
                      type="button"
                     className="tooltip" data-tooltip="Edit subject"
                      onClick={() => onEdit?.(id)}
                      disabled={!id}
                     
                      aria-label="Edit subject"
                    >
                      <FiEdit2 />
                    </button>
                    )}

                    {canDelete && (
                    <button
                      type="button"
                     className="tooltip" data-tooltip="Delete subject"
                      onClick={() => onDelete?.(subject)}
                      disabled={!id}
                     
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
