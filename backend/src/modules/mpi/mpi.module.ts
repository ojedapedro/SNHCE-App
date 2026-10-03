import { Module } from '@nestjs/common';
import { MpiService } from './mpi.service';
import { MpiController } from './mpi.controller';
import { AuditModule } from '../audit/audit.module';
import { SaimeSimulatorAdapter } from './adapters/saime.adapter';
import { LivenessSimulatorAdapter } from './adapters/liveness.adapter';

@Module({
  imports: [AuditModule],
  controllers: [MpiController],
  providers: [
    MpiService,
    SaimeSimulatorAdapter,
    LivenessSimulatorAdapter,
  ],
  exports: [MpiService],
})
export class MpiModule {}
