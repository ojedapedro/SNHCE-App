import http from 'k6/http';
import { check, sleep } from 'k6';

// Prueba de carga: "Apertura de Agendas"
// Simula a miles de usuarios intentando reservar cita a las 8:00 AM exactamente.

export const options = {
  stages: [
    { duration: '10s', target: 500 },  // Rampa de subida rápida (simula llegada masiva a las 8:00 AM)
    { duration: '30s', target: 5000 }, // Pico absoluto de 5000 usuarios concurrentes intentando pedir cita
    { duration: '10s', target: 0 },    // Bajada rápida (agenda se llena)
  ],
  thresholds: {
    // El 95% de las peticiones deben ser atendidas (o encoladas) en menos de 2 segundos.
    http_req_duration: ['p(95)<2000'],
    // La tasa de error por timeout no debe superar el 5% (el backend debe responder "Encolado" o HTTP 429 Rate Limit)
    http_req_failed: ['rate<0.05'], 
  },
};

export default function () {
  const payload = JSON.stringify({
    establecimientoId: 'establecimiento-uuid-test',
    especialidad: 'Medicina Interna',
    fecha: '2024-11-15T08:00:00.000Z',
    captchaToken: 'simulated-valid-captcha-token',
  });

  const params = {
    headers: {
      'Content-Type': 'application/json',
      // Simulamos que los usuarios ya tienen un JWT válido de Keycloak
      'Authorization': `Bearer fake-jwt-token-for-load-test`,
    },
  };

  const res = http.post('http://localhost:3000/api/v1/citas/solicitar', payload, params);

  check(res, {
    'estado es 201 (Creado) o 202 (Encolado)': (r) => r.status === 201 || r.status === 202,
    'estado es 429 (Rate Limit / Anti-abuso)': (r) => r.status === 429,
  });

  // Pequeña pausa para no saturar al CPU del cliente que corre la prueba
  sleep(1);
}
