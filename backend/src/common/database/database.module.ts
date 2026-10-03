import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';

/**
 * Módulo de base de datos (Prisma + PostgreSQL).
 * Se declara como @Global para que PrismaService sea inyectable
 * en cualquier módulo sin necesidad de importar DatabaseModule explícitamente.
 */
@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class DatabaseModule {}
