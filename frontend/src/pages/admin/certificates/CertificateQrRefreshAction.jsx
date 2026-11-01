import { useState } from "react";
import { FiRefreshCw } from "react-icons/fi";
import certificateService from "../../../services/certificateService";

export default function CertificateQrRefreshAction({
  certificate,
  onRefreshed,
}) {
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const handleRefresh = async () => {
    if (
      !certificate?._id ||
      refreshing ||
      certificate.generationState !== "Generated" ||
      certificate.status === "Revoked"
    ) {
      return;
    }

    const confirmed = window.confirm(
      `Refresh the PDF for certificate ${certificate.certificateNo}?\n\nThe existing certificate number and verification code will remain unchanged.`
    );

    if (!confirmed) return;

    setRefreshing(true);
    setError("");

    try {
      const response =
        await certificateService.refreshCertificateQr(
          certificate._id
        );

      const data = response?.data?.data;

      if (!data?.certificateUrl) {
        throw new Error(
          "The server did not return the refreshed PDF URL."
        );
      }

      if (onRefreshed) {
        await onRefreshed();
      }
    } catch (err) {
      setError(
        err?.response?.data?.message ||
          err?.message ||
          "Unable to refresh certificate QR."
      );
    } finally {
      setRefreshing(false);
    }
  };

  if (
    certificate?.generationState !== "Generated" ||
    certificate?.status === "Revoked"
  ) {
    return null;
  }

  return (
    <div className="cert-share-action">
      <button
        type="button"
        className="cert-share-button"
        onClick={handleRefresh}
        disabled={refreshing}
        title="Refresh the PDF and QR verification link"
      >
        <FiRefreshCw
          className={refreshing ? "cert-spin" : ""}
        />
        {refreshing ? "Refreshing..." : "Refresh QR"}
      </button>

      {error && (
        <span
          className="cert-share-error"
          title={error}
          role="alert"
        >
          {error}
        </span>
      )}
    </div>
  );
}