import { requireAuthenticated } from "./routeGuards.js";
import { mountAuthNavigation } from "./navAuth.js";

function ensureBootstrapBanner() {
  const main = document.querySelector("main.container");
  if (!main) return null;

  const banner = document.createElement("div");
  banner.className = "auth-bootstrap-banner card";
  banner.setAttribute("role", "status");
  banner.textContent = "Checking your session…";
  main.prepend(banner);
  return banner;
}

function showAuthBootstrapError(banner, message) {
  if (!banner) return;

  banner.setAttribute("role", "alert");
  banner.innerHTML = "";
  const text = document.createElement("span");
  text.textContent = `${message} `;

  const retry = document.createElement("button");
  retry.className = "btn btn-ghost";
  retry.type = "button";
  retry.textContent = "Retry";
  retry.addEventListener("click", () => window.location.reload());

  banner.append(text, retry);
}

async function initActivitiesPage() {
  const banner = ensureBootstrapBanner();

  const allowed = await requireAuthenticated({
    redirectTo: "login.html",
    onError: (message) => showAuthBootstrapError(banner, message)
  });
  if (!allowed) return;

  banner?.remove();

  mountAuthNavigation({
    authSelectors: ["[data-auth-user]"],
    userLabelSelectors: ["[data-auth-user-label]"],
    logoutSelectors: ["[data-auth-logout]"]
  });

  await import("./activities.js");
}

initActivitiesPage();
