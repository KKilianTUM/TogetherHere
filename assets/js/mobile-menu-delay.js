const delayMs = 2000;

const attachDelayedCollapse = (selector) => {
  const menuWrap = document.querySelector(selector);
  if (!menuWrap) return;

  let closeTimer = null;

  const cancelClose = () => {
    if (closeTimer) {
      clearTimeout(closeTimer);
      closeTimer = null;
    }
  };

  const openMenu = () => {
    cancelClose();
    menuWrap.classList.add('is-open');
  };

  const closeMenuWithDelay = () => {
    cancelClose();
    closeTimer = setTimeout(() => {
      menuWrap.classList.remove('is-open');
      closeTimer = null;
    }, delayMs);
  };

  menuWrap.addEventListener('mouseenter', openMenu);
  menuWrap.addEventListener('mouseleave', closeMenuWithDelay);
  menuWrap.addEventListener('focusin', openMenu);
  menuWrap.addEventListener('focusout', closeMenuWithDelay);
};

attachDelayedCollapse('.mobile-menu-wrap');
attachDelayedCollapse('.register-wrap');
