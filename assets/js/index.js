import { mountAuthNavigation } from "./navAuth.js";

mountAuthNavigation({
  guestSelectors: [".auth-links [data-auth-guest]", "#mobileHeaderMenu [data-auth-guest]"],
  authSelectors: [".auth-links [data-auth-user]", "#mobileHeaderMenu [data-auth-user]"],
  userLabelSelectors: [".auth-links [data-auth-user-label]", "#mobileHeaderMenu [data-auth-user-label]"],
  logoutSelectors: [".auth-links [data-auth-logout]", "#mobileHeaderMenu [data-auth-logout]"]
});
