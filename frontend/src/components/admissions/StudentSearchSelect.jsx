import React, {
  useEffect,
  useRef,
  useState,
} from "react";

const StudentSearchSelect = ({
  students = [],
  value,
  onChange,
  onSearch,
  loading = false,
  error = "",
  disabled = false,
}) => {
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);

  const wrapperRef = useRef(null);

  const selectedStudent = students.find(
    (student) =>
      String(student._id) === String(value)
  );

  useEffect(() => {
    if (selectedStudent) {
      const label = getStudentLabel(selectedStudent);
      setSearch(label);
    }
  }, [value, selectedStudent]);

  useEffect(() => {
    const handleOutsideClick = (event) => {
      if (
        wrapperRef.current &&
        !wrapperRef.current.contains(event.target)
      ) {
        setOpen(false);
      }
    };

    document.addEventListener(
      "mousedown",
      handleOutsideClick
    );

    return () => {
      document.removeEventListener(
        "mousedown",
        handleOutsideClick
      );
    };
  }, []);

  const getStudentLabel = (student) => {
    const rollNo = student.rollNo || "N/A";

    const name = [
      student.firstName,
      student.surname,
    ]
      .filter(Boolean)
      .join(" ");

    const mobile = student.mobile || "";

    return `${rollNo} - ${name}${
      mobile ? ` - ${mobile}` : ""
    }`;
  };

  const handleSearchChange = (event) => {
    const value = event.target.value;

    setSearch(value);
    setOpen(true);

    if (onSearch) {
      onSearch(value);
    }
  };

  const handleSelect = (student) => {
    onChange(student._id);

    setSearch(getStudentLabel(student));

    setOpen(false);
  };

  const handleClear = () => {
    setSearch("");
    onChange("");

    if (onSearch) {
      onSearch("");
    }

    setOpen(true);
  };

  return (
    <div
      className="student-search-select"
      ref={wrapperRef}
    >
      <div className="student-search-input-wrapper">
        <input
          type="text"
          value={search}
          onChange={handleSearchChange}
          onFocus={() => setOpen(true)}
          placeholder="Search student by roll no, name or mobile..."
          autoComplete="off"
          disabled={disabled}
        />

        {search && !disabled && (
          <button
            type="button"
            className="student-search-clear"
            onClick={handleClear}
            aria-label="Clear student search"
          >
            ×
          </button>
        )}
      </div>

      {open && !disabled && (
        <div className="student-search-results">
          {loading && (
            <div className="student-search-message">
              Searching students...
            </div>
          )}

          {!loading &&
            search.trim().length < 2 && (
              <div className="student-search-message">
                Type at least 2 characters to search.
              </div>
            )}

          {!loading &&
            search.trim().length >= 2 &&
            students.length === 0 && (
              <div className="student-search-message">
                No students found.
              </div>
            )}

          {!loading &&
            students.length > 0 &&
            students.map((student) => (
              <button
                type="button"
                key={student._id}
                className={`student-search-option ${
                  String(student._id) ===
                  String(value)
                    ? "selected"
                    : ""
                }`}
                onClick={() =>
                  handleSelect(student)
                }
              >
                <div className="student-search-option-main">
                  <strong>
                    {student.rollNo || "N/A"}
                  </strong>

                  <span>
                    {[
                      student.firstName,
                      student.surname,
                    ]
                      .filter(Boolean)
                      .join(" ")}
                  </span>
                </div>

                <div className="student-search-option-meta">
                  {student.mobile || "No mobile"}
                </div>
              </button>
            ))}
        </div>
      )}

      {error && (
        <div className="student-search-error">
          {error}
        </div>
      )}
    </div>
  );
};

export default StudentSearchSelect;