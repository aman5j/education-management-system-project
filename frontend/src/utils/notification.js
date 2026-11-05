
import toast from "react-hot-toast";
import Swal from "sweetalert2";

// --------------------------------------------------
// Shared notification configuration
// --------------------------------------------------

const DEFAULT_CONFIRM_COLOR = "#2563eb";
const DEFAULT_CANCEL_COLOR = "#64748b";

// --------------------------------------------------
// Shared SweetAlert confirmation helper
// --------------------------------------------------

const confirmAction = async ({
  title = "Are you sure?",
  text = "Please confirm this action.",
  confirmText = "Yes, continue",
  cancelText = "Cancel",
  icon = "question",
  confirmButtonColor = DEFAULT_CONFIRM_COLOR,
  reverseButtons = true,
  ...options
} = {}) => {
  const result = await Swal.fire({
    title,
    text,
    icon,
    showCancelButton: true,
    confirmButtonText: confirmText,
    cancelButtonText: cancelText,
    confirmButtonColor,
    cancelButtonColor: DEFAULT_CANCEL_COLOR,
    reverseButtons,
    focusCancel: true,
    allowOutsideClick: false,
    ...options,
  });

  return result.isConfirmed;
};

// --------------------------------------------------
// Main notification utility
// --------------------------------------------------

const notification = {
  // Success toast
  success(message, options = {}) {
    return toast.success(
      message || "Operation completed successfully.",
      {
        duration: 3500,
        ...options,
      }
    );
  },

  // Error toast
  error(message, options = {}) {
    return toast.error(
      message || "Something went wrong. Please try again.",
      {
        duration: 5000,
        ...options,
      }
    );
  },

  // Warning toast
  warning(message, options = {}) {
    return toast(
      message || "Please check the information and try again.",
      {
        icon: "⚠️",
        duration: 4500,
        ...options,
      }
    );
  },

  // Information toast
  info(message, options = {}) {
    return toast(
      message || "Information",
      {
        icon: "ℹ️",
        duration: 3500,
        ...options,
      }
    );
  },

  // Loading toast
  loading(message = "Please wait...", options = {}) {
    return toast.loading(message, options);
  },

  // Promise-based toast
  promise(promiseOrFunction, messages, options = {}) {
    return toast.promise(
      promiseOrFunction,
      messages,
      options
    );
  },

  // Dismiss toast
  dismiss(toastId) {
    if (toastId) {
      toast.dismiss(toastId);
    } else {
      toast.dismiss();
    }
  },

  // Generic confirmation
  confirm: confirmAction,

  // Delete confirmation
  async confirmDelete(itemName = "this record") {
    return confirmAction({
      title: "Delete permanently?",
      text: `Are you sure you want to delete ${itemName}? This action cannot be undone.`,
      icon: "warning",
      confirmText: "Yes, delete",
      confirmButtonColor: "#dc2626",
    });
  },

  // Publish confirmation
  async confirmPublish(itemName = "this item") {
    return confirmAction({
      title: "Publish now?",
      text: `${itemName} will become available to its intended users.`,
      icon: "question",
      confirmText: "Yes, publish",
      confirmButtonColor: "#2563eb",
    });
  },

  // Archive confirmation
  async confirmArchive(itemName = "this item") {
    return confirmAction({
      title: "Archive this item?",
      text: `${itemName} will be archived and will no longer be active.`,
      icon: "warning",
      confirmText: "Yes, archive",
      confirmButtonColor: "#d97706",
    });
  },

  // Status confirmation
  async confirmStatusChange(
    itemName = "this record",
    action = "change its status"
  ) {
    return confirmAction({
      title: "Confirm status change",
      text: `Are you sure you want to ${action} for ${itemName}?`,
      icon: "warning",
      confirmText: "Yes, continue",
      confirmButtonColor: "#d97706",
    });
  },

  // Generic SweetAlert input prompt
  async prompt({
    title = "Enter a value",
    text = "",
    input = "text",
    inputLabel,
    inputPlaceholder = "",
    inputValue = "",
    confirmText = "Submit",
    cancelText = "Cancel",
    icon = "question",
    inputAttributes = {},
    inputValidator,
    allowEmpty = false,
  } = {}) {
    const result = await Swal.fire({
      title,
      text,
      icon,
      input,
      inputLabel,
      inputPlaceholder,
      inputValue,
      inputAttributes: {
        autocomplete: "off",
        ...inputAttributes,
      },
      showCancelButton: true,
      confirmButtonText: confirmText,
      cancelButtonText: cancelText,
      confirmButtonColor: DEFAULT_CONFIRM_COLOR,
      cancelButtonColor: DEFAULT_CANCEL_COLOR,
      reverseButtons: true,
      focusCancel: true,
      allowOutsideClick: false,

      inputValidator: async (value) => {
        if (
          !allowEmpty &&
          !String(value ?? "").trim()
        ) {
          return "This field is required.";
        }

        if (inputValidator) {
          return inputValidator(value);
        }

        return undefined;
      },
    });

    return result.isConfirmed ? result.value : null;
  },

  // Password prompt
  async promptPassword({
    title = "Enter a password",
    text = "",
    confirmText = "Continue",
    minLength = 12,
    maxLength = 128,
  } = {}) {
    return this.prompt({
      title,
      text,
      input: "password",
      inputLabel: "Temporary password",
      inputPlaceholder: "Enter temporary password",
      confirmText,
      inputAttributes: {
        autocomplete: "new-password",
        minlength: String(minLength),
        maxlength: String(maxLength),
      },
      inputValidator: (value) => {
        if (
          value.length < minLength ||
          value.length > maxLength
        ) {
          return `Password must be ${minLength}-${maxLength} characters long.`;
        }

        return undefined;
      },
    });
  },

  // Information / warning / error SweetAlert
  async alert({
    title = "Information",
    text = "",
    icon = "info",
    confirmText = "OK",
  } = {}) {
    return Swal.fire({
      title,
      text,
      icon,
      confirmButtonText: confirmText,
      confirmButtonColor: DEFAULT_CONFIRM_COLOR,
    });
  },
};

// --------------------------------------------------
// Centralized API error message handler
// --------------------------------------------------

export const getApiErrorMessage = (error) => {
  if (!error) {
    return "Something went wrong. Please try again.";
  }

  const status = error.response?.status;

  if (error.response?.data?.message) {
    return error.response.data.message;
  }

  if (error.response?.data?.error) {
    return error.response.data.error;
  }

  if (status === 400) {
    return "Invalid request. Please check your information.";
  }

  if (status === 401) {
    return "Your session has expired. Please log in again.";
  }

  if (status === 403) {
    return "You do not have permission to perform this action.";
  }

  if (status === 404) {
    return "The requested record could not be found.";
  }

  if (status === 409) {
    return "This operation conflicts with existing data.";
  }

  if (status === 413) {
    return "The uploaded file is too large.";
  }

  if (status >= 500) {
    return "Server error. Please try again later.";
  }

  if (error.code === "ECONNABORTED") {
    return "The request timed out. Please try again.";
  }

  if (error.code === "ERR_NETWORK" || error.message === "Network Error") {
    return "Unable to connect to the server. Check your internet connection.";
  }

  return error.message || "Something went wrong. Please try again.";
};

// --------------------------------------------------
// Show standardized API error
// --------------------------------------------------

export const showApiError = (error, options = {}) => {
  return notification.error(
    getApiErrorMessage(error),
    options
  );
};

export default notification;
