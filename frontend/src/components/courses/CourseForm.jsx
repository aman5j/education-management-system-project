import React, {
  useEffect,
  useState,
} from "react";

import { getAssetUrl } from "../../utils/assetUrl";

const initialState = {
  courseTitle: "",
  courseType: "",
  certificateDiploma: "",
  courseCategory: "",
  mrp: "",
  price: "",
  displayOrder: 0,
  duration: "",
  durationUnit: "Months",
  previewVideo: "",
  totalLectures: 0,
  practicalMarks: 0,
  objectiveMarks: 0,
  description: "",
  syllabus: "",
  eligibility: "",
  certificateSubject: "",
  popular: false,
  recommended: false,
  mrpVisible: true,
  hideExamResult: false,
  status: "Draft",
};

const CourseForm = ({
  initialData,
  loading,
  submitLabel,
  onSubmit,
}) => {
  const [form, setForm] =
    useState(initialState);

  const [image, setImage] =
    useState(null);

  // This stores the image shown in the preview.
  // It can be an existing backend image URL
  // OR a temporary blob URL for a newly selected image.
  const [imagePreview, setImagePreview] =
    useState("");

  useEffect(() => {
    // ADD COURSE
    if (!initialData) {
      setForm(initialState);
      setImage(null);
      setImagePreview("");

      return;
    }

    // EDIT COURSE
    setForm({
      courseTitle:
        initialData.courseTitle || "",

      courseType:
        initialData.courseType || "",

      certificateDiploma:
        initialData.certificateDiploma || "",

      courseCategory:
        initialData.courseCategory || "",

      mrp:
        initialData.mrp ?? "",

      price:
        initialData.price ?? "",

      displayOrder:
        initialData.displayOrder ?? 0,

      duration:
        initialData.duration ?? "",

      durationUnit:
        initialData.durationUnit ||
        "Months",

      previewVideo:
        initialData.previewVideo || "",

      totalLectures:
        initialData.totalLectures ?? 0,

      practicalMarks:
        initialData.practicalMarks ?? 0,

      objectiveMarks:
        initialData.objectiveMarks ?? 0,

      description:
        initialData.description || "",

      syllabus:
        initialData.syllabus || "",

      eligibility:
        initialData.eligibility || "",

      certificateSubject:
        initialData.certificateSubject || "",

      popular:
        Boolean(initialData.popular),

      recommended:
        Boolean(initialData.recommended),

      mrpVisible:
        initialData.mrpVisible !== false,

      hideExamResult:
        Boolean(
          initialData.hideExamResult
        ),

      status:
        initialData.status || "Draft",
    });

    // SHOW EXISTING COURSE IMAGE
    if (initialData.courseImage) {
      setImagePreview(
        getAssetUrl(
          initialData.courseImage
        )
      );
    } else {
      setImagePreview("");
    }

    // No new image selected yet
    setImage(null);
  }, [initialData]);

  // Cleanup blob URL when component unmounts
  // or when preview changes.
  useEffect(() => {
    return () => {
      if (
        imagePreview &&
        imagePreview.startsWith("blob:")
      ) {
        URL.revokeObjectURL(
          imagePreview
        );
      }
    };
  }, [imagePreview]);

  const handleChange = (event) => {
    const {
      name,
      value,
      type,
      checked,
    } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]:
        type === "checkbox"
          ? checked
          : value,
    }));
  };

  const handleImageChange = (event) => {
    const selectedFile =
      event.target.files?.[0] || null;

    if (!selectedFile) {
      return;
    }

    // Save selected file for FormData
    setImage(selectedFile);

    // Create temporary browser preview
    const previewUrl =
      URL.createObjectURL(selectedFile);

    setImagePreview(previewUrl);
  };

  const handleSubmit = (event) => {
    event.preventDefault();

    const formData = new FormData();

    Object.entries(form).forEach(
      ([key, value]) => {
        formData.append(key, value);
      }
    );

    // Only append image if user selected
    // a new image.
    if (image) {
      formData.append(
        "courseImage",
        image
      );
    }

    onSubmit(formData);
  };

  return (
    <form
      className="course-form"
      onSubmit={handleSubmit}
    >
      {/* BASIC INFORMATION */}

      <div className="course-form-section">
        <h2>Basic Information</h2>

        <div className="course-form-grid">
          <div className="course-field course-field-full">
            <label>
              Course Title *
            </label>

            <input
              name="courseTitle"
              value={form.courseTitle}
              onChange={handleChange}
              required
              placeholder="Enter course title"
            />
          </div>

          <div className="course-field">
            <label>
              Course Type *
            </label>

            <input
              name="courseType"
              value={form.courseType}
              onChange={handleChange}
              required
              placeholder="e.g. Online"
            />
          </div>

          <div className="course-field">
            <label>
              Certificate / Diploma
            </label>

            <input
              name="certificateDiploma"
              value={
                form.certificateDiploma
              }
              onChange={handleChange}
              placeholder="Certificate"
            />
          </div>

          <div className="course-field">
            <label>
              Course Category
            </label>

            <input
              name="courseCategory"
              value={
                form.courseCategory
              }
              onChange={handleChange}
              placeholder="Course category"
            />
          </div>

          <div className="course-field">
            <label>
              Display Order
            </label>

            <input
              type="number"
              min="0"
              name="displayOrder"
              value={
                form.displayOrder
              }
              onChange={handleChange}
            />
          </div>
        </div>
      </div>

      {/* PRICING */}

      <div className="course-form-section">
        <h2>Pricing & Duration</h2>

        <div className="course-form-grid">
          <div className="course-field">
            <label>MRP *</label>

            <input
              type="number"
              min="0"
              name="mrp"
              value={form.mrp}
              onChange={handleChange}
              required
            />
          </div>

          <div className="course-field">
            <label>Price *</label>

            <input
              type="number"
              min="0"
              name="price"
              value={form.price}
              onChange={handleChange}
              required
            />
          </div>

          <div className="course-field">
            <label>Duration</label>

            <input
              type="number"
              min="0"
              name="duration"
              value={form.duration}
              onChange={handleChange}
            />
          </div>

          <div className="course-field">
            <label>
              Duration Unit
            </label>

            <select
              name="durationUnit"
              value={
                form.durationUnit
              }
              onChange={handleChange}
            >
              <option value="Days">
                Days
              </option>

              <option value="Weeks">
                Weeks
              </option>

              <option value="Months">
                Months
              </option>

              <option value="Years">
                Years
              </option>

              <option value="Hours">
                Hours
              </option>
            </select>
          </div>
        </div>
      </div>

      {/* COURSE MEDIA */}

      <div className="course-form-section">
        <h2>Course Media</h2>

        <div className="course-form-grid">
          <div className="course-field">
            <label>
              Course Image
            </label>

            <input
              type="file"
              accept="image/png,image/jpeg,image/jpg,image/webp"
              onChange={
                handleImageChange
              }
            />

            {/* IMAGE PREVIEW */}

            {imagePreview && (
              <div className="course-image-preview">
                <img
                  src={getAssetUrl(imagePreview)}
                  alt="Course preview"
                  onError={(event) => {
                    event.currentTarget.style.display =
                      "none";
                  }}
                />

                <span>
                  {image
                    ? "New image selected"
                    : "Current course image"}
                </span>
              </div>
            )}
          </div>

          <div className="course-field">
            <label>
              Preview Video
            </label>

            <input
              name="previewVideo"
              value={
                form.previewVideo
              }
              onChange={handleChange}
              placeholder="YouTube / video URL"
            />
          </div>
        </div>
      </div>

      {/* COURSE DETAILS */}

      <div className="course-form-section">
        <h2>Course Details</h2>

        <div className="course-form-grid">
          <div className="course-field">
            <label>
              Total Lectures
            </label>

            <input
              type="number"
              min="0"
              name="totalLectures"
              value={
                form.totalLectures
              }
              onChange={handleChange}
            />
          </div>

          <div className="course-field">
            <label>
              Practical Marks
            </label>

            <input
              type="number"
              min="0"
              name="practicalMarks"
              value={
                form.practicalMarks
              }
              onChange={handleChange}
            />
          </div>

          <div className="course-field">
            <label>
              Objective Marks
            </label>

            <input
              type="number"
              min="0"
              name="objectiveMarks"
              value={
                form.objectiveMarks
              }
              onChange={handleChange}
            />
          </div>

          <div className="course-field">
            <label>
              Certificate Subject
            </label>

            <input
              name="certificateSubject"
              value={
                form.certificateSubject
              }
              onChange={handleChange}
              placeholder="Certificate subject"
            />
          </div>

          <div className="course-field course-field-full">
            <label>
              Description
            </label>

            <textarea
              name="description"
              value={
                form.description
              }
              onChange={handleChange}
              rows="5"
            />
          </div>

          <div className="course-field course-field-full">
            <label>
              Syllabus
            </label>

            <textarea
              name="syllabus"
              value={form.syllabus}
              onChange={handleChange}
              rows="5"
            />
          </div>

          <div className="course-field course-field-full">
            <label>
              Eligibility
            </label>

            <textarea
              name="eligibility"
              value={
                form.eligibility
              }
              onChange={handleChange}
              rows="4"
            />
          </div>
        </div>
      </div>

      {/* VISIBILITY */}

      <div className="course-form-section">
        <h2>
          Visibility & Status
        </h2>

        <div className="course-checkbox-grid">
          <label>
            <input
              type="checkbox"
              name="popular"
              checked={form.popular}
              onChange={handleChange}
            />
            Popular
          </label>

          <label>
            <input
              type="checkbox"
              name="recommended"
              checked={
                form.recommended
              }
              onChange={handleChange}
            />
            Recommended
          </label>

          <label>
            <input
              type="checkbox"
              name="mrpVisible"
              checked={
                form.mrpVisible
              }
              onChange={handleChange}
            />
            MRP Visible
          </label>

          <label>
            <input
              type="checkbox"
              name="hideExamResult"
              checked={
                form.hideExamResult
              }
              onChange={handleChange}
            />
            Hide Exam Result
          </label>
        </div>

        <div className="course-field course-status-field">
          <label>Status</label>

          <select
            name="status"
            value={form.status}
            onChange={handleChange}
          >
            <option value="Draft">
              Draft
            </option>

            <option value="Published">
              Published
            </option>

            <option value="Archived">
              Archived
            </option>
          </select>
        </div>
      </div>

      {/* SUBMIT */}

      <div className="course-form-actions">
        <button
          type="submit"
          className="course-primary-btn"
          disabled={loading}
        >
          {loading
            ? "Saving..."
            : submitLabel}
        </button>
      </div>
    </form>
  );
};

export default CourseForm;