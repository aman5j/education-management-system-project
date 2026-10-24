import React, {
  useEffect,
  useRef,
  useState,
} from "react";

import { getAssetUrl } from "../../utils/assetUrl";
import "../../styles/AdmissionManagement.css";

const StudentSearchSelect = ({
  students = [],
  value = "",
  selectedStudent = null,
  onChange,
  onSearch,
  loading = false,
  error = "",
  disabled = false,
}) => {

  const getFullName = (student) =>
    [student?.firstName, student?.surname]
      .filter(Boolean)
      .join(" ") || "Student";

  const getInitials = (student) =>
    [student?.firstName?.[0], student?.surname?.[0]]
      .filter(Boolean)
      .join("")
      .toUpperCase() || "S";
      
  const [search, setSearch] =
    useState("");

  const [open, setOpen] =
    useState(false);

  const wrapperRef =
    useRef(null);

  const getStudentLabel = (
    student
  ) => {
    if (!student) return "";

    const name = [
      student.firstName,
      student.surname,
    ]
      .filter(Boolean)
      .join(" ");

    return [
      student.rollNo,
      name,
      student.mobile,
    ]
      .filter(Boolean)
      .join(" - ");
  };

  /*
   * Show selected student on Edit
   */
  useEffect(() => {
    if (selectedStudent) {
      setSearch(
        getStudentLabel(
          selectedStudent
        )
      );
    }
  }, [selectedStudent]);

  /*
   * Close dropdown outside
   */
  useEffect(() => {
    const handleClickOutside = (
      event
    ) => {
      if (
        wrapperRef.current &&
        !wrapperRef.current.contains(
          event.target
        )
      ) {
        setOpen(false);
      }
    };

    document.addEventListener(
      "mousedown",
      handleClickOutside
    );

    return () => {
      document.removeEventListener(
        "mousedown",
        handleClickOutside
      );
    };
  }, []);

  const handleInputChange = (
    event
  ) => {
    const searchValue =
      event.target.value;

    setSearch(searchValue);
    setOpen(true);

    /*
     * IMPORTANT:
     * send search text to AdmissionForm
     */
    if (onSearch) {
      onSearch(searchValue);
    }

    /*
     * If user changes text after
     * selecting student, clear selection.
     */
    if (value) {
      onChange("");
    }
  };

  const handleSelect = (
    student
  ) => {
    setSearch(
      getStudentLabel(student)
    );

    setOpen(false);

    onChange(
      student._id,
      student
    );
  };

  return (
    <div
      className="student-search-select"
      ref={wrapperRef}
    >
      <div className="input-field">
        <input
          type="text"
          value={search}
          onChange={
            handleInputChange
          }
          onFocus={() => {
            if (!disabled) {
              setOpen(true);

              if (onSearch) {
                onSearch(search);
              }
            }
          }}
          disabled={disabled}
          placeholder="Search by roll no, student name or mobile..."
          autoComplete="off"
        />

        {loading && (
          <span className="student-search-loader">
            Searching...
          </span>
        )}
      </div>

      {open && !disabled && (
        <div className="student-search-results">
          {loading ? (
            <div className="student-search-message">
              Searching students...
            </div>
          ) : students.length > 0 ? (
            students.map(
              (student) => (
                <button
                  key={
                    student._id
                  }
                  type="button"
                  className={`student-search-option ${
                    String(
                      student._id
                    ) ===
                    String(value)
                      ? "selected"
                      : ""
                  }`}
                  onMouseDown={(
                    event
                  ) => {
                    event.preventDefault();

                    handleSelect(
                      student
                    );
                  }}
                >
                  <strong>
                    {student.rollNo ||
                      "No Roll No"}
                  </strong>

                  <span>
                    {[
                      student.firstName,
                      student.surname,
                    ]
                      .filter(Boolean)
                      .join(" ")}
                  </span>

                  {student.mobile && (
                    <small>
                      {student.mobile}
                    </small>
                  )}
                </button>
              )
            )
          ) : search.trim()
              .length >= 2 ? (
            <div className="student-search-message">
              No student found for
              "{search}".
            </div>
          ) : (
            <div className="student-search-message">
              Type at least 2
              characters to search.
            </div>
          )}
        </div>
      )}

      {selectedStudent && String(value) && (
        <div className="admission-selected-student">
          <div className="admission-selected-student-avatar">
            {selectedStudent.profileImage ? (
              <img
                src={getAssetUrl(selectedStudent.profileImage)}
                alt={getFullName(selectedStudent)}
                onError={(event) => {
                  event.currentTarget.style.display = "none";
                  event.currentTarget.nextElementSibling?.classList.remove(
                    "admission-avatar-fallback-hidden"
                  );
                }}
              />
            ) : null}

            <div
              className={`admission-avatar-fallback ${
                selectedStudent.profileImage
                  ? "admission-avatar-fallback-hidden"
                  : ""
              }`}
            >
              {getInitials(selectedStudent)}
            </div>
          </div>

          <div className="admission-selected-student-details">
            <h4>{getFullName(selectedStudent)}</h4>

            <div className="admission-selected-student-meta">
              <span>
                <strong>Roll No:</strong>{" "}
                {selectedStudent.rollNo || "—"}
              </span>

              <span>
                <strong>Mobile:</strong>{" "}
                {selectedStudent.mobile || "—"}
              </span>

              <span>
                <strong>Email:</strong>{" "}
                {selectedStudent.email || "—"}
              </span>
            </div>
          </div>

          <span className="admission-student-selected-label">
            Selected
          </span>
        </div>
      )}

      {error && (
        <small className="admission-field-error">
          {error}
        </small>
      )}
    </div>
  );
};

export default StudentSearchSelect;