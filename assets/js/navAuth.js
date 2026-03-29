import { bootstrapAuthState, markLoggedOut, subscribeAuthState } from "./authState.js";
import { logoutRequest } from "./authApi.js";

function toggle(elements, shouldShow) {
  elements.forEach((el) => {
    if (!el) return;
    el.hidden = !shouldShow;
  });
}

function userName(user) {
  return user?.displayName || user?.email || "Account";
}

function selectorsToNodes(selectors) {
  return selectors.flatMap((selector) => Array.from(document.querySelectorAll(selector))).filter(Boolean);
}

export function mountAuthNavigation({
  guestSelectors = [],
  authSelectors = [],
  userLabelSelectors = [],
  logoutSelectors = []
} = {}) {
  const guestNodes = selectorsToNodes(guestSelectors);
  const authNodes = selectorsToNodes(authSelectors);
  const userLabelNodes = selectorsToNodes(userLabelSelectors);
  const logoutNodes = selectorsToNodes(logoutSelectors);

  const render = (state) => {
    const isAuth = state.status === "authenticated";
    toggle(guestNodes, !isAuth);
    toggle(authNodes, isAuth);

    userLabelNodes.forEach((node) => {
      node.textContent = isAuth ? `Hi, ${userName(state.user)}` : "";
    });
  };

  logoutNodes.forEach((logoutNode) => {
    logoutNode.addEventListener("click", async (event) => {
      event.preventDefault();
      try {
        await logoutRequest();
      } finally {
        markLoggedOut();
        window.location.assign("index.html");
      }
    });
  });

  const unsubscribe = subscribeAuthState(render);
  bootstrapAuthState();

  return unsubscribe;
}
