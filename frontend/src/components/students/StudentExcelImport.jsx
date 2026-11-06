
import { useRef, useState } from "react";
import * as XLSX from "xlsx";
import {
  FiDownload,
  FiUpload,
  FiX,
  FiCheckCircle,
  FiAlertCircle,
} from "react-icons/fi";

import api from "../../services/api";
import "./StudentExcelImport.css";

const MAX_ROWS = 200;
const MAX_FILE_SIZE = 5 * 1024 * 1024;

const COLUMNS = [
  "Roll No",
  "First Name",
  "Surname",
  "Father Name",
  "Mother Name",
  "Relationship",
  "Date of Birth",
  "Gender",
  "Mobile",
  "Alternate Mobile",
  "Email",
  "Address",
  "Pincode",
  "Status",
  "Show Father Name",
  "Show Surname",
];

const COLUMN_MAP = {
  rollno: "rollNo",
  firstname: "firstName",
  surname: "surname",
  fathername: "fatherName",
  mothername: "motherName",
  relationship: "relationship",
  dateofbirth: "dob",
  dob: "dob",
  gender: "gender",
  mobile: "mobile",
  alternatemobile: "alternateMobile",
  email: "email",
  address: "address",
  pincode: "pincode",
  status: "status",
  showfathername: "showFatherName",
  showsurname: "showSurname",
};

const text = (value) =>
  value === undefined || value === null
    ? ""
    : String(value).trim();


const normalizeDate = (value) => {
  if (value === "" || value === null || value === undefined) {
    return "";
  }

  // Excel date cells parsed as JavaScript Date objects.
  // Use local calendar components instead of toISOString().
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    const year = value.getFullYear();
    const month = String(value.getMonth() + 1).padStart(2, "0");
    const day = String(value.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
  }

  // Excel serial date values.
  if (typeof value === "number") {
    const parsed = XLSX.SSF.parse_date_code(value);

    if (!parsed) return String(value);

    return [
      parsed.y,
      String(parsed.m).padStart(2, "0"),
      String(parsed.d).padStart(2, "0"),
    ].join("-");
  }

  const valueText = String(value).trim();

  // YYYY-MM-DD
  const isoDate = valueText.match(
    /^(\d{4})-(\d{1,2})-(\d{1,2})$/
  );

  if (isoDate) {
    const [, year, month, day] = isoDate;

    return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
  }

  // DD/MM/YYYY or DD-MM-YYYY
  const localDate = valueText.match(
    /^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/
  );

  if (localDate) {
    const [, day, month, year] = localDate;

    return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
  }

  return valueText;
};


const normalizeRow = (row) => {
  const result = {};

  Object.entries(row).forEach(([key, value]) => {
    const normalizedKey = key
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "");

    const targetKey = COLUMN_MAP[normalizedKey];

    if (targetKey) {
      result[targetKey] =
        targetKey === "dob"
          ? normalizeDate(value)
          : text(value);
    }
  });

  result.rollNo = text(result.rollNo);
  result.firstName = text(result.firstName);
  result.surname = text(result.surname);
  result.fatherName = text(result.fatherName);
  result.motherName = text(result.motherName);
  result.relationship = text(result.relationship) || "Father";
  result.gender = text(result.gender);
  result.mobile = text(result.mobile);
  result.alternateMobile = text(result.alternateMobile);
  result.email = text(result.email).toLowerCase();
  result.address = text(result.address);
  result.pincode = text(result.pincode);
  result.status = text(result.status).toLowerCase() || "active";

  return result;
};

const validateRows = (rows) => {
  const seenRollNumbers = new Set();
  const seenEmails = new Set();

  return rows.map((student, index) => {
    const errors = [];

    if (!student.rollNo) errors.push("Roll No is required.");
    if (!student.firstName) errors.push("First Name is required.");
    else if (student.firstName.length < 2 || student.firstName.length > 80) {
      errors.push("First Name must contain 2–80 characters.");
    }

    if (!student.mobile) errors.push("Mobile is required.");
    if (!student.email) errors.push("Email is required.");
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(student.email)) {
      errors.push("Invalid Email.");
    }

    if (student.gender && !["Male", "Female", "Other"].includes(student.gender)) {
      errors.push("Gender must be Male, Female or Other.");
    }

    if (!["active", "inactive"].includes(student.status)) {
      errors.push("Status must be Active or Inactive.");
    }


    if (student.dob) {
    const dateMatch = student.dob.match(
        /^(\d{4})-(\d{2})-(\d{2})$/
    );

    if (!dateMatch) {
        errors.push(
        "Invalid Date of Birth. Use DD/MM/YYYY or YYYY-MM-DD."
        );
    } else {
        const year = Number(dateMatch[1]);
        const month = Number(dateMatch[2]);
        const day = Number(dateMatch[3]);

        // Validate the actual calendar date using UTC components.
        // This avoids the browser's local timezone shifting the date.
        const checkDate = new Date(
        Date.UTC(year, month - 1, day)
        );

        const validDate =
        checkDate.getUTCFullYear() === year &&
        checkDate.getUTCMonth() === month - 1 &&
        checkDate.getUTCDate() === day;

        if (!validDate) {
        errors.push("Invalid Date of Birth.");
        } else {
        // Compare date-only strings using the local calendar date.
        const today = new Date();

        const todayString = [
            today.getFullYear(),
            String(today.getMonth() + 1).padStart(2, "0"),
            String(today.getDate()).padStart(2, "0"),
        ].join("-");

        if (student.dob > todayString) {
            errors.push("Date of Birth cannot be in the future.");
        }
        }
    }
    }


    if (student.rollNo) {
      const key = student.rollNo.toLowerCase();

      if (seenRollNumbers.has(key)) {
        errors.push("Duplicate Roll No inside this Excel file.");
      }

      seenRollNumbers.add(key);
    }

    if (student.email) {
      const key = student.email.toLowerCase();

      if (seenEmails.has(key)) {
        errors.push("Duplicate Email inside this Excel file.");
      }

      seenEmails.add(key);
    }

    if (student.showFatherName) {
      const value = student.showFatherName.toLowerCase();

      if (!["yes", "no", "true", "false", "1", "0"].includes(value)) {
        errors.push("Show Father Name must be Yes or No.");
      } else {
        student.showFatherName = ["yes", "true", "1"].includes(value);
      }
    }

    if (student.showSurname) {
      const value = student.showSurname.toLowerCase();

      if (!["yes", "no", "true", "false", "1", "0"].includes(value)) {
        errors.push("Show Surname must be Yes or No.");
      } else {
        student.showSurname = ["yes", "true", "1"].includes(value);
      }
    }

    return {
      ...student,
      _rowNumber: index + 2,
      _errors: errors,
    };
  });
};

const getCellValue = (row, key) => {
  const value = row[key];

  if (value === undefined || value === null) return "";

  return String(value);
};

export default function StudentExcelImport({
  onClose,
  onImported,
}) {
  const fileInputRef = useRef(null);

  const [fileName, setFileName] = useState("");
  const [rows, setRows] = useState([]);
  const [report, setReport] = useState(null);
  const [error, setError] = useState("");
  const [reading, setReading] = useState(false);
  const [importing, setImporting] = useState(false);

  const validRows = rows.filter((row) => row._errors.length === 0);
  const invalidRows = rows.filter((row) => row._errors.length > 0);


const downloadTemplate = () => {
  const workbook = XLSX.utils.book_new();

  // Main student data worksheet
  const studentSheet = XLSX.utils.aoa_to_sheet([COLUMNS]);

  studentSheet["!cols"] = [
    { wch: 18 }, // Roll No
    { wch: 20 }, // First Name
    { wch: 18 }, // Surname
    { wch: 22 }, // Father Name
    { wch: 22 }, // Mother Name
    { wch: 18 }, // Relationship
    { wch: 16 }, // DOB
    { wch: 14 }, // Gender
    { wch: 18 }, // Mobile
    { wch: 20 }, // Alternate Mobile
    { wch: 30 }, // Email
    { wch: 36 }, // Address
    { wch: 14 }, // Pincode
    { wch: 14 }, // Status
    { wch: 20 }, // Show Father Name
    { wch: 18 }, // Show Surname
  ];

  studentSheet["!autofilter"] = {
    ref: `A1:${XLSX.utils.encode_col(COLUMNS.length - 1)}1`,
  };

  XLSX.utils.book_append_sheet(
    workbook,
    studentSheet,
    "Students"
  );

  // Instructions worksheet
  const instructions = [
    ["EMS STUDENT BULK IMPORT - INSTRUCTIONS"],
    [""],
    ["REQUIRED FIELDS"],
    ["Roll No", "Required and must be unique. Maximum 50 characters."],
    ["First Name", "Required. 2 to 80 characters."],
    ["Mobile", "Required. Maximum 20 characters."],
    ["Email", "Required, valid and unique. Maximum 150 characters."],
    [""],
    ["OPTIONAL FIELDS"],
    ["Surname", "Maximum 80 characters."],
    ["Father Name", "Maximum 100 characters."],
    ["Mother Name", "Maximum 100 characters."],
    ["Relationship", "Defaults to Father."],
    ["Date of Birth", "DD/MM/YYYY or YYYY-MM-DD. Future dates are not allowed."],
    ["Gender", "Male, Female, Other or blank."],
    ["Alternate Mobile", "Maximum 20 characters."],
    ["Address", "Maximum 500 characters."],
    ["Pincode", "Maximum 10 characters."],
    ["Status", "active or inactive. Defaults to active."],
    ["Show Father Name", "Yes or No. Defaults to Yes."],
    ["Show Surname", "Yes or No. Defaults to Yes."],
    [""],
    ["IMPORT RULES"],
    ["Maximum records", "200 students per import."],
    ["Maximum file size", "5 MB."],
    ["Supported files", ".xlsx and .xls."],
    ["Duplicate Roll No", "Rejected. Roll Number must be unique."],
    ["Duplicate Email", "Rejected. Email must be unique."],
    ["Import behavior", "Creates new student profiles only. Does not update existing students."],
    [""],
    ["IMPORTANT"],
    ["Profile Image", "Upload separately."],
    ["Signature", "Upload separately."],
    ["Student Documents", "Upload separately through Student Documents."],
    ["Admissions", "Manage courses and batches through Admissions."],
    ["Login Credentials", "Create separately through student credentials."],
    [""],
    ["DATA ENTRY TIPS"],
    ["Roll No, Mobile, Alternate Mobile and Pincode", "Format as Text to preserve leading zeroes and + signs."],
    ["Column headings", "Do not rename or remove the column headings."],
  ];

  const instructionSheet = XLSX.utils.aoa_to_sheet(instructions);

  instructionSheet["!cols"] = [
    { wch: 35 },
    { wch: 85 },
  ];

  XLSX.utils.book_append_sheet(
    workbook,
    instructionSheet,
    "Instructions"
  );

  // Field reference worksheet
  const fieldReference = [
    ["Excel Column", "Student.js Field", "Required"],
    ["Roll No", "rollNo", "Yes"],
    ["First Name", "firstName", "Yes"],
    ["Surname", "surname", "No"],
    ["Father Name", "fatherName", "No"],
    ["Mother Name", "motherName", "No"],
    ["Relationship", "relationship", "No"],
    ["Date of Birth", "dob", "No"],
    ["Gender", "gender", "No"],
    ["Mobile", "mobile", "Yes"],
    ["Alternate Mobile", "alternateMobile", "No"],
    ["Email", "email", "Yes"],
    ["Address", "address", "No"],
    ["Pincode", "pincode", "No"],
    ["Status", "status", "No"],
    ["Show Father Name", "showFatherName", "No"],
    ["Show Surname", "showSurname", "No"],
  ];

  const referenceSheet = XLSX.utils.aoa_to_sheet(fieldReference);

  referenceSheet["!cols"] = [
    { wch: 28 },
    { wch: 28 },
    { wch: 18 },
  ];

  XLSX.utils.book_append_sheet(
    workbook,
    referenceSheet,
    "Field Reference"
  );

  XLSX.writeFile(
    workbook,
    "EMS-Student-Import-Template.xlsx"
  );
};


  const handleFile = async (event) => {
    const file = event.target.files?.[0];

    event.target.value = "";

    if (!file) return;

    setError("");
    setReport(null);
    setRows([]);
    setFileName("");

    if (!/\.(xlsx|xls)$/i.test(file.name)) {
      setError("Please select an Excel .xlsx or .xls file.");
      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      setError("Excel file must be 5 MB or smaller.");
      return;
    }

    try {
      setReading(true);

      const workbook = XLSX.read(await file.arrayBuffer(), {
        type: "array",
        cellDates: true,
      });

      
        const sheetName =
        workbook.SheetNames.find(
            (name) => name.trim().toLowerCase() === "students"
        ) || workbook.SheetNames[0];

        if (!sheetName || !workbook.Sheets[sheetName]) {
        setError(
            "No valid worksheet found. Please upload an Excel file containing student records."
        );
        return;
        }

        const sheet = workbook.Sheets[sheetName];

        const excelRows = XLSX.utils.sheet_to_json(sheet, {
        defval: "",
        raw: true,
        });

        if (!excelRows.length) {
        setError("The selected worksheet does not contain any student records.");
        return;
        }


      if (excelRows.length > MAX_ROWS) {
        setError(`A maximum of ${MAX_ROWS} students can be imported at a time.`);
        return;
      }

      const actualColumns = Object.keys(excelRows[0]).map((key) =>
        key.trim().toLowerCase().replace(/[^a-z0-9]/g, "")
      );

      const requiredColumns = [
        "rollno",
        "firstname",
        "mobile",
        "email",
      ];

      const missing = requiredColumns.filter(
        (column) => !actualColumns.includes(column)
      );

      if (missing.length) {
        setError(
          `Missing required Excel column(s): ${missing.join(", ")}. Download the template and use its headings.`
        );
        return;
      }

      const normalized = excelRows.map(normalizeRow);
      const validated = validateRows(normalized);

      setRows(validated);
      setFileName(file.name);
    } catch {
      setError("Unable to read this Excel file. Please check its format.");
    } finally {
      setReading(false);
    }
  };

  const handleImport = async () => {
    if (!validRows.length || invalidRows.length > 0 || importing) {
      return;
    }

    try {
      setImporting(true);
      setError("");
      setReport(null);

      const students = validRows.map(
        ({ _rowNumber, _errors, ...student }) => student
      );

      const response = await api.post(
        "/students/import",
        { students },
        { silent: true }
      );

      const result = response?.data || {};

      setReport(result);

      if (Number(result.importedCount) > 0) {
        await onImported?.(result);
      }

      if (result.rejectedCount > 0) {
        setError(
          "Some rows were rejected. Review the report below and correct those records in Excel."
        );
      }
    } catch (requestError) {
      setError(
        requestError?.response?.data?.message ||
        requestError?.message ||
        "Student import failed."
      );
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="student-import-backdrop">
      <section
        className="student-import-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="student-import-title"
      >
        <header className="student-import-header">
          <div>
            <h2 id="student-import-title">Import Students from Excel</h2>
            <p>Upload multiple student records using the EMS template.</p>
          </div>

          <button
            type="button"
            className="student-import-close"
            onClick={onClose}
            disabled={importing}
            aria-label="Close import"
          >
            <FiX />
          </button>
        </header>

        <div className="student-import-body">
          <div className="student-import-template">
            <div>
              <strong>Step 1 — Download the template</strong>
              <p>
                Use the official template so the column names and data
                formats match EMS.
              </p>
            </div>

            <button
              type="button"
              onClick={downloadTemplate}
              className="student-import-secondary"
            >
              <FiDownload />
              Download Template
            </button>
          </div>

          <div className="student-import-upload">
            <strong>Step 2 — Select your completed Excel file</strong>

            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls"
              onChange={handleFile}
              hidden
            />

            <button
              type="button"
              className="student-import-select"
              onClick={() => fileInputRef.current?.click()}
              disabled={reading || importing}
            >
              <FiUpload />
              {reading ? "Reading Excel..." : "Choose Excel File"}
            </button>

            {fileName && (
              <span className="student-import-filename">
                {fileName}
              </span>
            )}

            <small>
              Excel .xlsx or .xls · Maximum 5 MB · Maximum 200 records
            </small>
          </div>

          {error && (
            <div className="student-import-message student-import-error">
              <FiAlertCircle />
              <span>{error}</span>
            </div>
          )}

          {rows.length > 0 && (
            <div className="student-import-preview">
              <div className="student-import-preview-heading">
                <div>
                  <strong>Step 3 — Review student records</strong>
                  <p>
                    {rows.length} row(s) · {validRows.length} valid ·{" "}
                    {invalidRows.length} with errors
                  </p>
                </div>
              </div>

              <div className="student-import-summary">
                <span className="student-import-valid-count">
                  <FiCheckCircle />
                  {validRows.length} Valid
                </span>

                <span className="student-import-invalid-count">
                  <FiAlertCircle />
                  {invalidRows.length} Invalid
                </span>
              </div>

              <div className="student-import-table-wrap">
                <table className="student-import-table">
                  <thead>
                    <tr>
                      <th>Excel Row</th>
                      <th>Roll No</th>
                      <th>Student Name</th>
                      <th>Mobile</th>
                      <th>Email</th>
                      <th>Validation</th>
                    </tr>
                  </thead>

                  <tbody>
                    {rows.map((row) => (
                      <tr key={row._rowNumber}>
                        <td>{row._rowNumber}</td>
                        <td>{getCellValue(row, "rollNo")}</td>
                        <td>{getCellValue(row, "firstName")} {getCellValue(row, "surname")}</td>
                        <td>{getCellValue(row, "mobile")}</td>
                        <td>{getCellValue(row, "email")}</td>
                        <td>
                          {row._errors.length === 0 ? (
                            <span className="student-import-valid">
                              Valid
                            </span>
                          ) : (
                            <ul className="student-import-row-errors">
                              {row._errors.map((message, index) => (
                                <li key={index}>{message}</li>
                              ))}
                            </ul>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {invalidRows.length > 0 && (
                <p className="student-import-help">
                  Correct the invalid rows in Excel and upload the corrected
                  file. Import is disabled until the preview has no errors.
                </p>
              )}

              <button
                type="button"
                className="student-import-primary"
                onClick={handleImport}
                disabled={
                  !validRows.length ||
                  invalidRows.length > 0 ||
                  importing
                }
              >
                {importing
                  ? "Importing Students..."
                  : `Import ${validRows.length} Student(s)`}
              </button>
            </div>
          )}

          {report && (
            <div className="student-import-report">
              <h3>Import Result</h3>

              <div className="student-import-report-counts">
                <div>
                  <strong>{report.importedCount || 0}</strong>
                  <span>Imported</span>
                </div>

                <div>
                  <strong>{report.rejectedCount || 0}</strong>
                  <span>Rejected</span>
                </div>
              </div>

              {report.rejected?.length > 0 && (
                <div className="student-import-rejected">
                  <strong>Rows needing correction</strong>

                  <ul>
                    {report.rejected.map((item, index) => (
                      <li key={`${item.row}-${index}`}>
                        Excel row {item.row}: {item.message}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {report.importedCount > 0 && (
                <p className="student-import-success">
                  {report.importedCount} student profile(s) were created.
                </p>
              )}
            </div>
          )}
        </div>

        <footer className="student-import-footer">
          <button
            type="button"
            className="student-import-secondary"
            onClick={onClose}
            disabled={importing}
          >
            Close
          </button>
        </footer>
      </section>
    </div>
  );
}
