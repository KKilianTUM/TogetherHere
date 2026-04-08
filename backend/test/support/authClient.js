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

function splitCombinedSetCookieHeader(headerValue) {
  if (typeof headerValue !== 'string' || !headerValue.trim()) {
    return [];
  }

  const cookies = [];
  let buffer = '';
  let inExpiresAttribute = false;

  for (let index = 0; index < headerValue.length; index += 1) {
    const currentChar = headerValue[index];
    const nextPart = headerValue.slice(index, index + 8).toLowerCase();

    if (nextPart === 'expires=') {
      inExpiresAttribute = true;
    }

    if (currentChar === ',' && !inExpiresAttribute) {
      if (buffer.trim()) {
        cookies.push(buffer.trim());
      }
      buffer = '';
      continue;
    }

    if (inExpiresAttribute && currentChar === ';') {
      inExpiresAttribute = false;
    }

    buffer += currentChar;
  }

  if (buffer.trim()) {
    cookies.push(buffer.trim());
  }

  return cookies;
}

export function buildAuthClient({ baseUrl, csrfHeaderName }) {
  const cookies = new Map();
  let csrfToken = null;

  function setCookieHeadersIntoJar(response) {
    const fromGetSetCookie = response.headers.getSetCookie?.();
    const cookieValues = Array.isArray(fromGetSetCookie) && fromGetSetCookie.length > 0
      ? fromGetSetCookie
      : splitCombinedSetCookieHeader(response.headers.get('set-cookie'));

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
    const shouldInjectCsrfToken = options.injectCsrfToken !== false;
    let cookieHeader = getCookieHeader();

    if (cookieHeader) {
      headers.set('cookie', cookieHeader);
    }

    if (!['GET', 'HEAD', 'OPTIONS'].includes(method) && shouldInjectCsrfToken) {
      if (typeof options.csrfToken === 'string') {
        headers.set(csrfHeaderName, options.csrfToken);
      } else {
        if (!csrfToken) {
          await refreshCsrfToken();
          cookieHeader = getCookieHeader();
        }

        headers.set(csrfHeaderName, csrfToken);
      }
    } else if (typeof options.csrfToken === 'string') {
      headers.set(csrfHeaderName, options.csrfToken);
    }

    const recomputedCookieHeader = getCookieHeader();
    if (recomputedCookieHeader) {
      headers.set('cookie', recomputedCookieHeader);
    } else {
      headers.delete('cookie');
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

  async function refreshCsrf() {
    await refreshCsrfToken();
    return csrfToken;
  }

  function clearCookie(name) {
    cookies.delete(name);
  }

  function getCookie(name) {
    return cookies.get(name);
  }

  function getCsrfToken() {
    return csrfToken;
  }

  function resetAuthState() {
    cookies.clear();
    csrfToken = null;
  }

  return {
    request,
    refreshCsrf,
    getCsrfToken,
    getCookie,
    clearCookie,
    resetAuthState
  };
}
