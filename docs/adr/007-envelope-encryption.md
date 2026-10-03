# ADR-007: Cifrado a Nivel de Campo con Envelope Encryption (Vault/KMS)

**Estado:** Aceptado  
**Fecha:** 2026-10-02  
**Autores:** Equipo SNHCE

---

## Contexto

El SNHCE maneja datos de salud altamente sensibles: nombres, cédulas, diagnósticos, notas clínicas, prescripciones. Venezuela no tiene un equivalente exacto a HIPAA, pero la Ley Orgánica de Protección de Datos Personales (LOPD) establece requisitos de protección para datos sensibles, con especial énfasis en datos de salud (artículos 13-14).

Un compromiso de la base de datos (ej. backup filtrado, acceso no autorizado al servidor) no debe exponer datos de pacientes en texto plano. El cifrado solo a nivel de disco (at-rest encryption) no es suficiente si el atacante obtiene acceso al motor de base de datos.

Se requiere **cifrado a nivel de campo** para:
- `paciente.nombresCifrado`, `paciente.apellidosCifrado`
- `identificadorPaciente.valorCifrado` (cédulas, pasaportes)
- `paciente.telefonoCifrado`, `paciente.correoCifrado`
- `episodio.motivoConsultaCifrado`, `episodio.evolucionCifrado`
- `archivoResultado.minioKey`

---

## Decisión

Se implementa **Envelope Encryption** con las siguientes características:

### Modelo de llaves
```
KEK (Key Encryption Key)
  → almacenada en HashiCorp Vault (nunca en código ni en BD)
  → rotada periódicamente

DEK (Data Encryption Key)
  → generada por la aplicación para cada "contexto" (ej. por paciente)
  → cifrada con la KEK y almacenada en la BD junto al dato cifrado
  → formato: { encryptedDek: string, encryptedValue: string, keyVersion: string }
```

### Algoritmo
- Cifrado: **AES-256-GCM** (autenticado, resiste modificación)
- DEK: 256 bits, generada con `crypto.randomBytes(32)`
- IV/Nonce: 96 bits por operación, nunca reutilizado

### Búsqueda por campo cifrado
Como no se puede hacer `WHERE cedula = ?` sobre un valor cifrado, se almacena un **hash determinístico** del valor normalizado en una columna separada:
```sql
-- Para buscar por cédula:
WHERE valor_hash = SHA256(normalize('V-12345678'))
-- El resultado se decifra en la aplicación para verificar
```

### Abstracción KMS
```typescript
interface KmsAdapter {
  encrypt(plaintext: string, context: Record<string, string>): Promise<EncryptedField>;
  decrypt(field: EncryptedField, context: Record<string, string>): Promise<string>;
  rotateKey(keyId: string): Promise<void>;
}
// Implementaciones: VaultKmsAdapter (prod), LocalKmsAdapter (dev/test)
```

---

## Consecuencias

### Positivas
- Un dump de la base de datos sin acceso a Vault es inútil para el atacante.
- Rotación de llaves sin re-cifrar todos los datos (solo se re-cifra la DEK).
- La abstracción KMS permite cambiar el proveedor (Vault → AWS KMS → Azure KV) sin cambiar la lógica de aplicación.
- Cumplimiento con LOPD para datos sensibles de salud.

### Negativas
- No se puede hacer queries SQL directas por campos cifrados (solo por hash).
- Overhead de latencia en cada operación de lectura/escritura de campos sensibles (~5-10 ms con Vault local).
- Complejidad operacional: Vault debe estar disponible para que la app funcione.
- Las migraciones de datos históricos requieren proceso de cifrado.

### Neutrales
- En desarrollo se usa un `LocalKmsAdapter` con una llave fija en `.env` (claramente marcado como NO PRODUCCIÓN).
- Los campos de búsqueda por hash son indexados en PostgreSQL para rendimiento.

---

## Alternativas consideradas

1. **Solo cifrado de disco (TDE)**: Cifrado transparente a nivel de tablespace de PostgreSQL. *Rechazado*: No protege si el atacante obtiene acceso al proceso de base de datos.

2. **Cifrado en Vault directamente (Transit Engine)**: Vault cifra/descifra cada campo individualmente vía API. *Considerado*: Ofrece mayor centralización pero mayor latencia y dependencia de red. Se puede migrar a este modelo en el futuro.

3. **Sin cifrado a nivel campo**: Solo TLS + cifrado de disco. *Rechazado*: Insuficiente para datos de salud según los requisitos de seguridad.
