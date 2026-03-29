const DISPLAY_NAME_PATTERN = /^[A-Za-z0-9 _-]+$/;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function readTrimmed(formData, key) {
  return String(formData.get(key) || "").trim();
}

export function readRaw(formData, key) {
  return String(formData.get(key) || "");
}

export function validateLoginInput({ email, password }) {
  if (!email || !password) return "Email and password are required.";
  return "";
}

export function validateRegisterFields({ email, password, displayName }) {
  const errors = {};

  if (!displayName) {
    errors.displayName = "Display name is required.";
  } else if (displayName.length < 2 || displayName.length > 50) {
    errors.displayName = "Display name must be 2-50 characters.";
  } else if (!DISPLAY_NAME_PATTERN.test(displayName)) {
    errors.displayName = "Display name can only use letters, numbers, spaces, underscores, and hyphens.";
  }

  if (!email) {
    errors.email = "Email is required.";
  } else if (!EMAIL_PATTERN.test(email)) {
    errors.email = "Enter a valid email address.";
  }

  if (!password) {
    errors.password = "Password is required.";
  } else if (password.length < 12 || password.length > 128) {
    errors.password = "Password must be 12-128 characters.";
  } else if (!/[a-z]/.test(password) || !/[A-Z]/.test(password) || !/\d/.test(password) || !/[^A-Za-z0-9]/.test(password)) {
    errors.password = "Password needs uppercase, lowercase, number, and symbol.";
  }

  return errors;
}

export function validateRegisterInput(fields) {
  const errors = validateRegisterFields(fields);
  return errors.displayName || errors.email || errors.password || "";
}
