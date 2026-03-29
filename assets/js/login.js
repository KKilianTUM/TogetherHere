const loginForm = document.getElementById("loginForm");
const submitBtn = document.getElementById("loginSubmitBtn");
const formState = document.getElementById("loginFormState");

function setFormState(type, message){
  if (!formState) return;
  formState.classList.remove("is-error", "is-loading", "is-success");
  if (type) formState.classList.add(type);
  formState.textContent = message || "";
}

function setLoadingState(isLoading){
  if (!submitBtn) return;
  submitBtn.disabled = isLoading;
  submitBtn.textContent = isLoading ? "Logging in…" : "Log in";
}

function normalizeErrorMessage(status, payload){
  if (payload && typeof payload.message === "string" && payload.message.trim()) {
    return payload.message.trim();
  }

  if (status === 401) return "Invalid email or password.";
  if (status === 400) return "Please check your email and password format.";
  return "Login failed. Please try again.";
}

async function handleLoginSubmit(event){
  event.preventDefault();
  if (!(loginForm instanceof HTMLFormElement)) return;

  const formData = new FormData(loginForm);
  const email = String(formData.get("email") || "").trim();
  const password = String(formData.get("password") || "");

  if (!email || !password) {
    setFormState("is-error", "Email and password are required.");
    return;
  }

  setLoadingState(true);
  setFormState("is-loading", "Signing you in…");

  try {
    const response = await fetch("/auth/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      credentials: "include",
      body: JSON.stringify({ email, password })
    });

    const payload = await response.json().catch(() => null);

    if (!response.ok) {
      setFormState("is-error", normalizeErrorMessage(response.status, payload));
      return;
    }

    const displayName = payload?.user?.displayName ? `, ${payload.user.displayName}` : "";
    setFormState("is-success", `Success${displayName}! Redirecting to activities…`);
    loginForm.reset();

    window.setTimeout(() => {
      window.location.assign("activities.html");
    }, 700);
  } catch {
    setFormState("is-error", "Unable to reach the server. Please try again.");
  } finally {
    setLoadingState(false);
  }
}

if (loginForm) {
  loginForm.addEventListener("submit", handleLoginSubmit);
}
