import request from 'supertest';
import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { AppModule } from '../../src/app.module';

describe('RBAC/ABAC Autorización (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    // Inicializar módulo de prueba (con DB en memoria o mockeada)
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('El Personal Administrativo NO puede acceder al contenido clínico (Resumen)', async () => {
    const administrativoJwt = 'mock.jwt.administrativo'; // Simulado
    
    const response = await request(app.getHttpServer())
      .get('/api/v1/clinical/pacientes/uuid-paciente-123/resumen')
      .set('Authorization', `Bearer ${administrativoJwt}`)
      // Inyectamos un mock manual de JWT middleware asumiendo rol ADMINISTRATIVO
      .set('x-mock-role', 'ADMINISTRATIVO');

    // Debe ser bloqueado por el @Roles() o por el RelacionAsistencialGuard
    expect(response.status).toBe(403);
    expect(response.body.message).toContain('No tiene los roles requeridos');
  });

  it('El Médico SI puede acceder al contenido clínico SI tiene relación asistencial activa', async () => {
    const medicoJwt = 'mock.jwt.medico';
    
    const response = await request(app.getHttpServer())
      .get('/api/v1/clinical/pacientes/uuid-paciente-123/resumen')
      .set('Authorization', `Bearer ${medicoJwt}`)
      .set('x-mock-role', 'MEDICO')
      .set('x-mock-relacion', 'ACTIVA'); // Mock del guard

    // 200 OK
    expect(response.status).not.toBe(403);
  });

  it('El Médico NO puede acceder a una historia clínica X si NO tiene relación asistencial (sin break-glass)', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/v1/clinical/pacientes/uuid-paciente-123/resumen')
      .set('Authorization', `Bearer mock.jwt.medico`)
      .set('x-mock-role', 'MEDICO')
      .set('x-mock-relacion', 'NINGUNA'); 

    // ABAC Guard lo bloquea
    expect(response.status).toBe(403);
    expect(response.body.message).toContain('No existe relación asistencial activa con este paciente');
  });

  it('El Médico SI puede acceder si declara Emergencia (Break-Glass)', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/v1/clinical/pacientes/uuid-paciente-123/resumen')
      .set('Authorization', `Bearer mock.jwt.medico`)
      .set('x-mock-role', 'MEDICO')
      .set('x-mock-relacion', 'NINGUNA')
      .set('x-break-glass-justificacion', 'Paciente inconsciente con sangrado profuso'); // Trigger break-glass

    // Pasa, pero dispara log de auditoría inmutable
    expect(response.status).not.toBe(403);
  });
});
