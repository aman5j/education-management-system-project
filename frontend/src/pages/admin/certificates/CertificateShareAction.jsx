import { useState } from "react";
import {
  FiCheckCircle,
  FiShare2,
} from "react-icons/fi";

import certificateService from "../../../services/certificateService";

export default function CertificateShareAction({
  certificate,
  onShared,
}) {
  const [sharing, setSharing] = useState(false);
  const [error, setError] = useState("");
  const [shared, setShared] = useState(
    certificate?.status === "Shared"
  );

  const handleShare = async () => {
    if (!certificate?._id || sharing || shared) return;

    if (
      certificate.generationState !== "Generated" ||
      !certificate.certificateUrl
    ) {
      setError("Generate the PDF before sharing.");
      return;
    }

    const confirmed = window.confirm(
      `Share certificate ${certificate.certificateNo} with ${certificate.studentNameSnapshot || "the linked student"}?\n\nThe student will be able to see it in Student Portal → My Certificates.`
    );

    if (!confirmed) return;

    setSharing(true);
    setError("");

    try {
      const response =
        await certificateService.shareCertificate(
          certificate._id
        );

      const data = response?.data?.data;

      // !!!!!!! START
      setShared(true);
      // !!!!!!! END

      setShared(data?.status === "Shared" || true);

      if (onShared) {
        await onShared();
      }
    } catch (err) {
      setError(
        err?.response?.data?.message ||
          err?.message ||
          "Unable to share this certificate."
      );
    } finally {
      setSharing(false);
    }
  };

  if (shared || certificate?.status === "Shared") {
    return (
      <span
        className="cert-share-complete"
        title="This certificate is shared with the student"
      >
        <FiCheckCircle />
        Shared
      </span>
    );
  }

  if (
    certificate?.generationState !== "Generated" ||
    !certificate?.certificateUrl
  ) {
    return null;
  }

  return (
    <div className="cert-share-action">
      <button
        type="button"
        className="cert-share-button"
        onClick={handleShare}
        disabled={sharing}
        title="Share certificate with student"
      >
        <FiShare2 />
        {sharing ? "Sharing..." : "Share"}
      </button>

      {error && (
        <span
          className="cert-share-error"
          title={error}
        >
          {error}
        </span>
      )}
    </div>
  );
}