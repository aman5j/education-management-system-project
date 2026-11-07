
import { useCallback, useEffect, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";

import { createAttendance } from "../../services/attendanceService";

import notification, {
  getApiErrorMessage,
} from "../../utils/notification";

const QR_FORMAT = /^EMS-STUDENT:([a-f\d]{24})$/i;

const AttendanceQRScanner = ({
  courseId,
  batchId,
  date,
  onSuccess,
}) => {
  const scannerRef = useRef(null);
  const busyRef = useRef(false);
  const mountedRef = useRef(false);
  const startingRef = useRef(false);

  const [scanning, setScanning] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [starting, setStarting] = useState(false);

  const stopScanner = useCallback(async () => {
    const scanner = scannerRef.current;
    scannerRef.current = null;

    if (scanner) {
      try {
        if (scanner.isScanning) {
          await scanner.stop();
        }
      } catch (stopError) {
        console.warn("Unable to stop QR scanner:", stopError);
      }

      try {
        scanner.clear();
      } catch {
        // Scanner may already have been cleared.
      }
    }

    if (mountedRef.current) {
      setScanning(false);
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;

    return () => {
      mountedRef.current = false;

      const scanner = scannerRef.current;
      scannerRef.current = null;

      if (scanner) {
        const cleanup = async () => {
          try {
            if (scanner.isScanning) {
              await scanner.stop();
            }
          } catch {
            // Camera may already be stopped.
          }

          try {
            scanner.clear();
          } catch {
            // Already cleared.
          }
        };

        void cleanup();
      }
    };
  }, []);

  const handleDecodedQR = useCallback(
    async (decodedText) => {
      if (busyRef.current) return;

      busyRef.current = true;

      try {
        setError("");
        setMessage("");

        const match = decodedText.trim().match(QR_FORMAT);

        if (!match) {
          const text =
            "Invalid EMS student QR code. Scan the official student QR code.";

          setError(text);
          notification.warning(text);
          return;
        }

        if (!courseId || !batchId || !date) {
          const text = "Select a course, batch, and date first.";

          setError(text);
          notification.warning(text);
          return;
        }

        setMessage("QR detected. Recording attendance...");

        await createAttendance({
          student_id: match[1],
          course_id: courseId,
          batch_id: batchId,
          attendance_date: date,
          status: "Present",
          remarks: "Recorded by QR scan",
        });

        if (!mountedRef.current) return;

        const successMessage = "Attendance recorded successfully.";

        setMessage(successMessage);
        notification.success(successMessage);

        await stopScanner();

        if (
          mountedRef.current &&
          typeof onSuccess === "function"
        ) {
          await onSuccess();
        }
      } catch (requestError) {
        if (!mountedRef.current) return;

        const messageText = getApiErrorMessage(requestError);

        setMessage("");
        setError(messageText);
        notification.error(messageText);
      } finally {
        busyRef.current = false;
      }
    },
    [courseId, batchId, date, onSuccess, stopScanner]
  );

  const startScanner = async () => {
    if (startingRef.current || scannerRef.current) return;

    if (!courseId || !batchId || !date) {
      const text = "Select a course, batch, and date first.";

      setError(text);
      notification.warning(text);
      return;
    }

    startingRef.current = true;
    setStarting(true);
    setError("");
    setMessage("");

    let scanner;

    try {
      scanner = new Html5Qrcode("attendance-qr-reader");
      scannerRef.current = scanner;

      await scanner.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        handleDecodedQR,
        () => {
          // Ignore normal camera frames without a QR code.
        }
      );

      if (!mountedRef.current || scannerRef.current !== scanner) {
        try {
          if (scanner.isScanning) await scanner.stop();
        } catch {
          // Ignore cleanup errors.
        }

        try {
          scanner.clear();
        } catch {
          // Already cleared.
        }

        return;
      }

      setScanning(true);
    } catch (requestError) {
      if (scannerRef.current === scanner) {
        scannerRef.current = null;
      }

      try {
        if (scanner?.isScanning) {
          await scanner.stop();
        }
      } catch {
        // Camera may not have started.
      }

      try {
        scanner?.clear();
      } catch {
        // Already cleared.
      }

      if (mountedRef.current) {
        setScanning(false);

        const text =
          "Could not start the camera. Check camera permission and ensure the page is served over HTTPS or localhost.";

        setError(text);
        notification.error(text);
      }
    } finally {
      startingRef.current = false;

      if (mountedRef.current) {
        setStarting(false);
      }
    }
  };

  return (
    <section className="attendance-card attendance-qr-card">
      <div className="attendance-qr-heading">
        <div>
          <h2>QR Attendance Scanner</h2>
          <p>
            Scan an official EMS student QR code to record attendance
            for the selected course, batch, and date.
          </p>
        </div>

        {!scanning ? (
          <button
            type="button"
            className="attendance-primary-button"
            onClick={startScanner}
            disabled={starting || scanning}
          >
            {starting ? "Starting..." : "Start Scanner"}
          </button>
        ) : (
          <button
            type="button"
            className="attendance-secondary-button"
            onClick={stopScanner}
          >
            Stop Scanner
          </button>
        )}
      </div>

      <div
        id="attendance-qr-reader"
        className="attendance-qr-reader"
      />

      {error && (
        <div className="attendance-error" role="alert">
          {error}
        </div>
      )}

      {message && (
        <div className="attendance-success" role="status">
          {message}
        </div>
      )}

      <p className="attendance-qr-note">
        Keep the camera pointed at the official EMS student QR code.
        Duplicate attendance is rejected by the backend.
      </p>
    </section>
  );
};

export default AttendanceQRScanner;
