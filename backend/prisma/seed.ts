/**
 * Datos sintéticos de prueba para el SNHCE.
 *
 * ⚠️  IMPORTANTE: Todos los datos aquí son COMPLETAMENTE FICTICIOS.
 *     Las cédulas usan el rango V-99.000.001+ que NO corresponde a personas reales.
 *     JAMÁS use datos reales en desarrollo o pruebas.
 */

import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';

const prisma = new PrismaClient({ log: ['warn', 'error'] });

// ============================================================
// Utilidad: cifrado simulado para datos sensibles (dev only)
// En producción, esto usa HashiCorp Vault + AES-256-GCM
// ============================================================
function simulateEncrypt(value: string): string {
  // En desarrollo: simple encoding base64 para indicar que "está cifrado"
  // En producción: envelope encryption via Vault KMS
  return `ENC:${Buffer.from(value).toString('base64')}`;
}

function hashForSearch(value: string): string {
  // SHA-256 del valor normalizado, para búsqueda sin exponer el valor
  return crypto.createHash('sha256').update(value.toLowerCase().trim()).digest('hex');
}

// ============================================================
// DATOS DE PRUEBA
// ============================================================

const establecimientos = [
  {
    id: 'est-00000001-0000-0000-0000-000000000001',
    nombre: 'Hospital General Dr. José Ignacio Baldó',
    tipo: 'HOSPITAL' as const,
    dependencia: 'MPPS' as const,
    estado: 'Distrito Capital',
    municipio: 'Libertador',
    codigoMPPS: 'MPPS-DC-001',
    latitud: 10.5063,
    longitud: -66.9146,
  },
  {
    id: 'est-00000002-0000-0000-0000-000000000002',
    nombre: 'CDI La Pastora',
    tipo: 'CDI' as const,
    dependencia: 'MPPS' as const,
    estado: 'Distrito Capital',
    municipio: 'Libertador',
    codigoMPPS: 'MPPS-DC-002',
    latitud: 10.5150,
    longitud: -66.9150,
  },
  {
    id: 'est-00000003-0000-0000-0000-000000000003',
    nombre: 'Hospital Universitario de Los Andes',
    tipo: 'HOSPITAL' as const,
    dependencia: 'MPPS' as const,
    estado: 'Mérida',
    municipio: 'Libertador',
    codigoMPPS: 'MPPS-ME-001',
    latitud: 8.5897,
    longitud: -71.1439,
  },
  {
    id: 'est-00000004-0000-0000-0000-000000000004',
    nombre: 'Hospital Dr. Domingo Luciani (IVSS)',
    tipo: 'HOSPITAL' as const,
    dependencia: 'IVSS' as const,
    estado: 'Miranda',
    municipio: 'Sucre',
    codigoMPPS: null,
    latitud: 10.4756,
    longitud: -66.8537,
  },
  {
    id: 'est-00000005-0000-0000-0000-000000000005',
    nombre: 'Ambulatorio Urbano Tipo II La Vega',
    tipo: 'AMBULATORIO' as const,
    dependencia: 'MPPS' as const,
    estado: 'Distrito Capital',
    municipio: 'Libertador',
    codigoMPPS: 'MPPS-DC-010',
    latitud: 10.4830,
    longitud: -66.9510,
  },
];

// Pacientes sintéticos — cédulas en rango ficticio V-99.000.001+
const pacientesData = [
  { cedula: 'V-99000001', nombres: 'María Gabriela', apellidos: 'Soto Rivas', fechaNac: new Date('1985-03-15'), sexo: 'FEMENINO' as const },
  { cedula: 'V-99000002', nombres: 'José Antonio', apellidos: 'Pérez González', fechaNac: new Date('1972-07-22'), sexo: 'MASCULINO' as const },
  { cedula: 'V-99000003', nombres: 'Ana Lucía', apellidos: 'Martínez Blanco', fechaNac: new Date('1990-11-08'), sexo: 'FEMENINO' as const },
  { cedula: 'V-99000004', nombres: 'Carlos Eduardo', apellidos: 'Rodríguez Fuentes', fechaNac: new Date('1965-01-30'), sexo: 'MASCULINO' as const },
  { cedula: 'V-99000005', nombres: 'Luisa Fernanda', apellidos: 'Castillo Moreno', fechaNac: new Date('2001-05-19'), sexo: 'FEMENINO' as const },
  { cedula: 'V-99000006', nombres: 'Pedro Miguel', apellidos: 'Torres Lara', fechaNac: new Date('1978-09-03'), sexo: 'MASCULINO' as const },
  { cedula: 'V-99000007', nombres: 'Valentina', apellidos: 'Díaz Herrera', fechaNac: new Date('1995-12-25'), sexo: 'FEMENINO' as const },
  { cedula: 'V-99000008', nombres: 'Rafael Andrés', apellidos: 'Núñez Alvarado', fechaNac: new Date('1958-04-11'), sexo: 'MASCULINO' as const },
  { cedula: 'E-99000009', nombres: 'Simón Bolívar', apellidos: 'Extranjero Test', fechaNac: new Date('1988-06-24'), sexo: 'MASCULINO' as const },
  // Paciente sin documento (provisional)
  { cedula: null, nombres: 'Paciente', apellidos: 'Provisional Test', fechaNac: new Date('2024-01-01'), sexo: 'PREFIERO_NO_DECIR' as const },
];

const personalData = [
  // Médicos
  { nombres: 'Dra. Carmen', apellidos: 'Valenzuela Rojas', cedula: 'V-99001001', tipo: 'MEDICO' as const, nroColegiado: 'CMS-99001', especialidad: 'Medicina Interna', estIdx: 0 },
  { nombres: 'Dr. Alejandro', apellidos: 'Méndez Suárez', cedula: 'V-99001002', tipo: 'MEDICO' as const, nroColegiado: 'CMS-99002', especialidad: 'Pediatría', estIdx: 1 },
  { nombres: 'Dra. Isabel', apellidos: 'Guzmán Parra', cedula: 'V-99001003', tipo: 'MEDICO' as const, nroColegiado: 'CMS-99003', especialidad: 'Ginecología', estIdx: 2 },
  // Enfermería
  { nombres: 'Enf. Rosa', apellidos: 'Delgado Fuentes', cedula: 'V-99002001', tipo: 'ENFERMERIA' as const, nroColegiado: 'CNE-99001', especialidad: null, estIdx: 0 },
  { nombres: 'Enf. Luis', apellidos: 'Briceño Campos', cedula: 'V-99002002', tipo: 'ENFERMERIA' as const, nroColegiado: 'CNE-99002', especialidad: null, estIdx: 1 },
  // Administrativos
  { nombres: 'Adm. Patricia', apellidos: 'Salazar Mora', cedula: 'V-99003001', tipo: 'ADMINISTRATIVO' as const, nroColegiado: null, especialidad: null, estIdx: 0 },
  { nombres: 'Adm. Marco', apellidos: 'Quintero Ávila', cedula: 'V-99003002', tipo: 'ADMINISTRATIVO' as const, nroColegiado: null, especialidad: null, estIdx: 3 },
];

async function main() {
  console.log('🌱 Iniciando carga de datos sintéticos de prueba...');
  console.log('⚠️  TODOS LOS DATOS SON FICTICIOS - JAMÁS use datos reales\n');

  // 1. Limpiar en orden correcto (respetar FK)
  console.log('🗑️  Limpiando datos anteriores...');
  await prisma.auditoriaAcceso.deleteMany();
  await prisma.seguimiento.deleteMany();
  await prisma.prescripcion.deleteMany();
  await prisma.reposoMedico.deleteMany();
  await prisma.archivoResultado.deleteMany();
  await prisma.ordenResultado.deleteMany();
  await prisma.referencia.deleteMany();
  await prisma.diagnostico.deleteMany();
  await prisma.alergiaAntecedente.deleteMany();
  await prisma.episodio.deleteMany();
  await prisma.cita.deleteMany();
  await prisma.consentimiento.deleteMany();
  await prisma.agenda.deleteMany();
  await prisma.usuario.deleteMany();
  await prisma.personalSalud.deleteMany();
  await prisma.identificadorPaciente.deleteMany();
  await prisma.paciente.deleteMany();
  await prisma.establecimiento.deleteMany();
  console.log('✅ Base de datos limpia\n');

  // 2. Establecimientos
  console.log('🏥 Creando establecimientos...');
  const ests = await Promise.all(
    establecimientos.map((e) =>
      prisma.establecimiento.create({
        data: {
          id: e.id,
          nombre: e.nombre,
          tipo: e.tipo,
          dependencia: e.dependencia,
          estado: e.estado,
          municipio: e.municipio,
          codigoMPPS: e.codigoMPPS,
          latitud: e.latitud,
          longitud: e.longitud,
          creadoPor: 'SEED',
        },
      }),
    ),
  );
  console.log(`   ✅ ${ests.length} establecimientos creados`);

  // 3. Agendas médicas
  console.log('📅 Creando agendas...');
  await prisma.agenda.createMany({
    data: [
      { establecimientoId: ests[0].id, especialidad: 'Medicina Interna', diaSemana: 1, horaInicio: '07:30', horaFin: '12:00', duracionCitaMin: 20, cuposMaximos: 14, creadoPor: 'SEED' },
      { establecimientoId: ests[0].id, especialidad: 'Medicina Interna', diaSemana: 3, horaInicio: '07:30', horaFin: '12:00', duracionCitaMin: 20, cuposMaximos: 14, creadoPor: 'SEED' },
      { establecimientoId: ests[1].id, especialidad: 'Pediatría', diaSemana: 2, horaInicio: '08:00', horaFin: '12:00', duracionCitaMin: 20, cuposMaximos: 12, creadoPor: 'SEED' },
      { establecimientoId: ests[2].id, especialidad: 'Ginecología', diaSemana: 4, horaInicio: '08:00', horaFin: '13:00', duracionCitaMin: 30, cuposMaximos: 10, creadoPor: 'SEED' },
    ],
  });
  console.log('   ✅ Agendas creadas');

  // 4. Personal de salud y sus usuarios
  console.log('👩‍⚕️ Creando personal de salud y usuarios...');
  const personalCreado: { id: string; tipo: string; especialidad: string | null }[] = [];
  for (const p of personalData) {
    const rolMap: Record<string, 'MEDICO' | 'ENFERMERIA' | 'ADMINISTRATIVO'> = {
      MEDICO: 'MEDICO',
      ENFERMERIA: 'ENFERMERIA',
      ADMINISTRATIVO: 'ADMINISTRATIVO',
    };
    const rolUsuario = rolMap[p.tipo] || 'ADMINISTRATIVO';
    const personal = await prisma.personalSalud.create({
      data: {
        tipo: p.tipo,
        nroColegiado: p.nroColegiado,
        especialidad: p.especialidad,
        establecimientoId: ests[p.estIdx].id,
        usuario: {
          create: {
            keycloakId: `kc-personal-${p.cedula.replace(/\D/g, '')}`,
            rol: rolUsuario as 'MEDICO' | 'ENFERMERIA' | 'ADMINISTRATIVO',
            nivelCuenta: 'COMPLETO',
            mfaActivo: true,
            establecimientoId: ests[p.estIdx].id,
            creadoPor: 'SEED',
          },
        },
      },
    });
    personalCreado.push({ id: personal.id, tipo: p.tipo, especialidad: p.especialidad });
  }
  // Crear auditor y admin TI
  await prisma.usuario.create({
    data: {
      keycloakId: 'kc-auditor-99009001',
      rol: 'AUDITOR',
      nivelCuenta: 'COMPLETO',
      mfaActivo: true,
      creadoPor: 'SEED',
    },
  });
  await prisma.usuario.create({
    data: {
      keycloakId: 'kc-adminti-99009002',
      rol: 'ADMIN_TI',
      nivelCuenta: 'COMPLETO',
      mfaActivo: true,
      creadoPor: 'SEED',
    },
  });
  console.log(`   ✅ ${personalData.length + 2} usuarios de personal creados`);

  // 5. Pacientes
  console.log('👥 Creando pacientes...');
  const pacientesCreados: string[] = [];
  for (const [i, p] of pacientesData.entries()) {
    const esProvisional = p.cedula === null;
    const paciente = await prisma.paciente.create({
      data: {
        estadoIdentidad: esProvisional ? 'PROVISIONAL' : (i < 5 ? 'VERIFICADO' : 'EN_VALIDACION'),
        nombresCifrado: simulateEncrypt(p.nombres),
        apellidosCifrado: simulateEncrypt(p.apellidos),
        fechaNacimiento: p.fechaNac,
        sexo: p.sexo,
        telefonoCifrado: simulateEncrypt(`0412${String(9900000 + i).padStart(7, '0')}`),
        correoCifrado: simulateEncrypt(`paciente.test${i + 1}@snhce.dev`),
        creadoPor: 'SEED',
        consentimientos: {
          create: [
            {
              tipo: 'TRATAMIENTO_DATOS',
              version: '1.0',
              otorgado: true,
              fechaOtorgamiento: new Date(),
            },
          ],
        },
        ...(p.cedula
          ? {
              identificadores: {
                create: [
                  {
                    tipo: p.cedula.startsWith('E-') ? 'RNE' : 'CEDULA_VE',
                    valorCifrado: simulateEncrypt(p.cedula),
                    valorHash: hashForSearch(p.cedula),
                    creadoPor: 'SEED',
                  },
                ],
              },
            }
          : {
              identificadores: {
                create: [
                  {
                    tipo: 'PROVISIONAL',
                    valorCifrado: simulateEncrypt(`PROV-${Date.now()}-${i}`),
                    valorHash: hashForSearch(`PROV-${Date.now()}-${i}`),
                    creadoPor: 'SEED',
                  },
                ],
              },
            }),
      },
    });

    // Crear cuenta de usuario para el paciente (excepto provisional)
    if (!esProvisional) {
      await prisma.usuario.create({
        data: {
          keycloakId: `kc-paciente-${p.cedula!.replace(/\D/g, '')}`,
          pacienteId: paciente.id,
          rol: 'PACIENTE',
          nivelCuenta: i < 5 ? 'COMPLETO' : 'BASICO',
          mfaActivo: i < 3,
          creadoPor: 'SEED',
        },
      });
    }

    pacientesCreados.push(paciente.id);
  }
  console.log(`   ✅ ${pacientesCreados.length} pacientes creados`);

  // 6. Citas (próximas 30 días)
  console.log('📋 Creando citas...');
  const medicoIds = personalCreado.filter((p) => p.tipo === 'MEDICO');
  const hoy = new Date();
  const citas = [];
  for (let i = 0; i < 20; i++) {
    const diasAdelante = Math.floor(i / 3) + 1;
    const fechaCita = new Date(hoy);
    fechaCita.setDate(hoy.getDate() + diasAdelante);
    fechaCita.setHours(8 + (i % 5), (i % 3) * 20, 0, 0);

    const pacienteIdx = i % Math.min(pacientesCreados.length - 1, 9); // excluir provisional
    const medicoIdx = i % medicoIds.length;

    const cita = await prisma.cita.create({
      data: {
        pacienteId: pacientesCreados[pacienteIdx],
        establecimientoId: ests[medicoIdx % ests.length].id,
        medicoId: medicoIds[medicoIdx].id,
        especialidad: medicoIds[medicoIdx].especialidad || 'Medicina General',
        fechaHora: fechaCita,
        estado: i < 5 ? 'CONFIRMADA' : 'SOLICITADA',
        canal: i % 2 === 0 ? 'PORTAL_WEB' : 'PRESENCIAL',
        creadoPor: 'SEED',
      },
    });
    citas.push(cita.id);
  }
  console.log(`   ✅ ${citas.length} citas creadas`);

  // 7. Episodios con datos clínicos sintéticos
  console.log('🏥 Creando episodios clínicos de prueba...');
  const episodiosDatos = [
    {
      pacienteIdx: 0,
      estIdx: 0,
      medicoIdx: 0,
      tipo: 'CONSULTA' as const,
      motivo: 'Dolor de cabeza persistente y fiebre de 3 días de evolución',
      codigoCie10: 'J06.9',
      dxDescripcion: 'Infección aguda de las vías respiratorias superiores, no especificada',
      medicamento: 'Ibuprofeno 400 mg',
      dosis: '1 tableta',
      via: 'Oral',
      frecuencia: 'Cada 8 horas',
      duracion: 5,
    },
    {
      pacienteIdx: 1,
      estIdx: 3,
      medicoIdx: 0,
      tipo: 'CONSULTA' as const,
      motivo: 'Control de diabetes e hipertensión arterial',
      codigoCie10: 'E11.9',
      dxDescripcion: 'Diabetes mellitus tipo 2 sin complicaciones',
      medicamento: 'Metformina 850 mg',
      dosis: '1 tableta',
      via: 'Oral',
      frecuencia: 'Dos veces al día con las comidas',
      duracion: 90,
    },
    {
      pacienteIdx: 2,
      estIdx: 2,
      medicoIdx: 2,
      tipo: 'CONSULTA' as const,
      motivo: 'Control prenatal mes 6',
      codigoCie10: 'Z34.2',
      dxDescripcion: 'Supervisión de embarazo normal, segundo trimestre',
      medicamento: 'Ácido fólico 5 mg',
      dosis: '1 tableta',
      via: 'Oral',
      frecuencia: 'Una vez al día',
      duracion: 60,
    },
    {
      pacienteIdx: 3,
      estIdx: 0,
      medicoIdx: 0,
      tipo: 'EMERGENCIA' as const,
      motivo: 'Dolor precordial opresivo irradiado al brazo izquierdo',
      codigoCie10: 'I20.9',
      dxDescripcion: 'Angina de pecho, no especificada',
      medicamento: 'Aspirina 100 mg',
      dosis: '1 tableta',
      via: 'Oral',
      frecuencia: 'Una vez al día',
      duracion: 30,
    },
    {
      pacienteIdx: 4,
      estIdx: 1,
      medicoIdx: 1,
      tipo: 'CONTROL' as const,
      motivo: 'Seguimiento de infección urinaria',
      codigoCie10: 'N39.0',
      dxDescripcion: 'Infección de vías urinarias, sitio no especificado',
      medicamento: 'Nitrofurantoína 100 mg',
      dosis: '1 cápsula',
      via: 'Oral',
      frecuencia: 'Cada 12 horas',
      duracion: 7,
    },
  ];

  for (const [idx, ed] of episodiosDatos.entries()) {
    const medicoPersonal = personalCreado.filter((p) => p.tipo === 'MEDICO')[ed.medicoIdx];
    const fechaEpisodio = new Date(hoy);
    fechaEpisodio.setDate(hoy.getDate() - (idx + 1) * 7); // Episodios en el pasado

    const episodio = await prisma.episodio.create({
      data: {
        pacienteId: pacientesCreados[ed.pacienteIdx],
        establecimientoId: ests[ed.estIdx].id,
        medicoId: medicoPersonal.id,
        tipoEpisodio: ed.tipo,
        estado: 'CERRADO',
        pesoKg: 65 + idx * 5,
        tallaCm: 160 + idx * 3,
        presionSistolica: 120 + idx * 10,
        presionDiastolica: 80 + idx * 5,
        frecuenciaCardiaca: 72 + idx * 3,
        temperaturacelsius: 36.5 + (idx === 0 ? 1.5 : 0),
        saturacionO2: 98 - idx,
        motivoConsultaCifrado: simulateEncrypt(ed.motivo),
        evolucionCifrado: simulateEncrypt(`Paciente de prueba en buen estado general. Evaluación clínica realizada. Plan de tratamiento indicado.`),
        creadoPor: medicoPersonal.id,
        diagnosticos: {
          create: [
            {
              codigoCie10: ed.codigoCie10,
              descripcion: ed.dxDescripcion,
              tipoDx: 'PRINCIPAL',
              estadoDx: idx < 2 ? 'CRONICO' : 'RESUELTO',
              creadoPor: medicoPersonal.id,
            },
          ],
        },
        prescripciones: {
          create: [
            {
              rxnormCui: null, // Pendiente integración RxNorm completa
              nombreMedicamento: ed.medicamento,
              dosis: ed.dosis,
              via: ed.via,
              frecuencia: ed.frecuencia,
              duracionDias: ed.duracion,
              instrucciones: 'Tomar con alimentos. No suspender sin consultar al médico.',
              codigoVerificacion: `RX-${Date.now()}-${idx}`,
              creadoPor: medicoPersonal.id,
            },
          ],
        },
        ...(ed.tipo === 'CONSULTA' && idx === 0
          ? {
              repososMedicos: {
                create: [
                  {
                    fechaInicio: fechaEpisodio,
                    fechaFin: new Date(fechaEpisodio.getTime() + 3 * 24 * 60 * 60 * 1000),
                    diasReposo: 3,
                    codigoVerificacion: `REP-${Date.now()}-${idx}`,
                    urlVerificacion: `http://localhost:3000/api/v1/reposos/verificar/REP-${Date.now()}-${idx}`,
                    creadoPor: medicoPersonal.id,
                  },
                ],
              },
            }
          : {}),
      },
    });
    console.log(`   ✅ Episodio ${idx + 1}/5: ${ed.tipo} - ${ed.dxDescripcion.substring(0, 40)}...`);
  }

  // 8. Alergias para el primer paciente
  await prisma.alergiaAntecedente.create({
    data: {
      pacienteId: pacientesCreados[0],
      tipo: 'ALERGIA',
      descripcion: 'Alergia a la penicilina',
      agente: 'Penicilina',
      severidad: 'GRAVE',
      reaccion: 'Urticaria generalizada y angioedema',
      creadoPor: 'SEED',
    },
  });
  await prisma.alergiaAntecedente.create({
    data: {
      pacienteId: pacientesCreados[1],
      tipo: 'ALERGIA',
      descripcion: 'Intolerancia al ácido acetilsalicílico',
      agente: 'Aspirina / AAS',
      severidad: 'MODERADA',
      reaccion: 'Broncoespasmo',
      creadoPor: 'SEED',
    },
  });
  console.log('   ✅ Alergias de prueba creadas');

  console.log('\n🎉 ¡Datos sintéticos cargados exitosamente!');
  console.log('');
  console.log('📊 Resumen:');
  console.log(`   🏥 Establecimientos: ${ests.length}`);
  console.log(`   👩‍⚕️ Personal de salud: ${personalData.length}`);
  console.log(`   👥 Pacientes: ${pacientesCreados.length}`);
  console.log(`   📋 Citas: ${citas.length}`);
  console.log(`   🏥 Episodios clínicos: 5`);
  console.log('');
  console.log('⚠️  Recuerde: TODOS los datos anteriores son FICTICIOS');
}

main()
  .catch((e) => {
    console.error('❌ Error durante la carga de datos:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
