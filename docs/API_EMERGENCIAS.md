# Contrato de API: emergencias, protocolos y alertas (Sprint 3)

Estas son las rutas que consumen las pantallas del front de KAN-48, KAN-50 y KAN-58.
Los nombres de los campos son los de las tablas de `heartmed_sqlite.sql`.
Todas las rutas llevan `Authorization: Bearer <token>` y responden en JSON.
Si una ruta falla, se responde `{ "success": false, "message": "..." }` con el código HTTP correspondiente.
El front muestra ese `message` tal cual.

El back debe enviar las cabeceras CORS también en las respuestas de error.
Si no las envía, el navegador solo ve "Failed to fetch".

## Emergencias (KAN-47, back; KAN-48, front)

### `GET /api/emergencias?estado=ACTIVA,EN_ATENCION`

`estado` es opcional y admite varios valores separados por comas.

```json
{
  "success": true,
  "emergencias": [
    {
      "id_emergencia": 7,
      "tipo": "HEMORRAGIA",
      "sintomas": "...",
      "lesiones": null,
      "diagnostico_inicial": "Corte profundo en el antebrazo",
      "nivel_urgencia": "CRITICA",
      "estado": "ACTIVA",
      "fecha_inicio": "2026-11-09 10:12:00",
      "fecha_fin": null,
      "pacientes": [{ "id_paciente": 3, "nombre_completo": "Jean Bart" }]
    }
  ]
}
```

### `GET /api/emergencias/{id}`

Responde `{ "success": true, "emergencia": { ...mismos campos... } }`.

### `POST /api/emergencias`

```json
{
  "tipo": "HEMORRAGIA",
  "nivel_urgencia": "CRITICA",
  "pacientes": [3],
  "sintomas": "...",
  "lesiones": null,
  "diagnostico_inicial": "..."
}
```

El back pone `estado = 'ACTIVA'` y `fecha_inicio` con la hora del barco, e inserta las filas en `emergencia_paciente`.
Responde `201` con `{ "success": true, "emergencia": { ... } }`.

## Protocolos (KAN-49, back; KAN-50, front)

### `GET /api/protocolos`

```json
{ "success": true, "protocolos": [{ "id_protocolo": 2, "tipo_emergencia": "HEMORRAGIA", "nombre": "...", "total_pasos": 4 }] }
```

### `GET /api/protocolos/{tipo}`

`tipo` toma uno de estos valores: `TRAUMATISMO`, `HEMORRAGIA`, `INTOXICACION`, `QUEMADURA` u `OTRO`.

```json
{
  "success": true,
  "protocolo": {
    "id_protocolo": 2,
    "tipo_emergencia": "HEMORRAGIA",
    "nombre": "Protocolo de control de hemorragias",
    "pasos": [{ "id_paso": 5, "numero": 1, "descripcion": "Aplicar presión directa..." }]
  }
}
```

## Alertas (KAN-57, back; KAN-58, front)

### `GET /api/alertas?resuelta=0`

```json
{
  "success": true,
  "alertas": [
    {
      "id_alerta": 2,
      "tipo_alerta": "VENCIMIENTO_PROXIMO",
      "mensaje": "El lote L-2291 de amoxicilina vence en 5 días.",
      "prioridad": "CRITICA",
      "notificada": 0,
      "resuelta": 0,
      "fecha_generacion": "2026-11-08 18:30:00",
      "id_medicamento": null,
      "id_lote": 4,
      "id_tratamiento": null,
      "nombre_medicamento": "Amoxicilina",
      "num_lote": "L-2291"
    }
  ]
}
```

`nombre_medicamento` y `num_lote` son opcionales y salen de un JOIN. Si vienen, el front los muestra.

### `PUT /api/alertas/{id}/leida`

Pone `notificada = 1`.
Responde `{ "success": true }`.

### `PUT /api/alertas/leidas`

Pone `notificada = 1` en todas las alertas sin resolver.
Responde `{ "success": true, "actualizadas": 3 }`.

Si alguna ruta o algún campo se llama distinto en el back, solo hay que cambiarlo en `src/services/api.js`.
