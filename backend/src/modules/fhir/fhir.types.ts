/**
 * Tipos FHIR R4 usados por el mapper y el controlador.
 * Definidos aquí y exportados para que TypeScript pueda
 * nombrarlos en las firmas de los métodos públicos (TS4053).
 */

export interface FhirResource {
  resourceType: string;
  id: string;
  meta?: { profile?: string[] };
}

export interface FhirPatient extends FhirResource {
  identifier: any[];
  name: any[];
  birthDate?: string;
  gender?: string;
}

export interface FhirEncounter extends FhirResource {
  status: string;
  class: any;
  subject: any;
  period?: any;
  participant?: any[];
  serviceProvider?: any;
}

export interface FhirCondition extends FhirResource {
  clinicalStatus: any;
  code: any;
  subject: any;
  encounter?: any;
  recordedDate?: string;
}

export interface FhirAllergyIntolerance extends FhirResource {
  clinicalStatus: any;
  code: any;
  patient: any;
  reaction?: any[];
}

export interface FhirMedicationRequest extends FhirResource {
  status: string;
  intent: string;
  medication: any;
  subject: any;
  encounter?: any;
  dosageInstruction?: any[];
}

export interface FhirObservation extends FhirResource {
  status: string;
  code: any;
  subject: any;
  valueQuantity?: any;
  effectiveDateTime?: string;
}

export interface FhirAppointment extends FhirResource {
  status: string;
  specialty?: any[];
  start?: string;
  participant: any[];
}

export interface FhirBundle {
  resourceType: 'Bundle';
  type: string;
  total: number;
  entry: Array<{ resource: FhirResource }>;
}
