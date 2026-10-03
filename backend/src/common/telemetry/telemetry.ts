import { PrometheusExporter } from '@opentelemetry/exporter-prometheus';
import { NodeSDK } from '@opentelemetry/sdk-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { Resource } from '@opentelemetry/resources';
import { SEMRESATTRS_SERVICE_NAME, SEMRESATTRS_SERVICE_VERSION } from '@opentelemetry/semantic-conventions';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { version } = require('../../../package.json') as { version: string };

/**
 * Configura e inicia el SDK de OpenTelemetry.
 * IMPORTANTE: debe llamarse ANTES del bootstrap de NestJS para que
 * la instrumentación automática intercepte los módulos correctamente.
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
    resource: new Resource({
      [SEMRESATTRS_SERVICE_NAME]: 'snhce-backend',
      [SEMRESATTRS_SERVICE_VERSION]: version,
      'deployment.environment': process.env['NODE_ENV'] ?? 'development',
      'service.namespace': 'snhce',
    }),
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
