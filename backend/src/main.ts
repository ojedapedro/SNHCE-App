/**
 * Punto de entrada principal del backend SNHCE.
 * IMPORTANTE: setupTelemetry() debe llamarse ANTES de importar cualquier módulo
 * de NestJS para que la instrumentación automática funcione correctamente.
 */
import { setupTelemetry } from './common/telemetry/telemetry';

// Inicializar OpenTelemetry PRIMERO (antes de cualquier import de NestJS/Express)
setupTelemetry();

import { NestFactory, Reflector } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { ClassSerializerInterceptor, ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import { ResponseTransformInterceptor } from './common/interceptors/response-transform.interceptor';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, {
    // Desactivar el logger por defecto de NestJS — usamos Winston
    bufferLogs: true,
  });

  // ===== Logger Winston =====
  const winstonLogger = app.get(WINSTON_MODULE_NEST_PROVIDER);
  app.useLogger(winstonLogger);

  const configService = app.get(ConfigService);
  const nodeEnv = configService.get<string>('NODE_ENV', 'development');
  const isProduction = nodeEnv === 'production';
  const port = configService.get<number>('PORT', 3000);

  // ===== Prefix global de la API =====
  app.setGlobalPrefix('api/v1');

  // ===== CORS =====
  const corsOriginsRaw = configService.get<string>('CORS_ORIGINS', 'http://localhost:3001');
  const corsOrigins = corsOriginsRaw.split(',').map((o) => o.trim());

  app.enableCors({
    origin: corsOrigins,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID', 'X-Correlation-ID'],
    exposedHeaders: ['X-Request-ID', 'X-RateLimit-Remaining', 'X-RateLimit-Reset'],
    credentials: true,
    maxAge: 3600, // 1 hora para preflight cache
  });

  // ===== Helmet — headers de seguridad HTTP =====
  app.use(
    helmet({
      // Política de seguridad de contenido estricta
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'"],
          styleSrc: ["'self'"],
          imgSrc: ["'self'", 'data:'],
          connectSrc: ["'self'"],
          fontSrc: ["'self'"],
          objectSrc: ["'none'"],
          mediaSrc: ["'self'"],
          frameSrc: ["'none'"],
          frameAncestors: ["'none'"],
          // Solo se relaja en desarrollo para Swagger UI
          ...(isProduction
            ? {}
            : {
                scriptSrc: ["'self'", "'unsafe-inline'"],
                styleSrc: ["'self'", "'unsafe-inline'"],
                imgSrc: ["'self'", 'data:', 'https:'],
              }),
        },
      },
      crossOriginEmbedderPolicy: isProduction,
      crossOriginOpenerPolicy: { policy: 'same-origin' },
      crossOriginResourcePolicy: { policy: 'same-origin' },
      dnsPrefetchControl: { allow: false },
      frameguard: { action: 'deny' },
      hidePoweredBy: true,
      hsts: {
        maxAge: 31_536_000, // 1 año en segundos
        includeSubDomains: true,
        preload: true,
      },
      ieNoOpen: true,
      noSniff: true,
      permittedCrossDomainPolicies: false,
      referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
      xssFilter: true,
    }),
  );

  // ===== ValidationPipe Global =====
  // whitelist: elimina propiedades no decoradas con class-validator
  // forbidNonWhitelisted: lanza error si se envían propiedades extra
  // transform: convierte automáticamente tipos (string → number, etc.)
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
      // En producción, los mensajes de error de validación son genéricos
      disableErrorMessages: false,
      stopAtFirstError: false,
    }),
  );

  // ===== Interceptores y Filtros Globales =====
  const reflector = app.get(Reflector);
  app.useGlobalFilters(new HttpExceptionFilter(winstonLogger as never, configService));
  app.useGlobalInterceptors(
    new LoggingInterceptor(),
    new ResponseTransformInterceptor(),
    new ClassSerializerInterceptor(reflector),
  );

  // ===== Swagger (solo en no-producción) =====
  if (!isProduction) {
    const swaggerConfig = new DocumentBuilder()
      .setTitle('SNHCE API')
      .setDescription(
        `
        **Sistema Nacional de Historias Clínicas Electrónicas (SNHCE)**
        
        API REST del backend del sistema nacional de salud de Venezuela.
        
        ### Autenticación
        Todos los endpoints (excepto /health) requieren un token JWT emitido por Keycloak.
        Incluya el header: \`Authorization: Bearer <token>\`
        
        ### Versionado
        Esta documentación corresponde a la **versión 1** de la API (/api/v1).
        
        ### Auditoría
        Todas las operaciones sobre datos clínicos son registradas en la tabla
        de auditoría (append-only con hash encadenado SHA-256).
      `,
      )
      .setVersion('1.0.0')
      .setContact('MPPS - STIC', 'https://www.mpps.gob.ve', 'stic@mpps.gob.ve')
      .setLicense('Uso Interno Gubernamental', 'https://www.mpps.gob.ve/licencia')
      .addBearerAuth(
        {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Token JWT emitido por Keycloak',
        },
        'keycloak-jwt',
      )
      .addServer(`http://localhost:${port}`, 'Desarrollo local')
      .addTag('Health', 'Endpoints de salud del sistema')
      .addTag('MPI', 'Índice Maestro de Pacientes')
      .addTag('Establecimientos', 'Gestión de establecimientos de salud')
      .addTag('Citas', 'Agendamiento de citas médicas')
      .addTag('Episodios', 'Episodios clínicos y atención médica')
      .addTag('Prescripciones', 'Prescripciones médicas y recetas')
      .addTag('Reposos', 'Reposos médicos')
      .addTag('Ordenes', 'Órdenes de laboratorio e imagen')
      .addTag('Referencias', 'Referencias y contrarreferencias')
      .addTag('Auditoria', 'Auditoría de accesos al sistema')
      .build();

    const document = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup('api/docs', app, document, {
      swaggerOptions: {
        persistAuthorization: true,
        docExpansion: 'none',
        filter: true,
        showRequestDuration: true,
        syntaxHighlight: { theme: 'arta' },
      },
      customSiteTitle: 'SNHCE API Docs',
    });

    winstonLogger.log(`Swagger disponible en: http://localhost:${port}/api/docs`, 'Bootstrap');
  }

  // ===== Graceful Shutdown =====
  // NestJS escucha SIGTERM y SIGINT para cerrar conexiones limpiamente
  app.enableShutdownHooks();

  // ===== Iniciar servidor =====
  await app.listen(port);
  winstonLogger.log(
    `SNHCE Backend iniciado en: http://localhost:${port}/api/v1 | Entorno: ${nodeEnv}`,
    'Bootstrap',
  );
}

// Capturar rechazos de promesas no manejados para evitar crashes silenciosos
process.on('unhandledRejection', (reason: unknown) => {
  // En producción, este error debería alertar al equipo de operaciones
  // eslint-disable-next-line no-console
  console.error('[SNHCE] Promesa rechazada no manejada:', reason);
  process.exit(1);
});

process.on('uncaughtException', (error: Error) => {
  // eslint-disable-next-line no-console
  console.error('[SNHCE] Excepción no capturada:', error);
  process.exit(1);
});

void bootstrap();
