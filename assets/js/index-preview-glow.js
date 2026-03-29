const previewTrigger = document.getElementById("seePreviewsBtn");
const previewGrid = document.querySelector('#preview .preview-grid');

if (previewTrigger && previewGrid) {
  previewTrigger.addEventListener('click', () => {
    previewGrid.classList.remove('is-glowing');
    void previewGrid.offsetWidth;
    previewGrid.classList.add('is-glowing');

    window.setTimeout(() => {
      previewGrid.classList.remove('is-glowing');
    }, 2200);
  });
}
