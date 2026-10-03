import React, { useState } from 'react';
import { Card, Button, Badge, Input } from '@snhce/ui';
import { useQuery } from '@tanstack/react-query';

type TabId = 'usuarios' | 'duplicados' | 'auditoria' | 'emergencias' | 'anomalias' | 'indicadores';

export default function ConsolaAdminPage() {
  const [tab, setTab] = useState<TabId>('usuarios');

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-slate-800 text-white px-6 py-4 shadow-lg">
        <h1 className="text-xl font-bold">🛡️ Consola Administrativa — SNHCE</h1>
        <p className="text-slate-300 text-sm">Panel de Gestión, Auditoría y Cumplimiento</p>
      </header>

      <div className="flex">
        {/* Sidebar */}
        <nav className="w-60 bg-slate-900 min-h-screen p-4 space-y-1">
          {[
            { id: 'usuarios', label: '👥 Usuarios y Roles' },
            { id: 'duplicados', label: '🔀 Duplicados MPI' },
            { id: 'auditoria', label: '📋 Bitácora' },
            { id: 'emergencias', label: '🚨 Accesos Emergencia' },
            { id: 'anomalias', label: '⚠️ Anomalías' },
            { id: 'indicadores', label: '📊 Indicadores' },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => setTab(item.id as TabId)}
              className={`w-full text-left px-4 py-2.5 rounded-md text-sm font-medium transition-colors ${
                tab === item.id
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-300 hover:bg-slate-700 hover:text-white'
              }`}
            >
              {item.label}
            </button>
          ))}
        </nav>

        {/* Content */}
        <main className="flex-1 p-6">
          {tab === 'usuarios' && <TabUsuarios />}
          {tab === 'duplicados' && <TabDuplicadosMPI />}
          {tab === 'auditoria' && <TabAuditoria />}
          {tab === 'emergencias' && <TabEmergencias />}
          {tab === 'anomalias' && <TabAnomalias />}
          {tab === 'indicadores' && <TabIndicadores />}
        </main>
      </div>
    </div>
  );
}

// ─── TAB: Usuarios y Roles ─────────────────────────────────────────────────────

function TabUsuarios() {
  const [pendienteAprobacion, setPendienteAprobacion] = useState<any>(null);

  const usuarios = [
    { id: 'u1', nombre: 'Dr. Carlos Rivas', rol: 'MEDICO', centro: 'HGC', estado: 'ACTIVO' },
    { id: 'u2', nombre: 'Lic. María Torres', rol: 'ENFERMERIA', centro: 'CDI Petare', estado: 'ACTIVO' },
    { id: 'u3', nombre: 'Admin Juan López', rol: 'ADMINISTRATIVO', centro: 'HGC', estado: 'BLOQUEADO' },
  ];

  const solicitarCambioRol = (usuario: any) => {
    // Simula apertura del flujo de doble aprobación
    setPendienteAprobacion({ ...usuario, nuevoRol: 'MEDICO' });
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">Gestión de Usuarios y Roles</h2>
        <Button>+ Crear Usuario</Button>
      </div>

      {pendienteAprobacion && (
        <div className="bg-amber-50 border-2 border-amber-400 rounded-lg p-5">
          <h3 className="font-bold text-amber-900 mb-2">🔐 Solicitud Pendiente de Doble Aprobación</h3>
          <p className="text-sm text-amber-800 mb-4">
            Se ha solicitado cambiar el rol de <strong>{pendienteAprobacion.nombre}</strong> a{' '}
            <strong>{pendienteAprobacion.nuevoRol}</strong>. Un segundo Administrador de TI debe confirmar esta acción.
          </p>
          <div className="flex gap-3">
            <Button onClick={() => { alert('Cambio aprobado y registrado en bitácora.'); setPendienteAprobacion(null); }}>
              ✓ Aprobar como Segundo Admin
            </Button>
            <Button variant="outline" onClick={() => setPendienteAprobacion(null)}>Rechazar</Button>
          </div>
        </div>
      )}

      <Card className="overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Usuario</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Rol Actual</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Centro</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Estado</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {usuarios.map((u) => (
              <tr key={u.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 font-medium text-gray-900">{u.nombre}</td>
                <td className="px-6 py-4">
                  <Badge variant="default">{u.rol}</Badge>
                </td>
                <td className="px-6 py-4 text-gray-500">{u.centro}</td>
                <td className="px-6 py-4">
                  <Badge variant={u.estado === 'ACTIVO' ? 'success' : 'destructive'}>{u.estado}</Badge>
                </td>
                <td className="px-6 py-4 text-right space-x-2">
                  <Button variant="outline" size="sm" onClick={() => solicitarCambioRol(u)}>
                    Cambiar Rol
                  </Button>
                  <Button variant="outline" size="sm" className="text-red-600">
                    {u.estado === 'ACTIVO' ? 'Bloquear' : 'Activar'}
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}

// ─── TAB: Duplicados MPI ───────────────────────────────────────────────────────

function TabDuplicadosMPI() {
  const [fusionado, setFusionado] = useState<string | null>(null);

  const candidatosDuplicados = [
    { id: 'dup1', origen: { id: 'p-001', nombre: 'Carlos Perez', cedula: 'V-99.001.001' }, destino: { id: 'p-002', nombre: 'Carlos Pérez López', cedula: 'V-99.001.001' }, similitud: '97%' },
    { id: 'dup2', origen: { id: 'p-003', nombre: 'Maria González', cedula: 'V-99.002.005' }, destino: { id: 'p-004', nombre: 'María González', cedula: 'PROVISIONAL-448A' }, similitud: '89%' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Duplicados MPI — Fusión Reversible</h2>
        <p className="text-gray-500 text-sm mt-1">Los registros fusionados NUNCA se eliminan. El historial clínico del origen queda accesible via la cadena de referencia.</p>
      </div>

      <div className="space-y-4">
        {candidatosDuplicados.map((dup) => (
          <Card key={dup.id} className={`p-5 ${fusionado === dup.id ? 'opacity-50 border-green-400 border-2' : ''}`}>
            <div className="flex justify-between items-center">
              <Badge variant="warning" className="text-xs">Similitud: {dup.similitud}</Badge>
              {fusionado === dup.id && <Badge variant="success">FUSIONADO</Badge>}
            </div>

            <div className="grid grid-cols-2 gap-8 my-4">
              <div className="bg-red-50 p-4 rounded-md border border-red-200">
                <p className="text-xs font-bold text-red-600 mb-1">REGISTRO ORIGEN (Quedará como FUSIONADO)</p>
                <p className="font-bold">{dup.origen.nombre}</p>
                <p className="text-sm text-gray-500">{dup.origen.cedula}</p>
                <p className="text-xs text-gray-400">ID: {dup.origen.id}</p>
              </div>
              <div className="bg-green-50 p-4 rounded-md border border-green-200">
                <p className="text-xs font-bold text-green-600 mb-1">REGISTRO DESTINO (Consolidado)</p>
                <p className="font-bold">{dup.destino.nombre}</p>
                <p className="text-sm text-gray-500">{dup.destino.cedula}</p>
                <p className="text-xs text-gray-400">ID: {dup.destino.id}</p>
              </div>
            </div>

            <div className="flex gap-3">
              <Button
                disabled={!!fusionado}
                onClick={() => {
                  if (confirm(`¿Confirma la fusión de ${dup.origen.nombre} → ${dup.destino.nombre}? Esta acción es reversible pero requiere aprobación especial para deshacer.`)) {
                    setFusionado(dup.id);
                  }
                }}
              >
                Fusionar Registros
              </Button>
              <Button variant="outline">Descartar (No son duplicados)</Button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

// ─── TAB: Bitácora de Auditoría ────────────────────────────────────────────────

function TabAuditoria() {
  const [verificando, setVerificando] = useState(false);
  const [resultadoVerificacion, setResultadoVerificacion] = useState<any>(null);

  const registros = [
    { id: '10001', accion: 'LEER', usuario: 'Dr. Rivas', recurso: 'resumen_clinico', centro: 'HGC', ip: '10.0.0.12', fecha: '2024-10-02 09:15:00', integro: true },
    { id: '10002', accion: 'CREAR', usuario: 'Adm. Torres', recurso: 'cita', centro: 'CDI Petare', ip: '10.0.1.5', fecha: '2024-10-02 09:18:32', integro: true },
    { id: '10003', accion: 'ACCESO_EMERGENCIA', usuario: 'Dr. Mendoza', recurso: 'resumen_clinico', centro: 'Hospital Vargas', ip: '10.0.2.8', fecha: '2024-10-02 10:45:11', integro: true },
  ];

  const verificarIntegridad = () => {
    setVerificando(true);
    setTimeout(() => {
      setResultadoVerificacion({ totalVerificados: 10432, integro: true, registrosCorruptos: [] });
      setVerificando(false);
    }, 2000);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">Bitácora de Auditoría</h2>
        <Button onClick={verificarIntegridad} isLoading={verificando} variant="outline">
          🔍 Verificar Integridad Hash-Chain
        </Button>
      </div>

      {resultadoVerificacion && (
        <div className={`p-4 rounded-lg border-2 ${resultadoVerificacion.integro ? 'bg-green-50 border-green-400' : 'bg-red-50 border-red-400'}`}>
          <p className="font-bold">
            {resultadoVerificacion.integro ? '✅ Bitácora Íntegra' : '🚨 ALERTA: Integridad Comprometida'}
          </p>
          <p className="text-sm mt-1">
            {resultadoVerificacion.totalVerificados} registros verificados.{' '}
            {resultadoVerificacion.integro
              ? 'Ningún registro ha sido alterado.'
              : `${resultadoVerificacion.registrosCorruptos.length} registros con hash inválido detectados.`}
          </p>
        </div>
      )}

      <Card className="overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">ID</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Acción</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Usuario</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Recurso</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Centro</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">IP</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Fecha</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Íntegro</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {registros.map((r) => (
              <tr key={r.id} className={r.accion === 'ACCESO_EMERGENCIA' ? 'bg-orange-50' : ''}>
                <td className="px-4 py-3 font-mono text-xs text-gray-500">#{r.id}</td>
                <td className="px-4 py-3">
                  <Badge variant={r.accion === 'ACCESO_EMERGENCIA' ? 'destructive' : 'default'} className="text-xs">{r.accion}</Badge>
                </td>
                <td className="px-4 py-3 font-medium">{r.usuario}</td>
                <td className="px-4 py-3 text-gray-500">{r.recurso}</td>
                <td className="px-4 py-3 text-gray-500">{r.centro}</td>
                <td className="px-4 py-3 font-mono text-xs text-gray-400">{r.ip}</td>
                <td className="px-4 py-3 text-xs text-gray-400">{r.fecha}</td>
                <td className="px-4 py-3">{r.integro ? '✅' : '🚨'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}

// ─── TAB: Accesos de Emergencia ────────────────────────────────────────────────

function TabEmergencias() {
  const accesos = [
    { id: 'em1', medico: 'Dr. Ramón Mendoza', paciente: 'M. R. (oculto)', justificacion: 'Paciente inconsciente con traumatismo craneoencefálico severo. Urgencia absoluta.', fecha: '2024-10-02 10:45', centro: 'Hospital Vargas', revisado: false },
    { id: 'em2', medico: 'Dra. Carmen Leal', paciente: 'J. G. (oculto)', justificacion: 'Reacción anafiláctica grave. Necesito historial de alergias de inmediato.', fecha: '2024-09-29 14:22', centro: 'CDI Petare', revisado: true },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Revisión de Accesos de Emergencia (Break-Glass)</h2>
        <p className="text-gray-500 text-sm mt-1">Todo acceso de emergencia debe ser revisado por el comité de auditoría dentro de las 48 horas.</p>
      </div>

      <div className="space-y-4">
        {accesos.map((a) => (
          <Card key={a.id} className={`p-5 border-l-4 ${a.revisado ? 'border-l-green-500' : 'border-l-orange-500'}`}>
            <div className="flex justify-between items-start mb-3">
              <div>
                <p className="font-bold text-gray-900">{a.medico}</p>
                <p className="text-sm text-gray-500">{a.centro} — {a.fecha}</p>
              </div>
              <Badge variant={a.revisado ? 'success' : 'warning'}>
                {a.revisado ? 'REVISADO' : 'PENDIENTE REVISIÓN'}
              </Badge>
            </div>
            <div className="bg-gray-50 rounded p-3 mb-4">
              <p className="text-xs font-bold text-gray-500 mb-1">JUSTIFICACIÓN DECLARADA:</p>
              <p className="text-sm italic text-gray-700">"{a.justificacion}"</p>
            </div>
            {!a.revisado && (
              <div className="flex gap-3">
                <Button size="sm" onClick={() => alert('Acceso marcado como JUSTIFICADO y archivado.')}>
                  ✓ Marcar como Justificado
                </Button>
                <Button size="sm" variant="outline" className="text-red-600" onClick={() => alert('Alerta enviada al médico y a RRHH para investigación.')}>
                  🚨 Escalar para Investigación
                </Button>
              </div>
            )}
          </Card>
        ))}
      </div>
    </div>
  );
}

// ─── TAB: Anomalías ────────────────────────────────────────────────────────────

function TabAnomalias() {
  const alertas = [
    { id: 'an1', usuario: 'Dr. Luis Pérez', tipo: 'EXCESO_CONSULTAS', detalle: 'Consultó 87 historias clínicas en menos de 1 hora.', riesgo: 'ALTO', fecha: 'Hoy, 08:30' },
    { id: 'an2', usuario: 'Adm. Rosa Díaz', tipo: 'ACCESO_FUERA_CENTRO', detalle: 'Accedió a datos administrativos desde una IP fuera de su red habitual (IP: 189.43.x.x).', riesgo: 'MEDIO', fecha: 'Ayer, 22:15' },
  ];

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900">Detección de Anomalías</h2>

      <div className="space-y-4">
        {alertas.map((a) => (
          <Card key={a.id} className={`p-5 border-l-4 ${a.riesgo === 'ALTO' ? 'border-l-red-600 bg-red-50' : 'border-l-yellow-500 bg-yellow-50'}`}>
            <div className="flex justify-between items-start mb-3">
              <div>
                <p className="font-bold text-gray-900">{a.usuario}</p>
                <p className="text-xs text-gray-500">{a.fecha}</p>
              </div>
              <Badge variant={a.riesgo === 'ALTO' ? 'destructive' : 'warning'}>Riesgo {a.riesgo}</Badge>
            </div>
            <p className="text-sm text-gray-700 mb-4">{a.detalle}</p>
            <div className="flex gap-3">
              <Button size="sm" variant="outline">Ver Historial Completo</Button>
              <Button size="sm" className="bg-red-600 hover:bg-red-700" onClick={() => alert('Usuario bloqueado preventivamente y notificado a RRHH.')}>
                Bloquear Usuario
              </Button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

// ─── TAB: Indicadores Epidemiológicos ─────────────────────────────────────────

function TabIndicadores() {
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900">Indicadores Epidemiológicos (Seudonimizados)</h2>
      <p className="text-gray-500 text-sm">Ningún dato en este tablero contiene identificadores directos de pacientes.</p>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Pacientes Registrados', valor: '128,440', color: 'blue' },
          { label: 'Citas Este Mes', valor: '34,219', color: 'green' },
          { label: 'Episodios Activos', valor: '8,503', color: 'purple' },
          { label: 'Tasa Inasistencia', valor: '18.2%', color: 'red' },
        ].map((item) => (
          <Card key={item.label} className="p-5">
            <p className="text-xs font-medium text-gray-500 uppercase">{item.label}</p>
            <p className={`text-3xl font-bold mt-1 text-${item.color}-600`}>{item.valor}</p>
          </Card>
        ))}
      </div>

      <Card className="p-6">
        <h3 className="font-bold text-gray-900 mb-4">Top 10 Diagnósticos CIE-10 (Mes en curso)</h3>
        <div className="space-y-2">
          {[
            { cie10: 'J06.9', descripcion: 'Infección aguda de vías respiratorias sup.', casos: 4821 },
            { cie10: 'I10.X', descripcion: 'Hipertensión esencial (primaria)', casos: 3102 },
            { cie10: 'K59.0', descripcion: 'Constipación', casos: 1893 },
            { cie10: 'E11.9', descripcion: 'Diabetes mellitus tipo 2', casos: 1540 },
            { cie10: 'J18.9', descripcion: 'Neumonía no especificada', casos: 987 },
          ].map((dx) => (
            <div key={dx.cie10} className="flex items-center gap-4">
              <span className="font-mono text-xs text-blue-700 w-16 flex-shrink-0">{dx.cie10}</span>
              <div className="flex-1">
                <p className="text-sm text-gray-700">{dx.descripcion}</p>
                <div className="h-2 bg-gray-200 rounded-full mt-1">
                  <div
                    className="h-2 bg-blue-500 rounded-full"
                    style={{ width: `${Math.min((dx.casos / 5000) * 100, 100)}%` }}
                  />
                </div>
              </div>
              <span className="text-sm font-bold text-gray-600 w-16 text-right flex-shrink-0">{dx.casos.toLocaleString()}</span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
