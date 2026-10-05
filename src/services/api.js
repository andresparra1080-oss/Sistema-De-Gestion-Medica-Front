const HEARTMED_API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:18080';

function buildApiUrl(path) {
  return `${HEARTMED_API_BASE_URL.replace(/\/$/, '')}${path}`;
}

async function requestJson(url, options = {}) {
  const response = await fetch(url, {
    mode: 'cors',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...(options.headers || {}),
    },
    ...options,
  });

  const rawText = await response.text();
  let payload = {};

  if (rawText) {
    try {
      payload = JSON.parse(rawText);
    } catch {
      payload = rawText;
    }
  }

  if (!response.ok) {
    const message = typeof payload === 'object'
      ? payload.message || payload.error || 'Error de conexión con HeartMed'
      : payload || 'Error de conexión con HeartMed';

    throw new Error(message);
  }

  return payload;
}

export async function checkServerHealth() {
  return requestJson(buildApiUrl('/health'));
}

export async function checkApiHealth() {
  return requestJson(buildApiUrl('/api/health'));
}

export async function loginUser(credentials) {
  if (!credentials || !credentials.email || !credentials.password) {
    throw new Error('Debes introducir un email y una contraseña válidos.');
  }

  return requestJson(buildApiUrl('/login'), {
    method: 'POST',
    body: JSON.stringify(credentials),
  });
}
