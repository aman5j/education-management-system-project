import React, {
  useEffect,
  useState,
} from "react";

import { getSubjects } from "../../services/subjectService";
import { getCategories } from "../../services/categoryService";

import { getAssetUrl } from "../../utils/assetUrl";
import RichTextEditor from "../common/RichTextEditor";

const initialState = {
  courseTitle: "",
  courseType: "",
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
  subjects: [],
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

  const [errors, setErrors] =
  useState({});

//   const [serverError, setServerError] =
//   useState("");
    const [
  serverError,
  setServerError,
] = useState("");

  // This stores the image shown in the preview.
  // It can be an existing backend image URL
  // OR a temporary blob URL for a newly selected image.
  const [imagePreview, setImagePreview] =
    useState("");


  const [availableSubjects, setAvailableSubjects] = useState([]);
  const [subjectsLoading, setSubjectsLoading] = useState(false);
  const [subjectsError, setSubjectsError] = useState("");
  const [subjectSearch, setSubjectSearch] = useState("");


  const [availableCategories, setAvailableCategories] = useState([]);
  const [categoriesLoading, setCategoriesLoading] = useState(false);
  const [categoriesError, setCategoriesError] = useState("");


  useEffect(() => {
    let cancelled = false;

    const loadCategories = async () => {
      setCategoriesLoading(true);
      setCategoriesError("");

      try {
        const response = await getCategories({
          status: "Active",
          limit: 100,
          sortBy: "categoryName",
          sortOrder: "asc",
        });

        const payload = response?.data;

        // Category API returns:
        // { success: true, data: { categories: [], pagination: {} } }
        const categories = Array.isArray(payload?.data?.categories)
          ? payload.data.categories
          : Array.isArray(payload?.data)
            ? payload.data
            : [];

        if (!cancelled) {
          setAvailableCategories(categories);
        }
      } catch (error) {
        if (!cancelled) {
          setCategoriesError(
            error?.response?.data?.message ||
              "Unable to load course categories. Please try again."
          );
        }
      } finally {
        if (!cancelled) {
          setCategoriesLoading(false);
        }
      }
    };

    loadCategories();

    return () => {
      cancelled = true;
    };
  }, []);


  const toggleSubject = (subjectId) => {
      setForm((previous) => {
        const selected = previous.subjects || [];

        return {
          ...previous,
          subjects: selected.includes(subjectId)
            ? selected.filter((id) => id !== subjectId)
            : [...selected, subjectId],
        };
      });

      setErrors((previous) => ({
        ...previous,
        subjects: "",
      }));

      setServerError("");
    };

    const filteredSubjects = availableSubjects.filter((subject) => {
      const term = subjectSearch.trim().toLowerCase();

      return (
        !term ||
        subject.subjectName?.toLowerCase().includes(term) ||
        subject.subjectCode?.toLowerCase().includes(term)
      );
    });


  useEffect(() => {
    let cancelled = false;

    const loadSubjects = async () => {
      setSubjectsLoading(true);
      setSubjectsError("");

      try {
        const response = await getSubjects({
          status: "Active",
          limit: 100,
          sortBy: "subjectName",
          order: "asc",
        });

        const payload = response?.data;
        const list = Array.isArray(payload?.data)
          ? payload.data
          : Array.isArray(payload)
            ? payload
            : [];

        if (!cancelled) {
          setAvailableSubjects(list);
        }
      } catch (error) {
        if (!cancelled) {
          setSubjectsError(
            error?.response?.data?.message ||
              "Unable to load subjects. Please refresh and try again."
          );
        }
      } finally {
        if (!cancelled) setSubjectsLoading(false);
      }
    };

    loadSubjects();

    return () => {
      cancelled = true;
    };
  }, []);

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

        subjects: Array.isArray(initialData.subjects)
          ? initialData.subjects.map((subject) =>
              String(subject?._id || subject)
            )
          : [],

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

//   const handleChange = (event) => {
//     const {
//       name,
//       value,
//       type,
//       checked,
//     } = event.target;

//     setForm((previous) => ({
//       ...previous,
//       [name]:
//         type === "checkbox"
//           ? checked
//           : value,
//     }));
//   };

    const handleChange = (
    event
    ) => {
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

    /*
    * Clear only this field's
    * backend validation error.
    */
    setErrors((previous) => ({
        ...previous,
        [name]: "",
    }));

    setServerError("");
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

//   const handleSubmit = (event) => {
//     event.preventDefault();

//     const formData = new FormData();

//     Object.entries(form).forEach(
//       ([key, value]) => {
//         formData.append(key, value);
//       }
//     );

//     // Only append image if user selected
//     // a new image.
//     if (image) {
//       formData.append(
//         "courseImage",
//         image
//       );
//     }

//     onSubmit(formData);
//   };

    // const handleSubmit = async (event) => {
    // event.preventDefault();

    // setErrors({});
    // setServerError("");

    // const formData =
    //     new FormData();

    // Object.entries(form).forEach(
    //     ([key, value]) => {
    //     if (
    //         value !== null &&
    //         value !== undefined
    //     ) {
    //         formData.append(
    //         key,
    //         String(value)
    //         );
    //     }
    //     }
    // );

    // if (image) {
    //     formData.append(
    //     "courseImage",
    //     image
    //     );
    // }

    // try {
    //     await onSubmit(formData);
    // } catch (error) {
    // console.error(
    //     "Course submit error:",
    //     error
    // );

    // const response =
    //     error?.response?.data;

    // const validationErrors =
    //     response?.errors || [];

    // const fieldErrors = {};

    // if (
    //     Array.isArray(
    //     validationErrors
    //     )
    // ) {
    //     validationErrors.forEach(
    //     (item) => {
    //         /*
    //         * Supports our normalized API:
    //         * field + message
    //         *
    //         * AND normal express-validator:
    //         * path + msg
    //         */
    //         const field =
    //         item.field ||
    //         item.path ||
    //         item.param;

    //         const message =
    //         item.message ||
    //         item.msg;

    //         if (
    //         field &&
    //         message &&
    //         !fieldErrors[field]
    //         ) {
    //         fieldErrors[
    //             field
    //         ] = message;
    //         }
    //     }
    //     );
    // }

    // setErrors(fieldErrors);

    // setServerError(
    //     response?.message ||
    //     "Please check the form and correct the errors."
    // );

    // window.scrollTo({
    //     top: 0,
    //     behavior: "smooth",
    // });
    // }    
    // };

    const handleSubmit = async (event) => {
  event.preventDefault();

  /*
   * Clear previous validation errors
   */
  setErrors({});
  setServerError("");

  const formData =
    new FormData();

  Object.entries(form).forEach(([key, value]) => {
      if (value === null || value === undefined) return;

      if (key === "subjects") {
        formData.append("subjects", JSON.stringify(value));
      } else {
        formData.append(key, String(value));
      }
    });

  if (image) {
    formData.append(
      "courseImage",
      image
    );
  }

  try {
    /*
     * Backend validation happens here.
     */
    await onSubmit(formData);

  } catch (error) {
    console.error(
      "Course submit error:",
      error
    );

    const response =
      error?.response?.data;

    /*
     * Backend should return:
     *
     * {
     *   success: false,
     *   message: "Validation failed",
     *   errors: [...]
     * }
     */

    const validationErrors =
      response?.errors || [];

    const fieldErrors = {};

    /*
     * EXPRESS-VALIDATOR ARRAY
     */
    if (
      Array.isArray(
        validationErrors
      )
    ) {
      validationErrors.forEach(
        (item) => {
          const field =
            item.field ||
            item.path ||
            item.param;

          const message =
            item.message ||
            item.msg;

          if (
            field &&
            message
          ) {
            /*
             * Keep first error for
             * each field.
             */
            if (
              !fieldErrors[field]
            ) {
              fieldErrors[field] =
                message;
            }
          }
        }
      );
    }

    /*
     * ALSO SUPPORT:
     *
     * errors: {
     *   courseTitle: "..."
     * }
     */
    if (
      validationErrors &&
      !Array.isArray(
        validationErrors
      ) &&
      typeof validationErrors ===
        "object"
    ) {
      Object.entries(
        validationErrors
      ).forEach(
        ([field, message]) => {
          if (
            typeof message ===
            "string"
          ) {
            fieldErrors[field] =
              message;
          }
        }
      );
    }

    /*
     * Set field-wise errors
     */
    setErrors(fieldErrors);

    /*
     * Only show general message
     * at top.
     */
    setServerError(
      response?.message ||
        "Please check the highlighted fields."
    );

    /*
     * Scroll to first error
     */
    const firstErrorField =
      Object.keys(
        fieldErrors
      )[0];

    if (firstErrorField) {
      setTimeout(() => {
        const element =
          document.querySelector(
            `[name="${firstErrorField}"]`
          );

        if (element) {
          element.scrollIntoView({
            behavior: "smooth",
            block: "center",
          });

          element.focus?.();
        } else {
          window.scrollTo({
            top: 0,
            behavior: "smooth",
          });
        }
      }, 100);
    } else {
      window.scrollTo({
        top: 0,
        behavior: "smooth",
      });
    }
  }
};

    const fieldError = (field) => {
        if (!errors[field]) {
            return null;
        }

        return (
            <div className="course-field-error">
            {errors[field]}
            </div>
        );
    };

  return (
    <form
      className="course-form"
      onSubmit={handleSubmit}
      noValidate
    >

        {serverError && (
        <div className="course-form-error">
            {serverError}
        </div>
        )}

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
            //   required
              placeholder="Enter course title"
            />

            {fieldError("courseTitle")}
          </div>

          <div className="course-field">
            <label htmlFor="courseType">Course Type *</label>

            <select
              id="courseType"
              name="courseType"
              value={form.courseType}
              onChange={handleChange}
              required
            >
              <option value="">Select course type</option>
              <option value="Online">Online</option>
              <option value="Offline">Offline</option>
            </select>

            {fieldError("courseType")}
          </div>

          
          <div className="course-field">
            <label htmlFor="courseCategory">Course Category *</label>

            <select
              id="courseCategory"
              name="courseCategory"
              value={form.courseCategory}
              onChange={handleChange}
              required
              disabled={categoriesLoading}
            >
              <option value="">
                {categoriesLoading
                  ? "Loading categories..."
                  : "Select course category"}
              </option>

              {availableCategories.map((category) => (
                <option
                  key={category._id}
                  value={category.categoryName}
                >
                  {category.categoryName}
                </option>
              ))}
            </select>

            {categoriesError && (
              <div className="course-field-error" role="alert">
                {categoriesError}
                <button
                  type="button"
                  onClick={() => window.location.reload()}
                >
                  Reload
                </button>
              </div>
            )}

            {!categoriesLoading &&
              !categoriesError &&
              availableCategories.length === 0 && (
                <p className="course-field-error">
                  No active categories found. Create a category first in Course Categories.
                </p>
              )}

            {fieldError("courseCategory")}
          </div>


          <div className="course-field">
            <label>
              Display Order *
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
            {fieldError("displayOrder")}
          </div>
        </div>
      </div>

      
      {/* COURSE SUBJECTS */}

      <div className="course-form-section">
        <h2>Course Subjects</h2>
        <p>
          Select the subjects included in this course.
          A subject can be reused in multiple courses.
        </p>

        <div className="course-field">
          <label htmlFor="course-subject-search">
            Search subjects
          </label>

          <input
            id="course-subject-search"
            type="search"
            value={subjectSearch}
            onChange={(event) => setSubjectSearch(event.target.value)}
            placeholder="Search by subject name or code"
          />
        </div>

        {subjectsLoading && <p>Loading subjects...</p>}

        {subjectsError && (
          <div className="course-form-error" role="alert">
            {subjectsError}
            <button
              type="button"
              onClick={() => window.location.reload()}
            >
              Reload
            </button>
          </div>
        )}

        {!subjectsLoading && !subjectsError && (
          <div className="course-subject-list">
            {filteredSubjects.length === 0 ? (
              <p>
                No active subjects found. Create a subject first in Subject
                Management.
              </p>
            ) : (
              filteredSubjects.map((subject) => {
                const selected = (form.subjects || []).includes(
                  String(subject._id)
                );

                return (
                  <label
                    key={subject._id}
                    className="course-subject-option"
                  >
                    <input
                      type="checkbox"
                      checked={selected}
                      onChange={() => toggleSubject(String(subject._id))}
                    />

                    <span>
                      <strong>{subject.subjectName}</strong>
                      <small>{subject.subjectCode}</small>
                    </span>

                    {selected && <span>Selected</span>}
                  </label>
                );
              })
            )}
          </div>
        )}

        <p>
          Selected subjects: {(form.subjects || []).length}
        </p>

        {fieldError("subjects")}
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
            //   required
            />
            {fieldError("mrp")}
          </div>

          <div className="course-field">
            <label>Price *</label>

            <input
              type="number"
              min="0"
              name="price"
              value={form.price}
              onChange={handleChange}
            //   required
            />

            {fieldError("price")}
          </div>

          <div className="course-field">
            <label>Duration *</label>

            <input
              type="number"
              min="0"
              name="duration"
              value={form.duration}
              onChange={handleChange}
            />
            {fieldError("duration")}
          </div>

          <div className="course-field">
            <label>
              Duration Unit *
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
            {fieldError("durationUnit")}
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

            {fieldError("courseImage")}
          </div>

          <div className="course-field">
            <label>
              Preview Video *
            </label>

            <input
              name="previewVideo"
              value={
                form.previewVideo
              }
              onChange={handleChange}
              placeholder="YouTube / video URL"
            />
            {fieldError("previewVideo")}
          </div>
        </div>
      </div>

      {/* COURSE DETAILS */}

      <div className="course-form-section">
        <h2>Course Details</h2>

        <div className="course-form-grid">
          <div className="course-field">
            <label>
              Total Lectures *
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
            {fieldError("totalLectures")}
          </div>

          <div className="course-field">
            <label>
              Practical Marks *
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
            {fieldError("practicalMarks")}
          </div>

          <div className="course-field">
            <label>
              Objective Marks *
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
            {fieldError("objectiveMarks")}
          </div>

          <div className="course-field">
            <label>
              Certificate Subject *
            </label>

            <input
              name="certificateSubject"
              value={
                form.certificateSubject
              }
              onChange={handleChange}
              placeholder="Certificate subject"
            />
            {fieldError("certificateSubject")}
          </div>

          <div className="course-field course-field-full">
            <label>
            Description *
            </label>

            <RichTextEditor
            value={form.description}
            onChange={(value) => {
                setForm((previous) => ({
                ...previous,
                description: value,
                }));

                setErrors((previous) => ({
                ...previous,
                description: "",
                }));
            }}
            placeholder="Write your course description here..."
            />

            {fieldError("description")}
          </div>

          <div className="course-field course-field-full">
            <label>
            Syllabus *
            </label>

            <RichTextEditor
            value={form.syllabus}
            onChange={(value) => {
                setForm((previous) => ({
                ...previous,
                syllabus: value,
                }));

                setErrors((previous) => ({
                ...previous,
                syllabus: "",
                }));
            }}
            placeholder="Write your course syllabus here..."
            />

            {fieldError("syllabus")}
          </div>

          {/* <div className="course-field course-field-full">
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
            {fieldError("eligibility")}
          </div> */}

          <div className="course-field course-field-full">
            <label>
                Eligibility *
            </label>

            <RichTextEditor
                value={
                form.eligibility
                }
                onChange={(value) => {
                setForm(
                    (previous) => ({
                    ...previous,
                    eligibility:
                        value,
                    })
                );

                setErrors(
                    (previous) => ({
                    ...previous,
                    eligibility: "",
                    })
                );

                setServerError("");
                }}
                placeholder="Write course eligibility here..."
            />

            {fieldError(
                "eligibility"
            )}
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

            {fieldError("status")}
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