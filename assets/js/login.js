import { loginRequest } from "./authApi.js";
import { setButtonLoadingState, setFormMessage } from "./authFeedback.js";
import { readRaw, readTrimmed, validateLoginInput } from "./authValidation.js";

const loginForm = document.getElementById("loginForm");
const submitBtn = document.getElementById("loginSubmitBtn");
const formState = document.getElementById("loginFormState");

function loginErrorMessage(status, payloadMessage) {
  if (payloadMessage) return payloadMessage;
  if (status === 401) return "Invalid email or password.";
  if (status === 400) return "Please check your email and password format.";
  return "Login failed. Please try again.";
}

async function handleLoginSubmit(event) {
  event.preventDefault();
  if (!(loginForm instanceof HTMLFormElement)) return;

  const formData = new FormData(loginForm);
  const email = readTrimmed(formData, "email");
  const password = readRaw(formData, "password");

  const validationMessage = validateLoginInput({ email, password });
  if (validationMessage) {
    setFormMessage(formState, "is-error", validationMessage);
    return;
  }

  setButtonLoadingState(submitBtn, true, "Log in", "Logging in…");
  setFormMessage(formState, "is-loading", "Signing you in…");

  try {
    const result = await loginRequest({ email, password });

    if (!result.ok) {
      setFormMessage(formState, "is-error", loginErrorMessage(result.status, result.message));
      return;
    }

    const displayName = result.payload?.user?.displayName ? `, ${result.payload.user.displayName}` : "";
    setFormMessage(formState, "is-success", `Success${displayName}! Redirecting to activities…`);
    loginForm.reset();

    window.setTimeout(() => {
      window.location.assign("activities.html");
    }, 700);
  } catch {
    setFormMessage(formState, "is-error", "Unable to reach the server. Please try again.");
  } finally {
    setButtonLoadingState(submitBtn, false, "Log in", "Logging in…");
  }
}

if (loginForm) {
  loginForm.addEventListener("submit", handleLoginSubmit);
}
