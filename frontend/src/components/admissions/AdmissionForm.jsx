import {
  useEffect,
  useMemo,
  useState,
} from "react";

import StudentSearchSelect from "./StudentSearchSelect";
import { getStudents } from "../../services/studentService";
import { getCourses } from "../../services/courseService";
import { getBatches } from "../../services/batchService";

const getToday = () =>
  new Date().toISOString().split("T")[0];

const initialForm = {
  student_id: "",
  course_id: "",
  batch_id: "",

  course_type: "",
  course_fee: "",

  discount_type: "Amount",
  discount_value: "",

  is_gst_taken: false,
  gst_rate: "",

  admission_fee: "",
  paid_amount: "",

  admission_date: getToday(),

  referral_source: "",

  status: "Active",

  remark: "",
};

const AdmissionForm = ({
  initialData = null,
  onSubmit,
  submitting = false,
  submitLabel = "Create Admission",
}) => {
  const [form, setForm] =
    useState(initialForm);

  const [students, setStudents] =
    useState([]);

  const [courses, setCourses] =
    useState([]);

  const [batches, setBatches] =
    useState([]);

  const [loadingStudents, setLoadingStudents] =
    useState(false);

  const [loadingCourses, setLoadingCourses] =
    useState(false);

  const [loadingBatches, setLoadingBatches] =
    useState(false);

  const [error, setError] =
    useState("");

  /*
  |--------------------------------------------------------------------------
  | Student Search & Selection State
  |--------------------------------------------------------------------------
  */
  const [studentSearch, setStudentSearch] =
    useState("");

  const [fetchedStudents, setFetchedStudents] =
    useState([]);

  const [studentLoading, setStudentLoading] =
    useState(false);

  const [selectedStudent, setSelectedStudent] =
    useState(null);

  
  /*
  |--------------------------------------------------------------------------
  | Debounced Student Search Effect
  |--------------------------------------------------------------------------
  */
  useEffect(() => {
    const searchValue =
      studentSearch.trim();

    if (searchValue.length < 2) {
      setFetchedStudents([]);
      setStudentLoading(false);
      return;
    }

    let active = true;

    const timer = setTimeout(async () => {
      try {
        setStudentLoading(true);

        const response =
          await getStudents({
            search: searchValue,
            page: 1,
            limit: 10,
          });

        if (!active) return;

        let studentList = [];

        if (Array.isArray(response)) {
          studentList = response;
        } else if (Array.isArray(response?.data)) {
          studentList = response.data;
        } else if (Array.isArray(response?.students)) {
          studentList = response.students;
        } else if (
          Array.isArray(response?.data?.data)
        ) {
          studentList = response.data.data;
        } else if (
          Array.isArray(response?.data?.students)
        ) {
          studentList = response.data.students;
        }

        setFetchedStudents(studentList);
      } catch (loadError) {
        console.error(
          "Student search error:",
          loadError
        );

        if (active) {
          setFetchedStudents([]);
        }
      } finally {
        if (active) {
          setStudentLoading(false);
        }
      }
    }, 350);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [studentSearch]);

  /*
  |--------------------------------------------------------------------------
  | Load Students
  |--------------------------------------------------------------------------
  */

  // useEffect(() => {
  //   const loadStudents = async () => {
  //     try {
  //       setLoadingStudents(true);

  //       const response =
  //         await getStudents({
  //           page: 1,
  //           limit: 100,
  //           status: "active",
  //         });

  //       const studentList =
  //         response?.data?.data?.students ??
  //         response?.data?.students ??
  //         [];

  //       setStudents(
  //         Array.isArray(studentList)
  //           ? studentList
  //           : []
  //       );
  //     } catch (loadError) {
  //       console.error(
  //         "Failed to load students:",
  //         loadError
  //       );

  //       setStudents([]);
  //     } finally {
  //       setLoadingStudents(false);
  //     }
  //   };

  //   loadStudents();
  // }, []);

  /*
  |--------------------------------------------------------------------------
  | Load Courses
  |--------------------------------------------------------------------------
  */

  useEffect(() => {
    const loadCourses = async () => {
      try {
        setLoadingCourses(true);

        const response =
          await getCourses({
            page: 1,
            limit: 100,
          });

        const courseList =
          response?.data?.data ?? [];

        setCourses(
          Array.isArray(courseList)
            ? courseList
            : []
        );
      } catch (loadError) {
        console.error(
          "Failed to load courses:",
          loadError
        );

        setCourses([]);
      } finally {
        setLoadingCourses(false);
      }
    };

    loadCourses();
  }, []);

  /*
  |--------------------------------------------------------------------------
  | Load Initial Data
  |--------------------------------------------------------------------------
  */

  useEffect(() => {
    if (!initialData) {
      setForm(initialForm);
      setSelectedStudent(null);
      return;
    }

    const studentId =
      initialData.student_id?._id ||
      initialData.student_id ||
      "";

    const courseId =
      initialData.course_id?._id ||
      initialData.course_id ||
      "";

    const batchId =
      initialData.batch_id?._id ||
      initialData.batch_id ||
      "";

    setForm({
      student_id: studentId,

      course_id: courseId,

      batch_id: batchId,

      course_type:
        initialData.course_type ||
        initialData.courseType ||
        "",

      course_fee:
        initialData.course_fee ??
        initialData.courseFee ??
        "",

      discount_type:
        initialData.discount_type ||
        initialData.discountType ||
        "Amount",

      discount_value:
        initialData.discount_value ??
        initialData.discountValue ??
        "",

      is_gst_taken:
        Boolean(
          initialData.is_gst_taken ??
            initialData.isGstTaken ??
            false
        ),

      gst_rate:
        initialData.gst_rate ??
        initialData.gstRate ??
        "",

      admission_fee:
        initialData.admission_fee ??
        initialData.admissionFee ??
        "",

      paid_amount:
        initialData.paid_amount ??
        initialData.paidAmount ??
        "",

      admission_date:
        initialData.admission_date
          ? new Date(
              initialData.admission_date
            )
              .toISOString()
              .split("T")[0]
          : getToday(),

      referral_source:
        initialData.referral_source ||
        initialData.referralBy ||
        "",

      status:
        initialData.status || "Active",

      remark:
        initialData.remark || "",
    });

    if (
      initialData.student_id &&
      typeof initialData.student_id === "object"
    ) {
      setSelectedStudent(
        initialData.student_id
      );
    }
  }, [initialData]);

  /*
  |--------------------------------------------------------------------------
  | Load Batches when Course Changes
  |--------------------------------------------------------------------------
  */

  useEffect(() => {
    const loadBatches = async () => {
      if (!form.course_id) {
        setBatches([]);
        return;
      }

      try {
        setLoadingBatches(true);

        const response =
          await getBatches({
            page: 1,
            limit: 100,
            course_id: form.course_id,
          });

        const batchList =
          response?.data?.data?.batches ??
          response?.data?.batches ??
          [];

        setBatches(
          Array.isArray(batchList)
            ? batchList
            : []
        );
      } catch (loadError) {
        console.error(
          "Failed to load batches:",
          loadError
        );

        setBatches([]);
      } finally {
        setLoadingBatches(false);
      }
    };

    loadBatches();
  }, [form.course_id]);

  /*
  |--------------------------------------------------------------------------
  | Course Selection
  |--------------------------------------------------------------------------
  */

  const handleCourseChange = (
    event
  ) => {
    const courseId =
      event.target.value;

    const selectedCourse =
      courses.find(
        (course) =>
          String(course._id) ===
          String(courseId)
      );

    setForm((previous) => ({
      ...previous,

      course_id: courseId,

      batch_id: "",

      course_type:
        selectedCourse?.courseType ||
        "",

      course_fee:
        selectedCourse?.price ??
        selectedCourse?.mrp ??
        "",
    }));

    setError("");
  };

  /*
  |--------------------------------------------------------------------------
  | Batch Selection
  |--------------------------------------------------------------------------
  */

  const handleBatchChange = (
    event
  ) => {
    setForm((previous) => ({
      ...previous,
      batch_id: event.target.value,
    }));

    setError("");
  };

  /*
  |--------------------------------------------------------------------------
  | Generic Change
  |--------------------------------------------------------------------------
  */

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

    setError("");
  };

  /*
  |--------------------------------------------------------------------------
  | Calculations
  |--------------------------------------------------------------------------
  */

  const calculations = useMemo(() => {
    const courseFee = Math.max(
      Number(form.course_fee) || 0,
      0
    );

    const discountValue =
      Math.max(
        Number(
          form.discount_value
        ) || 0,
        0
      );

    let discountAmount = 0;

    if (
      form.discount_type ===
      "Percentage"
    ) {
      discountAmount =
        (courseFee *
          Math.min(
            discountValue,
            100
          )) /
        100;
    } else {
      discountAmount =
        discountValue;
    }

    discountAmount = Math.min(
      discountAmount,
      courseFee
    );

    const taxableAmount =
      courseFee -
      discountAmount;

    const gstRate =
      form.is_gst_taken
        ? Math.max(
            Number(
              form.gst_rate
            ) || 0,
            0
          )
        : 0;

    const gstAmount =
      (taxableAmount *
        gstRate) /
      100;

    const admissionFee =
      Math.max(
        Number(
          form.admission_fee
        ) || 0,
        0
      );

    const finalAmount =
      taxableAmount +
      gstAmount +
      admissionFee;

    const paidAmount =
      Math.max(
        Number(
          form.paid_amount
        ) || 0,
        0
      );

    const remainingAmount =
      Math.max(
        finalAmount -
          paidAmount,
        0
      );

    return {
      courseFee,
      discountAmount,
      taxableAmount,
      gstAmount,
      admissionFee,
      finalAmount,
      paidAmount,
      remainingAmount,
    };
  }, [
    form.course_fee,
    form.discount_type,
    form.discount_value,
    form.is_gst_taken,
    form.gst_rate,
    form.admission_fee,
    form.paid_amount,
  ]);

  /*
  |--------------------------------------------------------------------------
  | Submit
  |--------------------------------------------------------------------------
  */

  const handleSubmit = async (
    event
  ) => {
    event.preventDefault();

    setError("");

    if (!form.student_id) {
      setError(
        "Please select a student."
      );
      return;
    }

    if (!form.course_id) {
      setError(
        "Please select a course."
      );
      return;
    }

    if (!form.batch_id) {
      setError(
        "Please select a batch."
      );
      return;
    }

    if (
      Number(form.course_fee) < 0
    ) {
      setError(
        "Course fee cannot be negative."
      );
      return;
    }

    if (
      form.discount_type ===
        "Percentage" &&
      Number(
        form.discount_value
      ) > 100
    ) {
      setError(
        "Percentage discount cannot exceed 100%."
      );
      return;
    }

    if (
      calculations.paidAmount >
      calculations.finalAmount
    ) {
      setError(
        "Paid amount cannot be greater than final amount."
      );
      return;
    }

    try {
      await onSubmit({
        student_id:
          form.student_id,

        course_id:
          form.course_id,

        batch_id:
          form.batch_id,

        course_type:
          form.course_type,

        course_fee:
          calculations.courseFee,

        discount_type:
          form.discount_type,

        discount_value:
          Number(
            form.discount_value
          ) || 0,

        is_gst_taken:
          form.is_gst_taken,

        gst_amount:
          calculations.gstAmount,

        admission_fee:
          calculations.admissionFee,

        paid_amount:
          calculations.paidAmount,

        admission_date:
          form.admission_date,

        referral_source:
          form.referral_source,

        status:
          form.status,

        remark:
          form.remark,
      });
    } catch (submitError) {
      setError(
        submitError?.response
          ?.data?.message ||
          submitError?.message ||
          "Unable to save admission."
      );
    }
  };

  return (
    <form
      className="admission-form"
      onSubmit={handleSubmit}
    >
      {error && (
        <div className="admission-form-error">
          {error}
        </div>
      )}

      {/* STUDENT */}

      <section className="admission-form-section">
        <div className="admission-section-header">
          <div>
            <h3>
              Student Information
            </h3>

            <p>
              Select the student for
              this admission.
            </p>
          </div>
        </div>

        <div className="admission-form-grid">
          <div className="admission-form-group admission-form-full">
            <label>
              Student{" "}
              <span className="required">
                *
              </span>
            </label>

            {/* <select
              name="student_id"
              value={
                form.student_id
              }
              onChange={
                handleChange
              }
              disabled={
                loadingStudents ||
                Boolean(
                  initialData
                )
              }
            >
              <option value="">
                {loadingStudents
                  ? "Loading students..."
                  : "Select Student"}
              </option>

              {students.map(
                (student) => {
                  const name =
                    [
                      student.firstName,
                      student.surname,
                    ]
                      .filter(Boolean)
                      .join(" ");

                  return (
                    <option
                      key={
                        student._id
                      }
                      value={
                        student._id
                      }
                    >
                      {student.rollNo}{" "}
                      - {name} -{" "}
                      {student.mobile}
                    </option>
                  );
                }
              )}
            </select> */}

            <StudentSearchSelect
              students={fetchedStudents}
              value={form.student_id}
              selectedStudent={
                selectedStudent
              }
              loading={studentLoading}
              disabled={Boolean(
                initialData
              )}
              onSearch={(value) => {
                setStudentSearch(value);
              }}
              onChange={(
                studentId,
                student
              ) => {
                setForm(
                  (previous) => ({
                    ...previous,
                    student_id:
                      studentId,
                  })
                );

                setSelectedStudent(
                  student || null
                );

                setError("");
              }}
            />

            {initialData && (
              <small className="admission-form-help">
                Student cannot be
                changed after
                admission creation.
              </small>
            )}
          </div>
        </div>
      </section>

      {/* COURSE */}

      <section className="admission-form-section">
        <div className="admission-section-header">
          <div>
            <h3>
              Course Information
            </h3>

            <p>
              Select course and
              batch information.
            </p>
          </div>
        </div>

        <div className="admission-form-grid">
          <div className="admission-form-group">
            <label>
              Course Type
            </label>

            <input
              type="text"
              name="course_type"
              value={
                form.course_type
              }
              readOnly
              placeholder="Course type"
            />
          </div>

          <div className="admission-form-group">
            <label>
              Course{" "}
              <span className="required">
                *
              </span>
            </label>

            <select
              name="course_id"
              value={
                form.course_id
              }
              onChange={
                handleCourseChange
              }
              disabled={
                loadingCourses
              }
            >
              <option value="">
                {loadingCourses
                  ? "Loading courses..."
                  : "Select Course"}
              </option>

              {courses.map(
                (course) => (
                  <option
                    key={
                      course._id
                    }
                    value={
                      course._id
                    }
                  >
                    {
                      course.courseTitle
                    }
                  </option>
                )
              )}
            </select>
          </div>

          <div className="admission-form-group">
            <label>
              Batch{" "}
              <span className="required">
                *
              </span>
            </label>

            <select
              name="batch_id"
              value={
                form.batch_id
              }
              onChange={
                handleBatchChange
              }
              disabled={
                !form.course_id ||
                loadingBatches
              }
            >
              <option value="">
                {!form.course_id
                  ? "Select course first"
                  : loadingBatches
                  ? "Loading batches..."
                  : batches.length ===
                    0
                  ? "No batches available"
                  : "Select Batch"}
              </option>

              {batches.map(
                (batch) => (
                  <option
                    key={
                      batch._id
                    }
                    value={
                      batch._id
                    }
                  >
                    {
                      batch.batch_name
                    }{" "}
                    —{" "}
                    {
                      batch.available_seats
                    } seats available
                  </option>
                )
              )}
            </select>
          </div>

          <div className="admission-form-group">
            <label>
              Available Seats
            </label>

            <input
              type="text"
              value={
                form.batch_id
                  ? batches.find(
                      (batch) =>
                        String(
                          batch._id
                        ) ===
                        String(
                          form.batch_id
                        )
                    )
                      ?.available_seats ??
                    "—"
                  : "—"
              }
              readOnly
            />
          </div>

          <div className="admission-form-group">
            <label>
              Course Fee
            </label>

            <input
              type="number"
              name="course_fee"
              value={
                form.course_fee
              }
              onChange={
                handleChange
              }
              min="0"
              step="0.01"
            />
          </div>
        </div>
      </section>

      {/* FEES */}

      <section className="admission-form-section">
        <div className="admission-section-header">
          <div>
            <h3>
              Fee Information
            </h3>

            <p>
              Configure discount,
              GST and admission fee.
            </p>
          </div>
        </div>

        <div className="admission-form-grid">
          <div className="admission-form-group">
            <label>
              Discount Type
            </label>

            <select
              name="discount_type"
              value={
                form.discount_type
              }
              onChange={
                handleChange
              }
            >
              <option value="Amount">
                Amount
              </option>

              <option value="Percentage">
                Percentage
              </option>
            </select>
          </div>

          <div className="admission-form-group">
            <label>
              Discount Value
            </label>

            <input
              type="number"
              name="discount_value"
              value={
                form.discount_value
              }
              onChange={
                handleChange
              }
              min="0"
              step="0.01"
              placeholder={
                form.discount_type ===
                "Percentage"
                  ? "0"
                  : "0.00"
              }
            />
          </div>

          <div className="admission-form-group">
            <label className="admission-checkbox-label">
              <input
                type="checkbox"
                name="is_gst_taken"
                checked={
                  form.is_gst_taken
                }
                onChange={
                  handleChange
                }
              />

              <span>
                Apply GST
              </span>
            </label>
          </div>

          <div className="admission-form-group">
            <label>
              GST (%)
            </label>

            <input
              type="number"
              name="gst_rate"
              value={
                form.gst_rate
              }
              onChange={
                handleChange
              }
              disabled={
                !form.is_gst_taken
              }
              min="0"
              step="0.01"
              placeholder="0"
            />
          </div>

          <div className="admission-form-group">
            <label>
              Admission Fee
            </label>

            <input
              type="number"
              name="admission_fee"
              value={
                form.admission_fee
              }
              onChange={
                handleChange
              }
              min="0"
              step="0.01"
              placeholder="0"
            />
          </div>

          <div className="admission-form-group">
            <label>
              Paid Amount
            </label>

            <input
              type="number"
              name="paid_amount"
              value={
                form.paid_amount
              }
              onChange={
                handleChange
              }
              min="0"
              step="0.01"
              placeholder="0"
            />
          </div>
        </div>

        <div className="admission-calculation-card">
          <div>
            <span>
              Course Fee
            </span>

            <strong>
              ₹
              {calculations.courseFee.toFixed(
                2
              )}
            </strong>
          </div>

          <div>
            <span>
              Discount
            </span>

            <strong className="discount-value">
              - ₹
              {calculations.discountAmount.toFixed(
                2
              )}
            </strong>
          </div>

          <div>
            <span>
              GST
            </span>

            <strong>
              + ₹
              {calculations.gstAmount.toFixed(
                2
              )}
            </strong>
          </div>

          <div>
            <span>
              Admission Fee
            </span>

            <strong>
              + ₹
              {calculations.admissionFee.toFixed(
                2
              )}
            </strong>
          </div>

          <div className="admission-final-amount">
            <span>
              Final Amount
            </span>

            <strong>
              ₹
              {calculations.finalAmount.toFixed(
                2
              )}
            </strong>
          </div>

          <div className="admission-remaining-amount">
            <span>
              Remaining Amount
            </span>

            <strong>
              ₹
              {calculations.remainingAmount.toFixed(
                2
              )}
            </strong>
          </div>
        </div>
      </section>

      {/* DETAILS */}

      <section className="admission-form-section">
        <div className="admission-section-header">
          <div>
            <h3>
              Admission Details
            </h3>

            <p>
              Complete admission
              information.
            </p>
          </div>
        </div>

        <div className="admission-form-grid">
          <div className="admission-form-group">
            <label>
              Admission Date
            </label>

            <input
              type="date"
              name="admission_date"
              value={
                form.admission_date
              }
              onChange={
                handleChange
              }
            />
          </div>

          <div className="admission-form-group">
            <label>
              Referral By
            </label>

            <input
              type="text"
              name="referral_source"
              value={
                form.referral_source
              }
              onChange={
                handleChange
              }
              placeholder="Enter referral"
            />
          </div>

          <div className="admission-form-group">
            <label>
              Status
            </label>

            <select
              name="status"
              value={
                form.status
              }
              onChange={
                handleChange
              }
            >
              <option value="Active">
                Active
              </option>

              <option value="Completed">
                Completed
              </option>

              <option value="Dropped">
                Dropped
              </option>
            </select>
          </div>

          <div className="admission-form-group admission-form-full">
            <label>
              Remark
            </label>

            <textarea
              name="remark"
              value={
                form.remark
              }
              onChange={
                handleChange
              }
              rows="4"
              placeholder="Add admission remark"
            />
          </div>
        </div>
      </section>

      <div className="admission-form-actions">
        <button
          type="submit"
          className="admission-primary-button"
          disabled={submitting}
        >
          {submitting
            ? "Saving..."
            : submitLabel}
        </button>
      </div>
    </form>
  );
};

export default AdmissionForm;