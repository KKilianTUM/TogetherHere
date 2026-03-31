import { registerRequest } from "./authApi.js";
import { requireGuest } from "./routeGuards.js";
import { setButtonLoadingState, setFormMessage } from "./authFeedback.js";
import { readRaw, readTrimmed, validateRegisterFields } from "./authValidation.js";
import { getAuthState } from "./authState.js";

const registerForm = document.getElementById("registerForm");
const submitBtn = document.getElementById("registerSubmitBtn");
const formState = document.getElementById("registerFormState");
let submitHandlerAttached = false;

const fieldMap = {
  displayName: {
    input: document.getElementById("registerDisplayNameInput"),
    error: document.getElementById("registerDisplayNameError")
  },
  email: {
    input: document.getElementById("registerEmailInput"),
    error: document.getElementById("registerEmailError")
  },
  password: {
    input: document.getElementById("registerPasswordInput"),
    error: document.getElementById("registerPasswordError")
  }
};

function setFieldError(fieldName, message = "") {
  const field = fieldMap[fieldName];
  if (!field?.input || !field.error) return;

  field.error.textContent = message;
  field.input.setAttribute("aria-invalid", message ? "true" : "false");
}

function clearFieldErrors() {
  setFieldError("displayName");
  setFieldError("email");
  setFieldError("password");
}

function setInlineValidation(errors) {
  setFieldError("displayName", errors.displayName || "");
  setFieldError("email", errors.email || "");
  setFieldError("password", errors.password || "");
}

function registerErrorMessage(status, payloadMessage) {
  if (status === 409) return "An account with this email already exists.";
  if (status === 400) return "Registration details are invalid. Use a stronger password and review your entries.";
  if (status >= 500) return "We could not create your account right now. Please try again shortly.";
  return payloadMessage || "Registration failed. Please try again.";
}

function collectRegisterFields(form) {
  const formData = new FormData(form);
  return {
    displayName: readTrimmed(formData, "displayName"),
    email: readTrimmed(formData, "email"),
    password: readRaw(formData, "password")
  };
}

function validateAndRender(fields) {
  const errors = validateRegisterFields(fields);
  setInlineValidation(errors);
  return errors;
}

async function handleRegisterSubmit(event) {
  event.preventDefault();
  if (!(registerForm instanceof HTMLFormElement)) return;

  if (typeof navigator !== "undefined" && navigator.onLine === false) {
    setFormMessage(
      formState,
      "is-error",
      "You appear to be offline. Reconnect to the internet, then try creating your account again."
    );
    return;
  }

  clearFieldErrors();
  const fields = collectRegisterFields(registerForm);
  const errors = validateAndRender(fields);

  if (Object.keys(errors).length > 0) {
    setFormMessage(formState, "is-error", "Please correct the highlighted fields.");
    return;
  }

  setButtonLoadingState(submitBtn, true, "Create account", "Creating…");
  setFormMessage(formState, "is-loading", "Creating your account…");

  try {
    const result = await registerRequest(fields);

    if (!result.ok) {
      setFormMessage(formState, "is-error", registerErrorMessage(result.status, result.message));
      return;
    }

    setFormMessage(formState, "is-success", "Account created. Redirecting to log in…");
    registerForm.reset();
    clearFieldErrors();

    window.setTimeout(() => {
      window.location.assign("login.html?registered=1");
    }, 700);
  } catch {
    setFormMessage(
      formState,
      "is-error",
      "We could not reach /auth/register. Check your connection and server availability, then try again."
    );
  } finally {
    setButtonLoadingState(submitBtn, false, "Create account", "Creating…");
  }
}

async function initRegisterPage() {
  if (!registerForm) return;

  setButtonLoadingState(submitBtn, true, "Create account", "Checking session…");
  setFormMessage(formState, "is-loading", "Checking your session…");

  await requireGuest({
    redirectTo: "activities.html",
    onError: (message) => {
      setFormMessage(formState, "is-error", `${message} Please refresh and try again.`);
    }
  });

  const authState = getAuthState();
  if (authState.status === "authenticated") return;

  if (authState.status !== "error") {
    setFormMessage(formState, "", "");
  }
  setButtonLoadingState(submitBtn, false, "Create account", "Creating…");

  ["displayName", "email", "password"].forEach((fieldName) => {
    const field = fieldMap[fieldName];
    field?.input?.addEventListener("blur", () => {
      const fields = collectRegisterFields(registerForm);
      const errors = validateRegisterFields(fields);
      setFieldError(fieldName, errors[fieldName] || "");
    });
  });

  if (!submitHandlerAttached) {
    registerForm.addEventListener("submit", handleRegisterSubmit);
    submitHandlerAttached = true;
  }
}

initRegisterPage();
