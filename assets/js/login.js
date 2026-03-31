import { loginRequest } from "./authApi.js";
import { requireGuest } from "./routeGuards.js";
import { getAuthState, setAuthenticatedUser } from "./authState.js";
import { setButtonLoadingState, setFormMessage } from "./authFeedback.js";
import { readRaw, readTrimmed, validateLoginInput } from "./authValidation.js";

const loginForm = document.getElementById("loginForm");
const submitBtn = document.getElementById("loginSubmitBtn");
const formState = document.getElementById("loginFormState");
let submitHandlerAttached = false;


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

  setButtonLoadingState(submitBtn, true, "Log in", "Checking session…");
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
  setButtonLoadingState(submitBtn, false, "Log in", "Logging in…");
  renderPostRegistrationHint();

  if (!submitHandlerAttached) {
    loginForm.addEventListener("submit", handleLoginSubmit);
    submitHandlerAttached = true;
  }
}

initLoginPage();
