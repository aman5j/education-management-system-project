import React from "react";
import { Link } from "react-router-dom";

import { getAssetUrl } from "../../utils/assetUrl";

const CourseTable = ({
  courses,
  onDelete,
  onStatusChange,
}) => {
  if (!courses.length) {
    return (
      <div className="course-empty">
        No courses found.
      </div>
    );
  }

  return (
    <div className="course-table-wrapper">
      <table className="course-table">
        <thead>
          <tr>
            <th>#</th>
            <th>Image</th>
            <th>Course</th>
            <th>Type</th>
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
              <td>{index + 1}</td>

              <td>
                {course.courseImage ? (
                  <img
                    src={getAssetUrl(course.courseImage)}
                    alt={course.courseTitle}
                    className="course-thumb"
                  />
                ) : (
                  <div className="course-thumb-placeholder">
                    No Image
                  </div>
                )}
              </td>

              <td>
                <strong>{course.courseTitle}</strong>

                {course.popular && (
                  <span className="course-mini-badge">
                    Popular
                  </span>
                )}
              </td>

              <td>{course.courseType || "-"}</td>

              <td>{course.courseCategory || "-"}</td>

              <td>
                ₹{Number(course.mrp || 0).toLocaleString("en-IN")}
              </td>

              <td>
                ₹{Number(course.price || 0).toLocaleString("en-IN")}
              </td>

              <td>
                {course.duration} {course.durationUnit}
              </td>

              <td>{course.totalLectures}</td>

              <td>
                <select
                  className={`course-status-select status-${course.status.toLowerCase()}`}
                  value={course.status}
                  onChange={(e) =>
                    onStatusChange(
                      course._id,
                      e.target.value
                    )
                  }
                >
                  <option value="Published">
                    Published
                  </option>
                  <option value="Draft">Draft</option>
                  <option value="Archived">
                    Archived
                  </option>
                </select>
              </td>

              <td>
                <div className="course-actions">
                  <Link
                    to={`/admin/courses/${course._id}`}
                    className="course-action view"
                  >
                    View
                  </Link>

                  <Link
                    to={`/admin/courses/${course._id}/edit`}
                    className="course-action edit"
                  >
                    Edit
                  </Link>

                  <button
                    type="button"
                    className="course-action delete"
                    onClick={() =>
                      onDelete(course._id)
                    }
                  >
                    Delete
                  </button>
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