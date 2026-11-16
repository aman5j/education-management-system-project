
import { useRef } from "react";

import notification from "../../../../utils/notification";
// import { getAssetUrl } from "../../../../utils/assetUrl";

import {
  FiPlus,
  FiImage,
  FiTrash2,
  FiUpload,
  FiChevronUp,
  FiChevronDown,
} from "react-icons/fi";



export default function BannerControls({
  slides = [],
  uploading = false,
  onUpload,
  onDelete,
  onReorder,
}) {
  const addInputRef = useRef(null);

  const validateFile = (file) => {
    if (!file) return false;

    const allowedTypes = [
      "image/jpeg",
      "image/png",
      "image/webp",
    ];

    if (!allowedTypes.includes(file.type)) {
      notification.warning("Choose a JPG, PNG or WEBP image.");
      return false;
    }

    if (file.size > 8 * 1024 * 1024) {
      notification.warning("Banner image must be 8 MB or smaller.");
      return false;
    }

    return true;
  };

  const handleAddImage = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!validateFile(file)) return;

    await onUpload(file, "");
  };

  const handleReplaceImage = async (event, slideKey) => {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!validateFile(file)) return;

    await onUpload(file, slideKey);
  };

  const moveSlide = (index, direction) => {
    const nextIndex = index + direction;

    if (nextIndex < 0 || nextIndex >= slides.length) return;

    const nextSlides = [...slides];

    [nextSlides[index], nextSlides[nextIndex]] = [
      nextSlides[nextIndex],
      nextSlides[index],
    ];

    onReorder(nextSlides.map((slide) => slide.key));
  };

  return (
    <div className="we-banner-controls">
      <div className="we-control-block">
        <div className="we-banner-heading">
          <div>
            <h4>Banner Slides</h4>
            <p>Upload the images displayed in your homepage banner.</p>
          </div>

          <span className="we-banner-count">
            {slides.length}/10
          </span>
        </div>

        <div className="we-banner-note">
          <FiImage />
          <span>
            Each slide contains one image only. Images are saved
            automatically after upload.
          </span>
        </div>
      </div>

      {slides.map((slide, index) => (
        <div className="we-banner-slide-card" key={slide.key}>
          <div className="we-banner-slide-top">
            <strong>Slide {index + 1}</strong>

            <div className="we-banner-slide-actions">
              <button
                type="button"
                title="Move slide up"
                aria-label={`Move slide ${index + 1} up`}
                disabled={index === 0 || uploading}
                onClick={() => moveSlide(index, -1)}
              >
                <FiChevronUp />
              </button>

              <button
                type="button"
                title="Move slide down"
                aria-label={`Move slide ${index + 1} down`}
                disabled={index === slides.length - 1 || uploading}
                onClick={() => moveSlide(index, 1)}
              >
                <FiChevronDown />
              </button>

              <button
                type="button"
                className="danger"
                title="Delete slide"
                aria-label={`Delete slide ${index + 1}`}
                disabled={uploading}
                onClick={() => onDelete(slide.key)}
              >
                <FiTrash2 />
              </button>
            </div>
          </div>

          <div className="we-banner-image-preview">
            {slide.imageUrl ? (
              <img
                src={slide.imageUrl}
                alt={`Banner slide ${index + 1}`}
              />
            // <img
            // src={getAssetUrl(slide.imageUrl)}
            // alt={`Banner slide ${index + 1}`}
            // onError={(event) => {
            //     console.error("Banner image failed:", {
            //     url: event.currentTarget.src,
            //     slideKey: slide.key,
            //     });
            // }}
            // />
            ) : (
              <div className="we-banner-image-empty">
                <FiImage />
                <span>No image selected</span>
              </div>
            )}
          </div>

          <label className="we-banner-upload-button">
            <FiUpload />
            {uploading ? "Uploading..." : "Replace Image"}

            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              disabled={uploading}
              onChange={(event) =>
                handleReplaceImage(event, slide.key)
              }
            />
          </label>
        </div>
      ))}

      {slides.length === 0 && (
        <div className="we-banner-empty">
          <FiImage />
          <strong>No banner slides added</strong>
          <span>Upload your first homepage banner image.</span>
        </div>
      )}

      <input
        ref={addInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        hidden
        disabled={uploading}
        onChange={handleAddImage}
      />

      <button
        type="button"
        className="we-banner-add-button"
        disabled={slides.length >= 10 || uploading}
        onClick={() => addInputRef.current?.click()}
      >
        <FiPlus />
        Add Slide
      </button>

      <p className="we-banner-footer-note">
        Maximum 10 slides. Supported formats: JPG, PNG and WEBP.
        Maximum image size: 8 MB.
      </p>
    </div>
  );
}
