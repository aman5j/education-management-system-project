
import { useEffect, useState } from "react";
import { FiX } from "react-icons/fi";

import {
  getStudentAlertNotices,
  dismissStudentAlertNotice,
} from "../../services/alertNoticeService";

import { getAssetUrl } from "../../utils/assetUrl";

import "./StudentAlertNoticePopup.css";

export default function StudentAlertNoticePopup() {
  const [notices, setNotices] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [imageFailed, setImageFailed] = useState(false);

  useEffect(() => {
    let active = true;

    const loadNotices = async () => {
      try {
        const response = await getStudentAlertNotices();

        if (!active) return;

        const items = Array.isArray(response?.data?.data)
          ? response.data.data
          : [];

        setNotices(items);
      } catch (error) {
        console.error("Unable to load alert notices:", error);
      } finally {
        if (active) setLoading(false);
      }
    };

    loadNotices();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    setImageFailed(false);
  }, [currentIndex]);

  const handleClose = async () => {
    const currentNotice = notices[currentIndex];

    if (!currentNotice) return;

    // Close immediately for a smooth student experience.
    setCurrentIndex((previous) => previous + 1);

    try {
      await dismissStudentAlertNotice(currentNotice._id);
    } catch (error) {
      console.error("Unable to save notice dismissal:", error);
    }
  };

  const currentNotice = notices[currentIndex];

  if (loading || !currentNotice) {
    return null;
  }

  const imageUrl = getAssetUrl(currentNotice.image);

  return (
    <div
      className="student-alert-overlay"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          handleClose();
        }
      }}
    >
      <section
        className="student-alert-modal"
        role="dialog"
        aria-modal="true"
        aria-label={currentNotice.title}
      >
        <button
          type="button"
          className="student-alert-close"
          onClick={handleClose}
          aria-label="Close alert notice"
        >
          <FiX />
        </button>

        {imageFailed ? (
          <div className="student-alert-image-error">
            <strong>{currentNotice.title}</strong>
            <p>Notice image could not be loaded.</p>
            <button type="button" onClick={handleClose}>
              Close Notice
            </button>
          </div>
        ) : (
          <img
            className="student-alert-image"
            src={imageUrl}
            alt={currentNotice.title}
            onError={() => setImageFailed(true)}
          />
        )}

        {notices.length > 1 && (
          <div className="student-alert-counter">
            {currentIndex + 1} of {notices.length}
          </div>
        )}
      </section>
    </div>
  );
}
