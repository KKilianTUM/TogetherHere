const mobileMenuWrap = document.querySelector('.mobile-menu-wrap');

if (mobileMenuWrap) {
  let closeTimer = null;

  const cancelClose = () => {
    if (closeTimer) {
      clearTimeout(closeTimer);
      closeTimer = null;
    }
  };

  const openMenu = () => {
    cancelClose();
    mobileMenuWrap.classList.add('is-open');
  };

  const closeMenuWithDelay = () => {
    cancelClose();
    closeTimer = setTimeout(() => {
      mobileMenuWrap.classList.remove('is-open');
      closeTimer = null;
    }, 2000);
  };

  mobileMenuWrap.addEventListener('mouseenter', openMenu);
  mobileMenuWrap.addEventListener('mouseleave', closeMenuWithDelay);

  mobileMenuWrap.addEventListener('focusin', openMenu);
  mobileMenuWrap.addEventListener('focusout', closeMenuWithDelay);
}
