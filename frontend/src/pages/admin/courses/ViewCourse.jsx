import React, {
  useEffect,
  useState,
} from "react";

import {
  Link,
  useLocation,
  useNavigate,
  useParams,
  Navigate,
} from "react-router-dom";
import { useAuth } from "../../../context/AuthContext";
import { hasPermission } from "../../../utils/permissions";


import { getCourse } from "../../../services/courseService";
import { getAssetUrl } from "../../../utils/assetUrl";

const ViewCourse = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();

  const basePath = location.pathname.startsWith("/staff")
    ? "/staff/courses"
    : "/admin/courses";

  const canView = hasPermission(user, "courses.view");
  const canUpdate = hasPermission(user, "courses.update");


  const { id } = useParams();

  const [course, setCourse] =
    useState(null);

  const [loading, setLoading] =
    useState(true);


    useEffect(() => {
    if (authLoading || !canView || !id) {
      setLoading(false);
      return undefined;
    }

    let cancelled = false;

    const loadCourse = async () => {
      try {
        setLoading(true);

        const response = await getCourse(id);

        if (!cancelled) {
          setCourse(response.data?.data ?? null);
        }
      } catch (error) {
        if (!cancelled) {
          setCourse(null);
          console.error("Failed to load course:", error);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    loadCourse();

    return () => {
      cancelled = true;
    };
  }, [id, canView, authLoading]);

  if (authLoading) {
    return <div className="course-page">Checking permissions...</div>;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (!canView) {
    return (
      <div className="course-page">
        <div className="course-list-error" role="alert">
          You do not have permission to view this course.
        </div>

        <Link to={basePath} className="course-primary-btn">
          Back to Courses
        </Link>
      </div>
    );
  }

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

        <div className="course-page-header-actions">
          <Link to={basePath} className="course-primary-btn">
            Back to Courses
          </Link>

          {canUpdate && (
            <button
              type="button"
              className="course-primary-btn"
              onClick={() => navigate(`${basePath}/${id}/edit`)}
            >
              Edit Course
            </button>
          )}
        </div>


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

          </div>
        </div>

        {/* <div className="course-view-section">
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
        </div> */}

        <div className="course-view-section">
          <h2>Description</h2>
          <div
            dangerouslySetInnerHTML={{
              __html: course.description || "-",
            }}
          />
        </div>

        <div className="course-view-section">
          <h2>Syllabus</h2>
          <div
            dangerouslySetInnerHTML={{
              __html: course.syllabus || "-",
            }}
          />
        </div>

        <div className="course-view-section">
          <h2>Eligibility</h2>
          <div
            dangerouslySetInnerHTML={{
              __html: course.eligibility || "-",
            }}
          />
        </div>

      </div>
    </div>
  );
};

export default ViewCourse;