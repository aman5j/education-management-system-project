export const buildCertificateVerificationUrl = (
  verificationCode
) => {
  if (!verificationCode || !/^[A-F0-9]{40}$/i.test(verificationCode)) {
    throw new Error("Invalid certificate verification code.");
  }

  let frontendUrl = process.env.FRONTEND_PUBLIC_URL;

  if (!frontendUrl) {
    if (process.env.NODE_ENV === "production") {
      throw new Error(
        "FRONTEND_PUBLIC_URL must be configured in production."
      );
    }

    frontendUrl = "http://localhost:5173";
  }

  let parsed;

  try {
    parsed = new URL(frontendUrl);
  } catch {
    throw new Error("FRONTEND_PUBLIC_URL is not a valid URL.");
  }

  if (
    !["http:", "https:"].includes(parsed.protocol) ||
    parsed.username ||
    parsed.password
  ) {
    throw new Error(
      "FRONTEND_PUBLIC_URL must be a valid HTTP or HTTPS website URL."
    );
  }

  return (
    `${parsed.origin}/verify-certificate/` +
    encodeURIComponent(verificationCode.toUpperCase())
  );
};