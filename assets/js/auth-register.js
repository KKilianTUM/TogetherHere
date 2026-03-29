(function initRegisterForm() {
  const form = document.getElementById('registerForm');
  if (!form) return;

  const feedback = document.getElementById('registerFeedback');
  const submitBtn = document.getElementById('registerSubmitBtn');
  const emailInput = form.querySelector('input[name="email"]');
  const passwordInput = form.querySelector('input[name="password"]');
  const displayNameInput = form.querySelector('input[name="displayName"]');

  const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const DISPLAY_NAME_PATTERN = /^[A-Za-z0-9 _-]+$/;

  function setFeedback(message, type) {
    if (!feedback) return;

    feedback.textContent = message;
    feedback.classList.remove('is-error', 'is-success');

    if (type === 'error') {
      feedback.classList.add('is-error');
    }

    if (type === 'success') {
      feedback.classList.add('is-success');
    }
  }

  function isValidEmail(email) {
    return EMAIL_PATTERN.test(email);
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

    return DISPLAY_NAME_PATTERN.test(displayName);
  }

  function clearFieldErrors() {
    emailInput?.setCustomValidity('');
    passwordInput?.setCustomValidity('');
    displayNameInput?.setCustomValidity('');
  }

  function validateInput(input) {
    const email = typeof input.email === 'string' ? input.email.trim().toLowerCase() : '';
    const password = typeof input.password === 'string' ? input.password : '';
    const displayName = typeof input.displayName === 'string' ? input.displayName.trim() : '';

    if (!isValidEmail(email)) {
      emailInput?.setCustomValidity('Please enter a valid email address.');
      return { message: 'Please enter a valid email address.', field: emailInput };
    }

    if (!isValidPassword(password)) {
      passwordInput?.setCustomValidity('Password must be 12-128 chars with upper, lower, number, and symbol.');
      return {
        message: 'Password must be 12-128 chars and include uppercase, lowercase, number, and symbol.',
        field: passwordInput
      };
    }

    if (!isValidDisplayName(displayName)) {
      displayNameInput?.setCustomValidity('Display name must be 2-50 chars with letters, numbers, spaces, _ or -.');
      return {
        message: 'Display name must be 2-50 chars and only use letters, numbers, spaces, underscores, or hyphens.',
        field: displayNameInput
      };
    }

    return {
      value: {
        email,
        password,
        displayName
      }
    };
  }

  form.addEventListener('submit', async (event) => {
    event.preventDefault();

    clearFieldErrors();
    setFeedback('', null);

    const data = new FormData(form);
    const validation = validateInput({
      email: String(data.get('email') || ''),
      password: String(data.get('password') || ''),
      displayName: String(data.get('displayName') || '')
    });

    if (!validation.value) {
      if (validation.field) {
        validation.field.reportValidity();
        validation.field.focus();
      }
      setFeedback(validation.message || 'Please verify your details and try again.', 'error');
      return;
    }

    const payload = {
      email: validation.value.email,
      password: validation.value.password,
      ...(validation.value.displayName.length > 0 ? { displayName: validation.value.displayName } : {})
    };

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

      const responseBody = await response.json().catch(() => ({}));

      if (!response.ok) {
        const fallback = response.status === 409
          ? 'An account already exists for this email.'
          : 'Registration failed. Please verify your details and try again.';
        const message = typeof responseBody?.message === 'string' && responseBody.message.trim().length > 0
          ? responseBody.message
          : fallback;

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
