import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { WinstonModule } from 'nest-winston';
import * as winston from 'winston';

/**
 * Módulo de logger global basado en Winston.
 * Detecta automáticamente el entorno para aplicar el formato adecuado:
 * - Producción: JSON estructurado (compatible con ELK/Loki)
 * - Desarrollo: colorizado y legible para consola
 */
@Global()
@Module({
  imports: [
    WinstonModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const nodeEnv = configService.get<string>('NODE_ENV', 'development');
        const isProduction = nodeEnv === 'production';
        const serviceName = configService.get<string>('SERVICE_NAME', 'snhce-backend');

        /**
         * Formato compartido: agrega campos de contexto comunes.
         * correlation-id se agrega desde AsyncLocalStorage en el interceptor.
         */
        const sharedFormat = winston.format.combine(
          winston.format.timestamp({ format: 'YYYY-MM-DDTHH:mm:ss.SSSZ' }),
          winston.format.errors({ stack: true }),
          // Agregar nombre del servicio a todos los logs
          winston.format((info) => {
            info['service'] = serviceName;
            return info;
          })(),
        );

        const transports: winston.transport[] = [
          // Transporte de consola: siempre activo
          new winston.transports.Console({
            format: isProduction
              ? // Producción: JSON limpio para ingestión por Fluentd/Logstash
                winston.format.combine(sharedFormat, winston.format.json())
              : // Desarrollo: formato colorizado legible
                winston.format.combine(
                  sharedFormat,
                  winston.format.colorize({ all: true }),
                  winston.format.printf(({ timestamp, level, message, service, correlationId, context, stack }) => {
                    const cid = correlationId ? ` [${String(correlationId)}]` : '';
                    const ctx = context ? ` [${String(context)}]` : '';
                    const err = stack ? `\n${String(stack)}` : '';
                    return `${String(timestamp)} ${String(level)}${cid}${ctx} [${String(service)}]: ${String(message)}${err}`;
                  }),
                ),
          }),

          // Transporte a archivo: SOLO errores, con rotación diaria en producción
          new winston.transports.File({
            filename: 'logs/error.log',
            level: 'error',
            maxsize: 50 * 1024 * 1024, // 50 MB
            maxFiles: 30,              // Retención de 30 archivos
            tailable: true,
            format: winston.format.combine(sharedFormat, winston.format.json()),
          }),

          // Transporte a archivo: todos los niveles (no en producción para reducir I/O de disco)
          ...(isProduction
            ? []
            : [
                new winston.transports.File({
                  filename: 'logs/combined.log',
                  maxsize: 20 * 1024 * 1024, // 20 MB
                  maxFiles: 5,
                  format: winston.format.combine(sharedFormat, winston.format.json()),
                }),
              ]),
        ];

        return {
          transports,
          // No propagar logs al logger por defecto de Node.js
          handleExceptions: true,
          handleRejections: true,
        };
      },
    }),
  ],
  exports: [WinstonModule],
})
export class LoggerModule {}
