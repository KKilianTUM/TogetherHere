(function initRegisterForm() {
  const form = document.getElementById('registerForm');
  if (!form) return;

  const feedback = document.getElementById('registerFeedback');
  const submitBtn = document.getElementById('registerSubmitBtn');

  function setFeedback(message, type) {
    if (!feedback) return;
    feedback.textContent = message;
    feedback.classList.remove('is-error', 'is-success');
    if (type === 'error') feedback.classList.add('is-error');
    if (type === 'success') feedback.classList.add('is-success');
  }

  function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  function isValidPassword(password) {
    if (typeof password !== 'string' || password.length < 12 || password.length > 128) {
      return false;
    }

    const hasLower = /[a-z]/.test(password);
    const hasUpper = /[A-Z]/.test(password);
    const hasNumber = /\d/.test(password);
    const hasSymbol = /[^A-Za-z0-9]/.test(password);

    return hasLower && hasUpper && hasNumber && hasSymbol;
  }

  function isValidDisplayName(displayName) {
    if (displayName.length === 0) {
      return true;
    }

    if (displayName.length < 2 || displayName.length > 50) {
      return false;
    }

    return /^[A-Za-z0-9 _-]+$/.test(displayName);
  }

  function getValidationError({ email, password, displayName }) {
    if (!isValidEmail(email)) {
      return 'Please enter a valid email address.';
    }

    if (!isValidPassword(password)) {
      return 'Password must be 12-128 chars and include uppercase, lowercase, number, and symbol.';
    }

    if (!isValidDisplayName(displayName)) {
      return 'Display name must be 2-50 chars and only use letters, numbers, spaces, underscores, or hyphens.';
    }

    return null;
  }

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    setFeedback('', null);

    const formData = new FormData(form);
    const email = String(formData.get('email') || '').trim().toLowerCase();
    const password = String(formData.get('password') || '');
    const displayName = String(formData.get('displayName') || '').trim();

    const validationError = getValidationError({ email, password, displayName });
    if (validationError) {
      setFeedback(validationError, 'error');
      return;
    }

    const payload = { email, password };
    if (displayName.length > 0) {
      payload.displayName = displayName;
    }

    submitBtn.disabled = true;

    try {
      const response = await fetch('/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify(payload)
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        const message = typeof data?.message === 'string' && data.message.trim().length > 0
          ? data.message
          : 'Registration failed. Please verify your details and try again.';
        setFeedback(message, 'error');
        return;
      }

      setFeedback('Account created successfully. You can now log in.', 'success');
      form.reset();
    } catch (error) {
      setFeedback('Unable to reach the server. Please try again shortly.', 'error');
    } finally {
      submitBtn.disabled = false;
    }
  });
})();
