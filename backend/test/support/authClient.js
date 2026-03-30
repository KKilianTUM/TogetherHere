function parseSetCookieHeader(cookieHeaderValue) {
  const [firstPart] = cookieHeaderValue.split(';');
  const separatorIndex = firstPart.indexOf('=');

  if (separatorIndex === -1) {
    return null;
  }

  const name = firstPart.slice(0, separatorIndex).trim();
  const value = firstPart.slice(separatorIndex + 1).trim();

  if (!name) {
    return null;
  }

  return { name, value };
}

export function buildAuthClient({ baseUrl, csrfHeaderName }) {
  const cookies = new Map();
  let csrfToken = null;

  function setCookieHeadersIntoJar(response) {
    const cookieValues = response.headers.getSetCookie?.() || [];

    for (const rawCookie of cookieValues) {
      const parsed = parseSetCookieHeader(rawCookie);
      if (!parsed) {
        continue;
      }

      if (!parsed.value) {
        cookies.delete(parsed.name);
        continue;
      }

      cookies.set(parsed.name, parsed.value);
    }
  }

  function getCookieHeader() {
    return Array.from(cookies.entries())
      .map(([name, value]) => `${name}=${value}`)
      .join('; ');
  }

  async function refreshCsrfToken() {
    const headers = new Headers();
    const cookieHeader = getCookieHeader();

    if (cookieHeader) {
      headers.set('cookie', cookieHeader);
    }

    const response = await fetch(`${baseUrl}/csrf-token`, { headers });
    setCookieHeadersIntoJar(response);

    const payload = await response.json();
    csrfToken = payload.csrfToken;
  }

  async function request(path, options = {}) {
    const method = (options.method || 'GET').toUpperCase();
    const headers = new Headers(options.headers || {});
    const cookieHeader = getCookieHeader();

    if (cookieHeader) {
      headers.set('cookie', cookieHeader);
    }

    if (!['GET', 'HEAD', 'OPTIONS'].includes(method)) {
      if (!csrfToken) {
        await refreshCsrfToken();
      }

      headers.set(csrfHeaderName, csrfToken);
    }

    if (options.body && !headers.has('content-type')) {
      headers.set('content-type', 'application/json');
    }

    const response = await fetch(`${baseUrl}${path}`, {
      ...options,
      method,
      headers
    });

    setCookieHeadersIntoJar(response);

    return response;
  }

  function getCookie(name) {
    return cookies.get(name);
  }

  function resetAuthState() {
    cookies.clear();
    csrfToken = null;
  }

  return {
    request,
    getCookie,
    resetAuthState
  };
}
