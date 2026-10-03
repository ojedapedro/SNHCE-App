import { Module } from '@nestjs/common';
import { FhirController } from './fhir.controller';
import { FhirMapperService } from './fhir-mapper.service';

@Module({
  controllers: [FhirController],
  providers: [FhirMapperService],
  exports: [FhirMapperService],
})
export class FhirModule {}
