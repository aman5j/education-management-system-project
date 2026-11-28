
import { createElement as h } from "react";
import toast from "react-hot-toast";
import Swal from "sweetalert2";

import {
  FiCheckCircle,
  FiAlertTriangle,
  FiInfo,
  FiXCircle,
  FiX,
} from "react-icons/fi";

const DEFAULT_ERROR =
  "Something went wrong. Please try again.";


/* =========================================
   EMS GLOBAL SWEETALERT ICON SYSTEM
========================================= */

const sweetAlertIconMarkup = {
  warning: `
    <svg viewBox="0 0 100 100"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="Warning">
      <path
        d="M50 9 L94 87 H6 Z"
        fill="none"
        stroke="#EA8A20"
        stroke-width="7"
        stroke-linejoin="round"
      />
      <path
        d="M50 34 V59 M50 72 V74"
        fill="none"
        stroke="#EA8A20"
        stroke-width="8"
        stroke-linecap="round"
      />
    </svg>
  `,

  // success: `
  //   <svg viewBox="0 0 100 100"
  //     xmlns="http://www.w3.org/2000/svg"
  //     role="img"
  //     aria-label="Success">
  //     <circle
  //       cx="50" cy="50" r="41"
  //       fill="none"
  //       stroke="#16A34A"
  //       stroke-width="7"
  //     />
  //     <path
  //       d="M29 51 L44 66 L72 36"
  //       fill="none"
  //       stroke="#16A34A"
  //       stroke-width="8"
  //       stroke-linecap="round"
  //       stroke-linejoin="round"
  //     />
  //   </svg>
  // `,

  info: `
    <svg viewBox="0 0 100 100"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="Information">
      <circle
        cx="50" cy="50" r="41"
        fill="none"
        stroke="#2563EB"
        stroke-width="7"
      />
      <path
        d="M50 44 V69"
        stroke="#2563EB"
        stroke-width="8"
        stroke-linecap="round"
      />
      <circle cx="50" cy="30" r="4" fill="#2563EB"/>
    </svg>
  `,

  error: `
    <svg viewBox="0 0 100 100"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="Error">
      <circle
        cx="50" cy="50" r="41"
        fill="none"
        stroke="#DC2626"
        stroke-width="7"
      />
      <path
        d="M34 34 L66 66 M66 34 L34 66"
        stroke="#DC2626"
        stroke-width="8"
        stroke-linecap="round"
      />
    </svg>
  `,

  question: `
    <svg viewBox="0 0 100 100"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="Question">
      <circle
        cx="50" cy="50" r="41"
        fill="none"
        stroke="#2563EB"
        stroke-width="7"
      />
      <path
        d="M36 37 C37 20 65 19 68 36 C70 48 51 50 50 64"
        fill="none"
        stroke="#2563EB"
        stroke-width="8"
        stroke-linecap="round"
      />
      <circle cx="50" cy="78" r="4" fill="#2563EB"/>
    </svg>
  `,
};

const getSweetAlertIconOptions = (icon) => {
  const normalizedIcon = String(icon || "question").toLowerCase();

  const iconHtml = sweetAlertIconMarkup[normalizedIcon];

  // Preserve SweetAlert2's default icon for unsupported types.
  if (!iconHtml) {
    return { icon: normalizedIcon };
  }

  return {
    icon: normalizedIcon,
    iconHtml,
    customClass: {
      icon: "ems-swal-custom-icon",
    },
  };
};


/* =========================================
   TOAST CONFIGURATION
========================================= */

const toastConfig = {
  success: {
    icon: FiCheckCircle,
    color: "#16a34a",
    background: "#f0fdf4",
    border: "#16a34a",
    duration: 3800,
  },

  warning: {
    icon: FiAlertTriangle,
    color: "#d97706",
    background: "#fffbeb",
    border: "#f59e0b",
    duration: 4500,
  },

  info: {
    icon: FiInfo,
    color: "#2563eb",
    background: "#eff6ff",
    border: "#2563eb",
    duration: 3500,
  },

  error: {
    icon: FiXCircle,
    color: "#dc2626",
    background: "#fef2f2",
    border: "#dc2626",
    duration: 5000,
  },
};

/* =========================================
   GLOBAL CUSTOM TOAST
========================================= */

const showToast = (
  type,
  title,
  message,
  options = {}
) => {
  const config = toastConfig[type];

  const Icon = config.icon;

  return toast.custom(
    (t) =>
      h(
        "div",
        {
          className: `ems-toast ems-toast-${type} ${
            t.visible
              ? "ems-toast-visible"
              : "ems-toast-hidden"
          }`,

          role: type === "error" ? "alert" : "status",

          "aria-live":
            type === "error" ? "assertive" : "polite",

          style: {
            "--toast-color": config.color,
            "--toast-bg": config.background,
            "--toast-border": config.border,
          },
        },

        /* ICON */
        h(
          "div",
          { className: "ems-toast-icon" },
          h(Icon, { size: 20 })
        ),

        /* CONTENT */
        h(
          "div",
          { className: "ems-toast-content" },

          h(
            "div",
            { className: "ems-toast-title" },
            title
          ),

          h(
            "div",
            { className: "ems-toast-message" },
            message
          )
        ),

        /* CLOSE BUTTON */
        h(
          "button",
          {
            type: "button",
            className: "ems-toast-close",
            onClick: () => toast.dismiss(t.id),
            "aria-label": "Close notification",
            title: "Close",
          },
          h(FiX, { size: 17 })
        )
      ),

    {
      duration: config.duration,
      position: "top-right",
      ...options,
    }
  );
};

/* =========================================
   NOTIFICATION METHODS
========================================= */

const notification = {
  success(message, options = {}) {
    return showToast(
      "success",
      "Success",
      message || "Operation completed successfully.",
      options
    );
  },

  error(message, options = {}) {
    return showToast(
      "error",
      "Error",
      message || DEFAULT_ERROR,
      options
    );
  },

  warning(message, options = {}) {
    return showToast(
      "warning",
      "Warning",
      message ||
        "Please check the information and try again.",
      options
    );
  },

  info(message, options = {}) {
    return showToast(
      "info",
      "Information",
      message || "Here is some information.",
      options
    );
  },

  loading(message = "Please wait...") {
    return toast.loading(message);
  },

  dismiss(toastId) {
    if (toastId) {
      toast.dismiss(toastId);
    } else {
      toast.dismiss();
    }
  },

  /* =========================================
     SWEETALERT CONFIRMATION
  ========================================= */


  async confirm({
    title = "Are you sure?",
    text = "Please confirm this action.",
    confirmText = "Yes",
    cancelText = "Cancel",
    icon = "question",
    confirmButtonColor = "#2563eb",
    reverseButtons = true,
  } = {}) {
    const result = await Swal.fire({
      title,
      text,

      // Centralized custom SweetAlert icon
      ...getSweetAlertIconOptions(icon),

      showCancelButton: true,
      confirmButtonText: confirmText,
      cancelButtonText: cancelText,
      confirmButtonColor,
      cancelButtonColor: "#64748b",
      reverseButtons,
      focusCancel: true,
      allowOutsideClick: false,
    });

    return result.isConfirmed;
  },



  /* =========================================
     DELETE CONFIRMATION
  ========================================= */

  async confirmDelete(itemName = "this record") {
    return this.confirm({
      title: "Delete permanently?",
      text: `Are you sure you want to delete ${itemName}? This action cannot be undone.`,

      // Orange warning icon
      icon: "warning",

      confirmText: "Yes",
      cancelText: "Cancel",

      // Red destructive action button
      confirmButtonColor: "#dc2626",
    });
  },

  /* =========================================
     PUBLISH CONFIRMATION
  ========================================= */

  async confirmPublish(itemName = "this item") {
    return this.confirm({
      title: "Publish now?",
      text: `${itemName} will become available to its intended users.`,

      // Blue question icon
      icon: "question",

      confirmText: "Yes",
      cancelText: "Cancel",

      confirmButtonColor: "#2563eb",
    });
  },

  /* =========================================
     ARCHIVE CONFIRMATION
  ========================================= */

  async confirmArchive(itemName = "this item") {
    return this.confirm({
      title: "Archive this item?",
      text: `${itemName} will be archived and will no longer be active.`,

      // Orange warning icon
      icon: "warning",

      confirmText: "Yes",
      cancelText: "Cancel",

      confirmButtonColor: "#d97706",
    });
  },

  /* =========================================
     STATUS CHANGE CONFIRMATION
  ========================================= */

  async confirmStatusChange({
    itemName = "this account",
    action = "suspend",
  } = {}) {
    const isSuspend =
      action.toLowerCase() === "suspend";

    return this.confirm({
      title: isSuspend
        ? "Suspend account?"
        : "Reactivate account?",

      text: isSuspend
        ? `${itemName} will lose access to the system.`
        : `${itemName} will regain access to the system.`,

      // Different center icons
      icon: isSuspend ? "warning" : "success",

      confirmText: isSuspend
        ? "Yes"
        : "Yes",

      cancelText: "Cancel",

      // Different confirmation button colors
      confirmButtonColor: isSuspend
        ? "#dc2626"
        : "#16a34a",
    });
  },


  /* =========================================
     PASSWORD PROMPT
  ========================================= */

  async promptPassword({
    title = "Reset password",
    text = "Enter the new temporary password.",
    confirmText = "Reset password",
    minLength = 12,
    maxLength = 128,
  } = {}) {
    const result = await Swal.fire({
      title,
      text,

      ...getSweetAlertIconOptions("info"),

      input: "password",
      inputPlaceholder: "Enter new password",

      inputAttributes: {
        autocapitalize: "off",
        autocomplete: "new-password",
        minlength: String(minLength),
        maxlength: String(maxLength),
        autocorrect: "off",
      },

      showCancelButton: true,
      confirmButtonText: confirmText,
      cancelButtonText: "Cancel",
      confirmButtonColor: "#2563eb",
      cancelButtonColor: "#64748b",
      reverseButtons: true,
      focusCancel: true,
      allowOutsideClick: false,

      inputValidator: (value) => {
        if (!value) {
          return "Please enter a password.";
        }

        if (value.length < minLength) {
          return `Password must contain at least ${minLength} characters.`;
        }

        if (value.length > maxLength) {
          return `Password cannot exceed ${maxLength} characters.`;
        }

        return undefined;
      },
    });

    if (!result.isConfirmed) {
      return null;
    }

    return result.value;
  },

  /* =========================================
     INFORMATION ALERT
  ========================================= */


  async alert({
    title = "Information",
    text = "",
    icon = "info",
    confirmText = "OK",
  } = {}) {
    return Swal.fire({
      title,
      text,

      // Centralized custom SweetAlert icon
      ...getSweetAlertIconOptions(icon),

      confirmButtonText: confirmText,
      confirmButtonColor: "#2563eb",
    });
  },

};

/* =========================================
   API ERROR MESSAGE HANDLER
========================================= */

export const getApiErrorMessage = (error) => {
  if (!error) {
    return DEFAULT_ERROR;
  }

  const responseData = error.response?.data;

  if (responseData?.message) {
    return responseData.message;
  }

  if (typeof responseData?.error === "string") {
    return responseData.error;
  }

  if (error.response?.status === 401) {
    return "Your session has expired. Please log in again.";
  }

  if (error.response?.status === 403) {
    return "You do not have permission to perform this action.";
  }

  if (error.response?.status === 404) {
    return "The requested record could not be found.";
  }

  if (error.response?.status === 413) {
    return "The uploaded file is too large.";
  }

  if (error.response?.status >= 500) {
    return "Server error. Please try again later.";
  }

  if (
    error.code === "ERR_NETWORK" ||
    error.message === "Network Error"
  ) {
    return "Unable to connect to the server. Check your internet connection.";
  }

  if (error.code === "ECONNABORTED") {
    return "The request timed out. Please try again.";
  }

  return error.message || DEFAULT_ERROR;
};

/* =========================================
   GLOBAL API ERROR
========================================= */

export const showApiError = (error) => {
  return notification.error(
    getApiErrorMessage(error)
  );
};

export default notification;
