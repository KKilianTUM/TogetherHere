export function setFormMessage(target, type, message) {
  if (!target) return;

  target.classList.remove("is-error", "is-loading", "is-success");
  if (type) target.classList.add(type);
  target.textContent = message || "";
}

export function setButtonLoadingState(button, isLoading, idleLabel, loadingLabel) {
  if (!button) return;

  button.disabled = isLoading;
  button.textContent = isLoading ? loadingLabel : idleLabel;
}
