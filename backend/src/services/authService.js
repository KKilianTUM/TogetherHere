const usersByEmail = new Map();

export function createUser({ email, password }) {
  const normalizedEmail = email.trim().toLowerCase();

  if (usersByEmail.has(normalizedEmail)) {
    return {
      created: false,
      reason: 'exists'
    };
  }

  usersByEmail.set(normalizedEmail, {
    email: normalizedEmail,
    password
  });

  return {
    created: true
  };
}

export function validateCredentials({ email, password }) {
  const normalizedEmail = email.trim().toLowerCase();

  const user = usersByEmail.get(normalizedEmail);
  if (!user || user.password !== password) {
    return {
      valid: false
    };
  }

  return {
    valid: true,
    user: {
      email: user.email
    }
  };
}
