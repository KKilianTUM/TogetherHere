const menuToggle = document.getElementById("mobileMenuToggle");
const mobileMenu = document.getElementById("mobileHeaderMenu");

if (menuToggle && mobileMenu) {
  const closeMenu = () => {
    mobileMenu.hidden = true;
    menuToggle.setAttribute("aria-expanded", "false");
  };

  menuToggle.addEventListener("click", () => {
    const nextState = mobileMenu.hidden;
    mobileMenu.hidden = !nextState;
    menuToggle.setAttribute("aria-expanded", String(nextState));
  });

  document.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof Node)) return;
    if (menuToggle.contains(target) || mobileMenu.contains(target)) return;
    closeMenu();
  });

  mobileMenu.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", closeMenu);
  });

  window.addEventListener("resize", () => {
    if (window.innerWidth >= 1024) closeMenu();
  });
}
