import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { DatabaseModule } from '@common/database/database.module';
import { LoggerModule } from '@common/logger/logger.module';
import { AuthModule } from '@common/auth/auth.module';
import { HealthModule } from '@modules/health/health.module';
import { AuditModule } from '@modules/audit/audit.module';
import { MpiModule } from '@modules/mpi/mpi.module';
import { ClinicalModule } from '@modules/clinical/clinical.module';
import { CitasModule } from '@modules/appointments/citas.module';
import { AdministrationModule } from '@modules/administration/admin.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
      cache: true,
      expandVariables: true,
    }),
    ThrottlerModule.forRoot([
      { name: 'default', ttl: 60_000, limit: 100 },
      { name: 'auth',    ttl: 60_000, limit: 10  },
      { name: 'citas',   ttl: 60_000, limit: 20  },
    ]),
    LoggerModule,
    DatabaseModule,
    AuthModule,
    HealthModule,
    AuditModule,
    MpiModule,
    ClinicalModule,
    CitasModule,
    AdministrationModule,
  ],
})
export class AppModule {}
