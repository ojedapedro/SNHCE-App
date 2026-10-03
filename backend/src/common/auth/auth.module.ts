import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { JwtAuthGuard } from './jwt-auth.guard';
import { RelacionAsistencialGuard } from './relacion-asistencial.guard';

/**
 * Módulo de autenticación y autorización.
 * Registra JwtAuthGuard como guard global (aplica a todos los endpoints
 * salvo los marcados con @Public()).
 */
@Module({
  providers: [
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    RelacionAsistencialGuard,
  ],
  exports: [RelacionAsistencialGuard],
})
export class AuthModule {}
