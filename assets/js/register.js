import { registerRequest } from "./authApi.js";
import { setButtonLoadingState, setFormMessage } from "./authFeedback.js";
import { readRaw, readTrimmed, validateRegisterInput } from "./authValidation.js";

const registerForm = document.getElementById("registerForm");
const submitBtn = document.getElementById("registerSubmitBtn");
const formState = document.getElementById("registerFormState");

function registerErrorMessage(status, payloadMessage) {
  if (payloadMessage) return payloadMessage;
  if (status === 409) return "An account with this email already exists.";
  if (status === 400) return "Please check your details and try again.";
  return "Registration failed. Please try again.";
}

async function handleRegisterSubmit(event) {
  event.preventDefault();
  if (!(registerForm instanceof HTMLFormElement)) return;

  const formData = new FormData(registerForm);
  const displayName = readTrimmed(formData, "displayName");
  const email = readTrimmed(formData, "email");
  const password = readRaw(formData, "password");

  const validationMessage = validateRegisterInput({ email, password, displayName });
  if (validationMessage) {
    setFormMessage(formState, "is-error", validationMessage);
    return;
  }

  setButtonLoadingState(submitBtn, true, "Create account", "Creating…");
  setFormMessage(formState, "is-loading", "Creating your account…");

  try {
    const result = await registerRequest({ displayName, email, password });

    if (!result.ok) {
      setFormMessage(formState, "is-error", registerErrorMessage(result.status, result.message));
      return;
    }

    setFormMessage(formState, "is-success", "Account created. Redirecting to login…");
    registerForm.reset();

    window.setTimeout(() => {
      window.location.assign("login.html");
    }, 700);
  } catch {
    setFormMessage(formState, "is-error", "Unable to reach the server. Please try again.");
  } finally {
    setButtonLoadingState(submitBtn, false, "Create account", "Creating…");
  }
}

if (registerForm) {
  registerForm.addEventListener("submit", handleRegisterSubmit);
}
