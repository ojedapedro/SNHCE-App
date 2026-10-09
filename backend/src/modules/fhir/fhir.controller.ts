import { Controller, Get, Param } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { FhirMapperService } from './fhir-mapper.service';
import { Roles } from '../../common/auth/decorators';
import {
  FhirPatient,
  FhirEncounter,
  FhirAppointment,
  FhirBundle,
} from './fhir.types';

/**
 * Fachada FHIR R4 — Endpoints compatibles con el estándar HL7 FHIR R4.
 * Base URL: /fhir/R4/
 *
 * Cumplimiento:
 * - Content-Type: application/fhir+json
 * - Todos los recursos incluyen .meta.profile con la URL de perfil FHIR
 * - Los identificadores sensibles (cédula) NO se exponen en texto plano
 * - Acceso sujeto a los mismos guards RBAC/ABAC que el API REST principal
 */
@ApiTags('Interoperabilidad FHIR R4')
@ApiBearerAuth()
@Controller('fhir/R4')
export class FhirController {
  constructor(private readonly fhirMapper: FhirMapperService) {}

  @Get('Patient/:id')
  @Roles('MEDICO', 'ENFERMERIA', 'ADMINISTRADOR_DATOS', 'AUDITOR')
  @ApiOperation({ summary: 'FHIR Patient resource por ID interno' })
  async getPatient(@Param('id') id: string): Promise<FhirPatient> {
    return this.fhirMapper.getPatient(id);
  }

  @Get('Encounter/:id')
  @Roles('MEDICO', 'ENFERMERIA')
  @ApiOperation({ summary: 'FHIR Encounter (Episodio Clínico)' })
  async getEncounter(@Param('id') id: string): Promise<FhirEncounter> {
    return this.fhirMapper.getEncounter(id);
  }

  @Get('Encounter/:id/Condition')
  @Roles('MEDICO', 'ENFERMERIA')
  @ApiOperation({ summary: 'Diagnósticos CIE-10 de un Episodio en formato FHIR Condition' })
  async getConditions(@Param('id') id: string): Promise<FhirBundle> {
    const conditions = await this.fhirMapper.getConditionsForEpisodio(id);
    return {
      resourceType: 'Bundle',
      type: 'searchset',
      total: conditions.length,
      entry: conditions.map(c => ({ resource: c })),
    };
  }

  @Get('Patient/:id/AllergyIntolerance')
  @Roles('MEDICO', 'ENFERMERIA')
  @ApiOperation({ summary: 'Alergias activas del paciente en formato FHIR AllergyIntolerance' })
  async getAllergies(@Param('id') id: string): Promise<FhirBundle> {
    const allergies = await this.fhirMapper.getAllergiesForPatient(id);
    return {
      resourceType: 'Bundle',
      type: 'searchset',
      total: allergies.length,
      entry: allergies.map(a => ({ resource: a })),
    };
  }

  @Get('Encounter/:id/MedicationRequest')
  @Roles('MEDICO', 'ENFERMERIA')
  @ApiOperation({ summary: 'Prescripciones de un Episodio en formato FHIR MedicationRequest' })
  async getMedications(@Param('id') id: string): Promise<FhirBundle> {
    const meds = await this.fhirMapper.getMedicationRequests(id);
    return {
      resourceType: 'Bundle',
      type: 'searchset',
      total: meds.length,
      entry: meds.map(m => ({ resource: m })),
    };
  }

  @Get('Appointment/:id')
  @Roles('MEDICO', 'ENFERMERIA', 'ADMINISTRATIVO')
  @ApiOperation({ summary: 'FHIR Appointment (Cita médica)' })
  async getAppointment(@Param('id') id: string): Promise<FhirAppointment> {
    return this.fhirMapper.getAppointment(id);
  }

  @Get('metadata')
  @ApiOperation({ summary: 'FHIR Capability Statement — Documenta los recursos soportados' })
  getCapabilityStatement() {
    return {
      resourceType: 'CapabilityStatement',
      id: 'snhce-capability',
      status: 'active',
      date: new Date().toISOString(),
      kind: 'instance',
      software: { name: 'SNHCE Backend', version: '1.0.0' },
      fhirVersion: '4.0.1',
      format: ['application/fhir+json'],
      rest: [{
        mode: 'server',
        resource: [
          { type: 'Patient', interaction: [{ code: 'read' }] },
          { type: 'Encounter', interaction: [{ code: 'read' }] },
          { type: 'Condition', interaction: [{ code: 'read' }] },
          { type: 'AllergyIntolerance', interaction: [{ code: 'read' }] },
          { type: 'MedicationRequest', interaction: [{ code: 'read' }] },
          { type: 'Appointment', interaction: [{ code: 'read' }] },
        ]
      }]
    };
  }
}
