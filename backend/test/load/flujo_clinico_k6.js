import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate } from 'k6/metrics';

// Métrica personalizada para fallos
export const errorRate = new Rate('errores');

export const options = {
  // Escenario: Simula el pico de las 8:00 AM cuando los médicos 
  // empiezan a pasar consulta simultáneamente en el país.
  stages: [
    { duration: '30s', target: 500 },  // Rampa de subida rápida a 500 médicos concurrentes
    { duration: '2m', target: 500 },   // Mantenimiento
    { duration: '30s', target: 0 },    // Rampa de bajada
  ],
  thresholds: {
    // El 95% de las lecturas clínicas deben ser bajo 500ms
    http_req_duration: ['p(95)<500'],
    // Los errores (4xx, 5xx) no deben superar el 1%
    'errores': ['rate<0.01'], 
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000/api/v1';
const API_TOKEN = __ENV.API_TOKEN || 'fake-jwt-token'; // Token simulado del médico

export default function () {
  // 1. El médico busca la agenda del día
  const headers = { 'Authorization': `Bearer ${API_TOKEN}`, 'Content-Type': 'application/json' };
  
  let res = http.get(`${BASE_URL}/citas/medico/hoy`, { headers });
  check(res, { 'Agenda del día OK': (r) => r.status === 200 }) || errorRate.add(1);
  sleep(1);

  // 2. Abre el resumen clínico de un paciente (Uso intensivo de Caché)
  // Paciente simulado aleatorio
  const pacienteId = `paciente-sintetico-${Math.floor(Math.random() * 100)}`;
  res = http.get(`${BASE_URL}/clinical/pacientes/${pacienteId}/resumen`, { headers });
  check(res, { 'Resumen Clínico rápido': (r) => r.status === 200 }) || errorRate.add(1);
  sleep(2);

  // 3. Escribe una evolución SOAP (Escritura + Outbox en vida real)
  const payload = JSON.stringify({
    motivoConsultaCifrado: "Cifrado mock",
    evolucionCifrado: "Paciente asintomático, evolución favorable.",
    planTratamientoCifrado: "Mantener tratamiento base."
  });
  
  res = http.post(`${BASE_URL}/clinical/episodios/nuevo-consulta`, payload, { headers });
  check(res, { 'Evolución registrada OK': (r) => r.status === 201 }) || errorRate.add(1);
  
  // Breve pausa para simular lectura en pantalla antes de la siguiente acción
  sleep(5);
}
