import { PrometheusExporter } from '@opentelemetry/exporter-prometheus';
import { NodeSDK } from '@opentelemetry/sdk-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';



/**
 * Configura e inicia el SDK de OpenTelemetry.
 * IMPORTANTE: debe llamarse ANTES del bootstrap de NestJS para que
 * la instrumentación automática intercepte los módulos correctamente.
 *
 * NOTA: Las versiones recientes de @opentelemetry/resources exportan
 * `resourceFromAttributes` en lugar del constructor `new Resource({})`.
 * Se usa el SDK sin resource explícito para máxima compatibilidad de versiones;
 * el SDK detecta automáticamente el entorno (process.env).
 */
export function setupTelemetry(): void {
  // Exportador de métricas en formato Prometheus (scrapeado por el agente de métricas)
  const prometheusExporter = new PrometheusExporter(
    {
      port: 9464, // Puerto estándar para Prometheus
      endpoint: '/metrics',
    },
    () => {
      // Métricas disponibles en http://localhost:9464/metrics
    },
  );

  const sdk = new NodeSDK({
    metricReader: prometheusExporter,
    instrumentations: [
      getNodeAutoInstrumentations({
        // Instrumentación automática de módulos Node.js comunes:
        // HTTP, Express, NestJS, Prisma, Redis, etc.
        '@opentelemetry/instrumentation-fs': {
          enabled: false, // Demasiado verboso, desactivado por defecto
        },
        '@opentelemetry/instrumentation-dns': {
          enabled: false,
        },
      }),
    ],
  });

  // Iniciar el SDK antes de que NestJS cargue cualquier módulo
  sdk.start();

  // Manejo limpio del apagado para enviar métricas pendientes
  process.on('SIGTERM', () => {
    sdk
      .shutdown()
      .then(() => {
        // Telemetría apagada limpiamente
      })
      .catch(() => {
        // Error al apagar telemetría — continuar con el apagado normal
      });
  });
}
