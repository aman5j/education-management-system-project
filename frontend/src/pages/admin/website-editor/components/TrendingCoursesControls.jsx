
import { useMemo, useState } from "react";
import {
  FiSearch,
  FiImage,
  FiArrowUp,
  FiArrowDown,
  FiCheckCircle,
  FiInfo,
} from "react-icons/fi";

import { getAssetUrl } from "../../../../utils/assetUrl";

export default function TrendingCoursesControls({
  courses = [],
  selectedCourseIds = [],
  onChange,
}) {
  const [search, setSearch] = useState("");

  const publishedCourses = useMemo(
    () => courses.filter((course) => course.status === "Published"),
    [courses]
  );

  const selectedSet = useMemo(
    () => new Set(selectedCourseIds.map(String)),
    [selectedCourseIds]
  );

  const filteredCourses = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) return courses;

    return courses.filter((course) =>
      [
        course.courseTitle,
        course.courseCategory,
        course.courseType,
      ].some((value) => value?.toLowerCase().includes(query))
    );
  }, [courses, search]);

  const selectedCourses = useMemo(
    () =>
      selectedCourseIds
        .map((id) =>
          publishedCourses.find(
            (course) => String(course._id) === String(id)
          )
        )
        .filter(Boolean),
    [selectedCourseIds, publishedCourses]
  );

  const toggleCourse = (course) => {
    if (course.status !== "Published") return;

    const id = String(course._id);

    if (selectedSet.has(id)) {
      onChange(
        selectedCourseIds.filter(
          (selectedId) => String(selectedId) !== id
        )
      );
      return;
    }

    if (selectedCourseIds.length >= 100) return;

    onChange([...selectedCourseIds, id]);
  };

  const selectAllPublished = () => {
    const nextIds = [
      ...selectedCourseIds.filter((id) =>
        publishedCourses.some(
          (course) => String(course._id) === String(id)
        )
      ),
      ...publishedCourses
        .filter(
          (course) => !selectedSet.has(String(course._id))
        )
        .map((course) => String(course._id)),
    ].slice(0, 100);

    onChange(nextIds);
  };

const moveSelected = (courseId, direction) => {
  const next = [...selectedCourseIds];

  // Find the actual course position by ID, not by the
  // filtered selectedCourses array index.
  const currentIndex = next.findIndex(
    (id) => String(id) === String(courseId)
  );

  if (currentIndex === -1) return;

  const targetIndex = currentIndex + direction;

  if (targetIndex < 0 || targetIndex >= next.length) return;

  [next[currentIndex], next[targetIndex]] = [
    next[targetIndex],
    next[currentIndex],
  ];

  onChange(next);
};

  return (
    <div className="we-trending-controls">
      <div className="we-trending-intro">
        <h4>Explore Top Trending Courses</h4>
        <p>
          Select Published courses to show on the homepage. You can
          change their display order below.
        </p>
      </div>

      <div className="we-trending-stats">
        <div>
          <strong>{courses.length}</strong>
          <span>Total courses</span>
        </div>

        <div>
          <strong>{publishedCourses.length}</strong>
          <span>Published</span>
        </div>

        <div>
          <strong>{selectedCourses.length}</strong>
          <span>Selected</span>
        </div>
      </div>

      <div className="we-trending-search">
        <FiSearch />
        <input
          type="search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search course title or category..."
          aria-label="Search courses"
        />
      </div>

      <div className="we-trending-actions">
        <button
          type="button"
          onClick={selectAllPublished}
          disabled={
            !publishedCourses.length ||
            selectedCourseIds.length >= 100
          }
        >
          <FiCheckCircle />
          Select All Published
        </button>

        <button
          type="button"
          onClick={() => onChange([])}
          disabled={!selectedCourseIds.length}
        >
          Clear Selection
        </button>
      </div>

      <div className="we-trending-course-list">
        {filteredCourses.length ? (
          filteredCourses.map((course) => {
            const id = String(course._id);
            const isPublished = course.status === "Published";
            const isSelected = selectedSet.has(id);

            return (
              <label
                className={`we-trending-course-option ${
                  isSelected ? "selected" : ""
                } ${!isPublished ? "disabled" : ""}`}
                key={id}
              >
                <input
                  type="checkbox"
                  checked={isSelected}
                  disabled={
                    !isPublished ||
                    (!isSelected && selectedCourseIds.length >= 100)
                  }
                  onChange={() => toggleCourse(course)}
                />

                <span className="we-trending-course-image">
                  {course.courseImage ? (
                    <img
                      src={getAssetUrl(course.courseImage)}
                      alt=""
                      onError={(event) => {
                        event.currentTarget.style.display = "none";
                      }}
                    />
                  ) : (
                    <FiImage />
                  )}
                </span>

                <span className="we-trending-course-info">
                  <strong>{course.courseTitle}</strong>

                  <small>
                    {course.courseCategory || "No category"} ·{" "}
                    {course.courseType || "Course type unavailable"}
                  </small>

                  <small>
                    ₹
                    {Number(course.price || 0).toLocaleString("en-IN")}
                    {" · "}
                    {course.duration || 0} {course.durationUnit || ""}
                  </small>

                  <small>
                    Batch: {course.batchStatus || "Not Available"}
                  </small>
                </span>

                <span
                  className={`we-trending-status ${
                    isPublished ? "published" : "unavailable"
                  }`}
                >
                  {course.status || "Unknown"}
                </span>
              </label>
            );
          })
        ) : (
          <div className="we-trending-empty">
            <FiImage />
            <strong>No courses found</strong>
            <span>Try another search term.</span>
          </div>
        )}
      </div>

      <div className="we-trending-selected">
        <div className="we-trending-selected-heading">
          <div>
            <h4>Selected Trending Courses</h4>
            <p>Arrange the order shown on the website.</p>
          </div>

          <span>{selectedCourses.length} selected</span>
        </div>

        {selectedCourses.length ? (
          <div className="we-trending-selected-list">
            {selectedCourses.map((course, index) => (
              <div
                className="we-trending-selected-item"
                key={course._id}
              >
                <span className="we-trending-order">
                  {index + 1}
                </span>

                <strong>{course.courseTitle}</strong>

                <div className="we-trending-reorder">
                  <button
                    type="button"
                    title="Move up"
                    aria-label={`Move ${course.courseTitle} up`}
                    disabled={index === 0}
                    onClick={() => moveSelected(course._id, -1)}
                  >
                    <FiArrowUp />
                  </button>

                  <button
                    type="button"
                    title="Move down"
                    aria-label={`Move ${course.courseTitle} down`}
                    disabled={index === selectedCourses.length - 1}
                    onClick={() => moveSelected(course._id, 1)}
                  >
                    <FiArrowDown />
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="we-trending-empty compact">
            <FiInfo />
            <span>
              Select Published courses to display them in the preview.
            </span>
          </div>
        )}
      </div>

      <div className="we-trending-note">
        <FiInfo />
        <span>
          Draft and Archived courses cannot be selected. If a selected
          course is later changed to Draft or Archived, it will be
          automatically hidden from the public course list.
        </span>
      </div>
    </div>
  );
}
