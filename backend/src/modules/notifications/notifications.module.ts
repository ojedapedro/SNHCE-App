import { Module } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { SmsSimulatorAdapter } from './adapters/sms.adapter';
import { EmailSimulatorAdapter } from './adapters/email.adapter';

@Module({
  providers: [NotificationsService, SmsSimulatorAdapter, EmailSimulatorAdapter],
  exports: [NotificationsService],
})
export class NotificationsModule {}
