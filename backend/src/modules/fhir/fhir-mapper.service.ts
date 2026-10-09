/**
 * SNHCE — Módulo FHIR R4
 * 
 * Fachada de interoperabilidad: mapea el modelo interno de Prisma
 * a recursos FHIR R4 estándar. El modelo interno NO cambia; este
 * módulo actúa como una capa de traducción bidireccional.
 * 
 * Recursos implementados:
 *   Patient, Appointment, Encounter, Condition, AllergyIntolerance,
 *   MedicationRequest, Observation, DiagnosticReport, ServiceRequest
 */

import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/database/prisma.service';
import {
  FhirPatient,
  FhirEncounter,
  FhirCondition,
  FhirAllergyIntolerance,
  FhirMedicationRequest,
  FhirAppointment,
} from './fhir.types';

@Injectable()
export class FhirMapperService {
  constructor(private readonly prisma: PrismaService) {}

  // ─── Patient ──────────────────────────────────────────────────────────────

  async getPatient(pacienteId: string): Promise<FhirPatient> {
    const p = await this.prisma.paciente.findUnique({
      where: { id: pacienteId },
      include: { identificadores: true }
    });
    if (!p) throw new NotFoundException(`Patient/${pacienteId} not found`);

    return {
      resourceType: 'Patient',
      id: pacienteId,
      meta: { profile: ['http://hl7.org/fhir/StructureDefinition/Patient'] },
      // Identificadores internos — la cédula nunca va en el id de la URL
      identifier: p.identificadores.map((ident: { tipo: string; valorHash: string }) => ({
        use: 'official',
        system: this.systemForTipo(ident.tipo),
        value: '[cifrado — no expuesto en FHIR]', // Valor nunca se expone en texto claro
        _value: { extension: [{ url: 'http://snhce.gob.ve/fhir/hash', valueString: ident.valorHash }] }
      })),
      name: [{
        use: 'official',
        family: p.apellidosCifrado,   // En prod: descifrar antes de mapear
        given: [p.nombresCifrado],
      }],
      birthDate: p.fechaNacimiento.toISOString().split('T')[0],
      gender: this.mapSexo(p.sexo),
    };
  }

  // ─── Encounter ────────────────────────────────────────────────────────────

  async getEncounter(episodioId: string): Promise<FhirEncounter> {
    const ep = await this.prisma.episodio.findUnique({
      where: { id: episodioId },
      include: { establecimiento: true }
    });
    if (!ep) throw new NotFoundException(`Encounter/${episodioId} not found`);

    return {
      resourceType: 'Encounter',
      id: episodioId,
      status: ep.estado === 'ABIERTO' ? 'in-progress' : 'finished',
      class: {
        system: 'http://terminology.hl7.org/CodeSystem/v3-ActCode',
        code: ep.tipoEpisodio === 'EMERGENCIA' ? 'EMER' : 'AMB',
        display: ep.tipoEpisodio,
      },
      subject: { reference: `Patient/${ep.pacienteId}` },
      period: { start: ep.creadoEn.toISOString(), end: ep.estado === 'CERRADO' ? ep.actualizadoEn.toISOString() : undefined },
      serviceProvider: { reference: `Organization/${ep.establecimientoId}`, display: ep.establecimiento.nombre },
    };
  }

  // ─── Condition (Diagnóstico CIE-10) ───────────────────────────────────────

  async getConditionsForEpisodio(episodioId: string): Promise<FhirCondition[]> {
    const diagnosticos = await this.prisma.diagnostico.findMany({ where: { episodioId } });

    return diagnosticos.map((dx: { id: string; estadoDx: string; codigoCie10: string; descripcion: string; creadoEn: Date }) => ({
      resourceType: 'Condition',
      id: dx.id,
      clinicalStatus: {
        coding: [{ system: 'http://terminology.hl7.org/CodeSystem/condition-clinical', code: dx.estadoDx === 'ACTIVO' ? 'active' : 'resolved' }]
      },
      code: {
        coding: [{
          system: 'http://hl7.org/fhir/sid/icd-10',
          code: dx.codigoCie10,
          display: dx.descripcion
        }],
        text: dx.descripcion,
      },
      subject: { reference: `Patient/${(dx as any).episodio?.pacienteId || 'unknown'}` },
      encounter: { reference: `Encounter/${episodioId}` },
      recordedDate: dx.creadoEn.toISOString(),
    }));
  }

  // ─── AllergyIntolerance ───────────────────────────────────────────────────

  async getAllergiesForPatient(pacienteId: string): Promise<FhirAllergyIntolerance[]> {
    const alergias = await this.prisma.alergiaAntecedente.findMany({
      where: { pacienteId, tipo: 'ALERGIA', activa: true }
    });

    return alergias.map((al: { id: string; activa: boolean; codigoSnomed: string | null; descripcion: string; reaccion: string | null; severidad: string | null }) => ({
      resourceType: 'AllergyIntolerance',
      id: al.id,
      clinicalStatus: {
        coding: [{ system: 'http://terminology.hl7.org/CodeSystem/allergyintolerance-clinical', code: al.activa ? 'active' : 'inactive' }]
      },
      code: al.codigoSnomed
        ? { coding: [{ system: 'http://snomed.info/sct', code: al.codigoSnomed, display: al.descripcion }], text: al.descripcion }
        : { text: al.descripcion },
      patient: { reference: `Patient/${pacienteId}` },
      reaction: al.reaccion ? [{ manifestation: [{ text: al.reaccion }], severity: al.severidad?.toLowerCase() }] : undefined,
    }));
  }

  // ─── MedicationRequest ────────────────────────────────────────────────────

  async getMedicationRequests(episodioId: string): Promise<FhirMedicationRequest[]> {
    const prescripciones = await this.prisma.prescripcion.findMany({ where: { episodioId } });

    return prescripciones.map((rx: { id: string; estado: string; rxnormCui: string | null; nombreMedicamento: string; dosis: string; via: string; frecuencia: string }) => ({
      resourceType: 'MedicationRequest',
      id: rx.id,
      status: rx.estado === 'ACTIVA' ? 'active' : rx.estado === 'CANCELADA' ? 'cancelled' : 'completed',
      intent: 'order',
      medication: rx.rxnormCui
        ? { concept: { coding: [{ system: 'http://www.nlm.nih.gov/research/umls/rxnorm', code: rx.rxnormCui, display: rx.nombreMedicamento }] } }
        : { concept: { text: rx.nombreMedicamento } },
      subject: { reference: `Patient/unknown` }, // Resolved via encounter
      encounter: { reference: `Encounter/${episodioId}` },
      dosageInstruction: [{
        text: `${rx.dosis} ${rx.via} ${rx.frecuencia}`,
        route: { text: rx.via },
        timing: { repeat: { frequency: 1, period: 8, periodUnit: 'h' } }, // Simplificado
      }],
    }));
  }

  // ─── Appointment ──────────────────────────────────────────────────────────

  async getAppointment(citaId: string): Promise<FhirAppointment> {
    const cita = await this.prisma.cita.findUnique({ where: { id: citaId } });
    if (!cita) throw new NotFoundException(`Appointment/${citaId} not found`);

    return {
      resourceType: 'Appointment',
      id: citaId,
      status: this.mapEstadoCita(cita.estado),
      specialty: [{ coding: [{ display: cita.especialidad }] }],
      start: cita.fechaHora.toISOString(),
      participant: [
        { actor: { reference: `Patient/${cita.pacienteId}` }, status: 'accepted' },
        ...(cita.medicoId ? [{ actor: { reference: `Practitioner/${cita.medicoId}` }, status: 'accepted' }] : []),
      ],
    };
  }

  // ─── Helpers ──────────────────────────────────────────────────────────────

  private mapSexo(sexo: string): string {
    const map: Record<string, string> = { MASCULINO: 'male', FEMENINO: 'female', INTERSEX: 'other', PREFIERO_NO_DECIR: 'unknown' };
    return map[sexo] || 'unknown';
  }

  private systemForTipo(tipo: string): string {
    const map: Record<string, string> = {
      CEDULA_VE: 'urn:oid:2.16.862.1.1',  // OID ficticio para cédula venezolana
      PASAPORTE: 'http://hl7.org/fhir/sid/passport-VEN',
      PROVISIONAL: 'http://snhce.gob.ve/fhir/id/provisional',
    };
    return map[tipo] || 'urn:snhce:identifier';
  }

  private mapEstadoCita(estado: string): string {
    const map: Record<string, string> = {
      SOLICITADA: 'proposed', CONFIRMADA: 'booked', EN_ESPERA: 'waitlist',
      ATENDIDA: 'fulfilled', INASISTENCIA: 'noshow', CANCELADA: 'cancelled',
    };
    return map[estado] || 'unknown';
  }
}
