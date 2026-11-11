const HEARTMED_API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:18080';

// ⚠️ CONFIRMA ESTAS RUTAS CON TU BACKEND (C++). Son las únicas que hay que cambiar
// si los endpoints se llaman distinto.
export const ENDPOINTS = {
  pacientes: '/api/pacientes',
  inventario: '/api/inventario',
  movimientos: '/api/movimientos',
  // Módulo de emergencias (Sprint 3). El contrato está en docs/API_EMERGENCIAS.md
  emergencias: '/api/emergencias',
  protocolos: '/api/protocolos',
  alertas: '/api/alertas',
};

function buildApiUrl(path) {
  return `${HEARTMED_API_BASE_URL.replace(/\/$/, '')}${path}`;
}

function authHeaders() {
  const token = localStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function requestJson(url, options = {}) {
  // Los headers se mezclan (antes, pasar options.headers reemplazaba Content-Type/Accept)
  const response = await fetch(url, {
    mode: 'cors',
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...(options.headers || {}),
    },
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

// ---- Dashboard ----

export async function getPatients() {
  return requestJson(buildApiUrl(ENDPOINTS.pacientes), { headers: authHeaders() });
}

// ---- Pacientes ----

// `datos` usa los nombres de la base: documento_identidad, nombre_completo,
// fecha_nacimiento, tipo_sangre, rango_cargo, recompensa, estado_salud y
// observaciones (que el backend guarda en la historia clínica).
export async function createPatient(datos) {
  return requestJson(buildApiUrl(ENDPOINTS.pacientes), {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(datos),
  });
}

export async function updatePatient(idPaciente, datos) {
  return requestJson(buildApiUrl(`${ENDPOINTS.pacientes}/${idPaciente}`), {
    method: 'PUT',
    headers: authHeaders(),
    body: JSON.stringify(datos),
  });
}

// ---- Movimientos de inventario ----

export async function getMovements(limite = 25) {
  return requestJson(buildApiUrl(`${ENDPOINTS.movimientos}?limite=${limite}`), {
    headers: authHeaders(),
  });
}

// `datos`: id_lote, tipo_movimiento (ENTRADA | CONSUMO | BAJA), cantidad y
// motivo. Quién registra el movimiento lo deduce el backend del token.
export async function createMovement(datos) {
  return requestJson(buildApiUrl(ENDPOINTS.movimientos), {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(datos),
  });
}

export async function getInventory() {
  return requestJson(buildApiUrl(ENDPOINTS.inventario), { headers: authHeaders() });
}

// ---- Emergencias (KAN-48) ----

// `estados`: lista de estados a incluir, p. ej. ['ACTIVA', 'EN_ATENCION'].
export async function getEmergencies(estados = []) {
  const filtro = estados.length ? `?estado=${estados.join(',')}` : '';
  return requestJson(buildApiUrl(`${ENDPOINTS.emergencias}${filtro}`), { headers: authHeaders() });
}

export async function getEmergency(idEmergencia) {
  return requestJson(buildApiUrl(`${ENDPOINTS.emergencias}/${idEmergencia}`), {
    headers: authHeaders(),
  });
}

// `datos`: tipo, sintomas, lesiones (opcional), diagnostico_inicial,
// nivel_urgencia (BAJA | MEDIA | ALTA | CRITICA) y pacientes (lista de id_paciente).
// El backend pone estado ACTIVA y fecha_inicio.
export async function createEmergency(datos) {
  return requestJson(buildApiUrl(ENDPOINTS.emergencias), {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(datos),
  });
}

// ---- Protocolos (KAN-50) ----

export async function getProtocols() {
  return requestJson(buildApiUrl(ENDPOINTS.protocolos), { headers: authHeaders() });
}

// `tipo`: TRAUMATISMO | HEMORRAGIA | INTOXICACION | QUEMADURA | OTRO
export async function getProtocol(tipo) {
  return requestJson(buildApiUrl(`${ENDPOINTS.protocolos}/${encodeURIComponent(tipo)}`), {
    headers: authHeaders(),
  });
}

// ---- Alertas (KAN-58) ----

export async function getAlerts({ incluirResueltas = false } = {}) {
  const filtro = incluirResueltas ? '' : '?resuelta=0';
  return requestJson(buildApiUrl(`${ENDPOINTS.alertas}${filtro}`), { headers: authHeaders() });
}

// Marcar como leída = notificada = 1 en la tabla alertas.
export async function markAlertRead(idAlerta) {
  return requestJson(buildApiUrl(`${ENDPOINTS.alertas}/${idAlerta}/leida`), {
    method: 'PUT',
    headers: authHeaders(),
  });
}

export async function markAllAlertsRead() {
  return requestJson(buildApiUrl(`${ENDPOINTS.alertas}/leidas`), {
    method: 'PUT',
    headers: authHeaders(),
  });
}
