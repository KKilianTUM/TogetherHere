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

export function validateRegisterInput({ email, password, displayName }) {
  if (!email || !password || !displayName) {
    return "Display name, email, and password are required.";
  }

  if (password.length < 8) return "Password must contain at least 8 characters.";
  return "";
}
