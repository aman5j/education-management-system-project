import React, {
  useEffect,
  useState,
} from "react";

import {
  Link,
  useParams,
} from "react-router-dom";

import { getCourse } from "../../../services/courseService";
import { getAssetUrl } from "../../../utils/assetUrl";

const ViewCourse = () => {
  const { id } = useParams();

  const [course, setCourse] =
    useState(null);

  const [loading, setLoading] =
    useState(true);

  useEffect(() => {
    const loadCourse = async () => {
      try {
        const response =
          await getCourse(id);

        setCourse(response.data.data);
      } catch (error) {
        console.error(
          "Failed to load course:",
          error
        );
      } finally {
        setLoading(false);
      }
    };

    loadCourse();
  }, [id]);

  if (loading) {
    return (
      <div className="course-page">
        <div className="course-loading">
          Loading course...
        </div>
      </div>
    );
  }

  if (!course) {
    return (
      <div className="course-page">
        <div className="course-empty">
          Course not found.
        </div>
      </div>
    );
  }

  return (
    <div className="course-page">
      <div className="course-page-header">
        <div>
          <h1>{course.courseTitle}</h1>
          <p>Course Details</p>
        </div>

        <Link
          to={`/admin/courses/${course._id}/edit`}
          className="course-primary-btn"
        >
          Edit Course
        </Link>
      </div>

      <div className="course-card">
        <div className="course-view-grid">
          <div>
            {course.courseImage ? (
              <img
                src={getAssetUrl(course.courseImage)}
                alt={course.courseTitle}
                className="course-view-image"
              />
            ) : (
              <div className="course-view-no-image">
                No Image
              </div>
            )}
          </div>

          <div className="course-view-details">
            <div>
              <span>Course Type</span>
              <strong>
                {course.courseType || "-"}
              </strong>
            </div>

            <div>
              <span>Category</span>
              <strong>
                {course.courseCategory || "-"}
              </strong>
            </div>

            <div>
              <span>MRP</span>
              <strong>
                ₹
                {Number(
                  course.mrp || 0
                ).toLocaleString("en-IN")}
              </strong>
            </div>

            <div>
              <span>Price</span>
              <strong>
                ₹
                {Number(
                  course.price || 0
                ).toLocaleString("en-IN")}
              </strong>
            </div>

            <div>
              <span>Duration</span>
              <strong>
                {course.duration}{" "}
                {course.durationUnit}
              </strong>
            </div>

            <div>
              <span>Total Lectures</span>
              <strong>
                {course.totalLectures}
              </strong>
            </div>

            <div>
              <span>Status</span>
              <strong>
                {course.status}
              </strong>
            </div>

            <div>
              <span>Certificate</span>
              <strong>
                {course.certificateDiploma ||
                  "-"}
              </strong>
            </div>
          </div>
        </div>

        <div className="course-view-section">
          <h2>Description</h2>
          <p>
            {course.description || "-"}
          </p>
        </div>

        <div className="course-view-section">
          <h2>Syllabus</h2>
          <p>
            {course.syllabus || "-"}
          </p>
        </div>

        <div className="course-view-section">
          <h2>Eligibility</h2>
          <p>
            {course.eligibility || "-"}
          </p>
        </div>
      </div>
    </div>
  );
};

export default ViewCourse;