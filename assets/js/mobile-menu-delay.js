const attachDelayedCollapse = (selector) => {
  const menuWrap = document.querySelector(selector);
  if (!menuWrap) return;

  const openMenu = () => {
    menuWrap.classList.add('is-open');
  };

  const closeMenu = () => {
    menuWrap.classList.remove('is-open');
  };

  const closeMenuOnBlur = (event) => {
    const nextFocusedElement = event.relatedTarget;
    if (nextFocusedElement && menuWrap.contains(nextFocusedElement)) return;

    closeMenu();
  };

  menuWrap.addEventListener('mouseenter', openMenu);
  menuWrap.addEventListener('mouseleave', closeMenu);
  menuWrap.addEventListener('focusin', openMenu);
  menuWrap.addEventListener('focusout', closeMenuOnBlur);
};

attachDelayedCollapse('.mobile-menu-wrap');
attachDelayedCollapse('.register-wrap');
