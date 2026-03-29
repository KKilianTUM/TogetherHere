import { requireAuthenticated } from "./routeGuards.js";
import { mountAuthNavigation } from "./navAuth.js";

async function initActivitiesPage() {
  const allowed = await requireAuthenticated({ redirectTo: "login.html" });
  if (!allowed) return;

  mountAuthNavigation({
    authSelectors: ["[data-auth-user]"],
    userLabelSelectors: ["[data-auth-user-label]"],
    logoutSelectors: ["[data-auth-logout]"]
  });

  await import("./activities.js");
}

initActivitiesPage();
