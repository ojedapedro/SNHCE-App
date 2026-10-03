import { Module } from '@nestjs/common';
import { ClinicalService } from './clinical.service';
import { ClinicalController } from './clinical.controller';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [AuditModule],
  controllers: [ClinicalController],
  providers: [ClinicalService],
})
export class ClinicalModule {}
