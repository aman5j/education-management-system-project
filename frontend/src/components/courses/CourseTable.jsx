
import React from "react";
import { Link } from "react-router-dom";
import { getAssetUrl } from "../../utils/assetUrl";
import { FiEdit2, FiEye, FiTrash2 } from "react-icons/fi";

const CourseTable = ({
  courses = [],
  basePath = "/admin/courses",
  canUpdate = false,
  canDelete = false,
  onDelete,
  onStatusChange,
}) => {
  if (!courses.length) {
    return <div className="course-empty">No courses found.</div>;
  }

  return (
    <div className="common-table-wrapper">
      <table className="common-table">
        <thead>
          <tr>
            {/* <th>#</th> */}
            <th>Image</th>
            <th>Course</th>
            <th>Category</th>
            <th>MRP</th>
            <th>Price</th>
            <th>Duration</th>
            <th>Lectures</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>

        <tbody>
          {courses.map((course, index) => (
            <tr key={course._id}>
              {/* <td>{index + 1}</td> */}

              <td>
                {course.courseImage ? (
                  <img
                    src={getAssetUrl(course.courseImage)}
                    alt={course.courseTitle}
                    className="student-avatar"
                  />
                ) : (
                  <div className="student-avatar student-avatar-placeholder">
                    No Image
                  </div>
                )}
              </td>

              <td >
                <div className="student-name-cell">
                <strong>{course.courseTitle}</strong>
                 {course.popular && (
                  <label className="course-mini-badge">Popular</label>
                )}
                </div>
                <span className={`online ${course.courseType || ""}`}>
                      {course.courseType || "-"}
                </span>
               
              </td>

            

              <td>{course.courseCategory || "-"}</td>

              <td>
                <span className="tag-purple">₹{Number(course.mrp || 0).toLocaleString("en-IN")}</span>
              </td>

              <td>
                <span className="tag-success">₹{Number(course.price || 0).toLocaleString("en-IN")}</span>
              </td>

              <td>
                {course.duration} {course.durationUnit}
              </td>

              <td>{course.totalLectures}</td>

              <td>
                {canUpdate ? (
                  <select
                    className={`course-status-select status-${(
                      course.status || "draft"
                    ).toLowerCase()}`}
                    value={course.status}
                    onChange={(event) =>
                      onStatusChange(course._id, event.target.value)
                    }
                    aria-label={`Change status for ${course.courseTitle}`}
                  >
                    <option value="Published">Published</option>
                    <option value="Draft">Draft</option>
                    <option value="Archived">Archived</option>
                  </select>
                ) : (
                  <span>{course.status || "Draft"}</span>
                )}
              </td>

              <td>
                <div className="admission-actions">
                  <Link
                    to={`${basePath}/${course._id}`}
                    data-tooltip="View" className="tooltip"
                  >
                    <FiEye />
                  </Link>

                  {canUpdate && (
                    <Link
                      to={`${basePath}/${course._id}/edit`}
                      data-tooltip="Edit" className="tooltip"
                    >
                        <FiEdit2 />
                    </Link>
                  )}

                  {canDelete && (
                    <button
                      type="button"
                     data-tooltip="Delete" className="tooltip"
                      onClick={() => onDelete(course._id)}
                    >
                       <FiTrash2 />
                    </button>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default CourseTable;
