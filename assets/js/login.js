import { loginRequest } from "./authApi.js";
import { requireGuest } from "./routeGuards.js";
import { setAuthenticatedUser } from "./authState.js";
import { setButtonLoadingState, setFormMessage } from "./authFeedback.js";
import { readRaw, readTrimmed, validateLoginInput } from "./authValidation.js";

const loginForm = document.getElementById("loginForm");
const submitBtn = document.getElementById("loginSubmitBtn");
const formState = document.getElementById("loginFormState");


function renderPostRegistrationHint() {
  const url = new URL(window.location.href);
  if (url.searchParams.get("registered") !== "1") return;

  setFormMessage(formState, "is-success", "Registration complete. Please log in.");
  url.searchParams.delete("registered");
  window.history.replaceState({}, "", url);
}

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

    setAuthenticatedUser(result.payload?.user || null);
    const displayName = result.payload?.user?.displayName ? `, ${result.payload.user.displayName}` : "";
    setFormMessage(formState, "is-success", `Success${displayName}! Redirecting to activities…`);
    loginForm.reset();

    const returnTo = new URL(window.location.href).searchParams.get("returnTo");

    window.setTimeout(() => {
      const target = returnTo && /\.html(?:$|\?)/.test(returnTo) ? returnTo : "activities.html";
      window.location.assign(target);
    }, 700);
  } catch {
    setFormMessage(formState, "is-error", "Unable to reach the server. Please try again.");
  } finally {
    setButtonLoadingState(submitBtn, false, "Log in", "Logging in…");
  }
}

async function initLoginPage() {
  if (!loginForm) return;

  const fields = Array.from(loginForm.elements || []);
  fields.forEach((field) => {
    field.disabled = true;
  });
  setFormMessage(formState, "is-loading", "Checking your session…");

  const canRender = await requireGuest({
    redirectTo: "activities.html",
    onError: (message) => {
      setFormMessage(formState, "is-error", `${message} Please refresh and try again.`);
    }
  });

  if (!canRender) return;

  fields.forEach((field) => {
    field.disabled = false;
  });
  setFormMessage(formState, "", "");
  renderPostRegistrationHint();
  loginForm.addEventListener("submit", handleLoginSubmit);
}

initLoginPage();
