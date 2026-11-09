import { useState } from "react";
import {
  FiCheckCircle,
  FiShare2,
} from "react-icons/fi";

import certificateService from "../../../services/certificateService";
import {
  default as notification,
  getApiErrorMessage,
} from "../../../utils/notification";

export default function CertificateShareAction({
  certificate,
  onShared,
}) {
  const [sharing, setSharing] = useState(false);
  const [shared, setShared] = useState(
    certificate?.status === "Shared"
  );

  const handleShare = async () => {
    if (!certificate?._id || sharing || shared) return;

    if (
      certificate.generationState !== "Generated" ||
      !certificate.certificateUrl
    ) {
      notification.warning("Generate the PDF before sharing.");
      return;
    }

    const studentName =
      certificate.studentNameSnapshot ||
      "the linked student";

    const confirmed = await notification.confirm({
      title: "Share certificate?",
      text: `Certificate ${certificate.certificateNo || ""} will be shared with ${studentName}. The student will be able to view it in Student Portal → My Certificates.`,
      confirmText: "Yes, share",
      cancelText: "Cancel",
      icon: "question",
      confirmButtonColor: "#2563eb",
    });

    if (!confirmed) return;

    setSharing(true);

    try {
      const response =
        await certificateService.shareCertificate(
          certificate._id
        );

      const data =
        response?.data?.data ??
        response?.data ??
        {};

      if (
        data?.success === false ||
        data?.status === "Generated"
      ) {
        throw new Error(
          data?.message ||
            "The certificate could not be shared."
        );
      }

      setShared(true);

      notification.success(
        data?.message ||
          "Certificate shared with the student successfully."
      );

      if (onShared) {
        await onShared();
      }
    } catch (error) {
      notification.error(
        getApiErrorMessage(error)
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
    </div>
  );
}