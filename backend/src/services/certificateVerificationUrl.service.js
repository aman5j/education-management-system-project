
const getFrontendBaseUrl = () => {
  // Prefer the explicit public URL, but retain compatibility
  // with the FRONTEND_URL already configured in Render.
  const configuredUrl =
    process.env.FRONTEND_PUBLIC_URL ||
    process.env.FRONTEND_URL;

  if (!configuredUrl) {
    if (process.env.NODE_ENV === "production") {
      throw new Error(
        "Set FRONTEND_PUBLIC_URL or FRONTEND_URL in the backend environment."
      );
    }

    return "http://localhost:5173";
  }

  let parsed;

  try {
    parsed = new URL(configuredUrl.trim());
  } catch {
    throw new Error(
      "FRONTEND_PUBLIC_URL or FRONTEND_URL is not a valid URL."
    );
  }

  if (
    !["http:", "https:"].includes(parsed.protocol) ||
    parsed.username ||
    parsed.password
  ) {
    throw new Error(
      "The frontend URL must use HTTP or HTTPS and must not contain credentials."
    );
  }

  return parsed.origin;
};

export const buildCertificateVerificationUrl = (
  verificationCode
) => {
  const code = String(verificationCode || "")
    .trim()
    .toUpperCase();

  if (!/^[A-F0-9]{40}$/.test(code)) {
    throw new Error("Invalid certificate verification code.");
  }

  const frontendBaseUrl = getFrontendBaseUrl();

  return `${frontendBaseUrl}/verify-certificate/${encodeURIComponent(code)}`;
};
