import { registerRequest } from "./authApi.js";
import { requireGuest } from "./routeGuards.js";
import { setButtonLoadingState, setFormMessage } from "./authFeedback.js";
import { readRaw, readTrimmed, validateRegisterFields } from "./authValidation.js";

const registerForm = document.getElementById("registerForm");
const submitBtn = document.getElementById("registerSubmitBtn");
const formState = document.getElementById("registerFormState");

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
    setFormMessage(formState, "is-error", "Unable to reach the server. Please try again.");
  } finally {
    setButtonLoadingState(submitBtn, false, "Create account", "Creating…");
  }
}

async function initRegisterPage() {
  const canRender = await requireGuest({ redirectTo: "activities.html" });
  if (!canRender || !registerForm) return;

  ["displayName", "email", "password"].forEach((fieldName) => {
    const field = fieldMap[fieldName];
    field?.input?.addEventListener("blur", () => {
      const fields = collectRegisterFields(registerForm);
      const errors = validateRegisterFields(fields);
      setFieldError(fieldName, errors[fieldName] || "");
    });
  });

  registerForm.addEventListener("submit", handleRegisterSubmit);
}

initRegisterPage();
