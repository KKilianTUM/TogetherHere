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


const attachImageFallbacks = (selector) => {
  const images = document.querySelectorAll(selector);
  images.forEach((image) => {
    const fallbackSrcs = (image.dataset.fallbackSrcs || '')
      .split('|')
      .map((src) => src.trim())
      .filter(Boolean);

    if (!fallbackSrcs.length) return;

    let fallbackIndex = 0;
    image.addEventListener('error', () => {
      if (fallbackIndex >= fallbackSrcs.length) return;

      const nextSrc = fallbackSrcs[fallbackIndex];
      fallbackIndex += 1;
      image.src = nextSrc;
    });
  });
};

attachImageFallbacks('.certificate-image');
