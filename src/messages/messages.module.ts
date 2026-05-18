import { Module, forwardRef } from '@nestjs/common';
import { MessagesService } from './messages.service';
import { MessagesController } from './messages.controller';
import { ActivityLogsModule } from '../activity-logs/activity-logs.module';
import { RealtimeModule } from '../realtime/realtime.module';

@Module({
  imports: [ActivityLogsModule, forwardRef(() => RealtimeModule)],
  controllers: [MessagesController],
  providers: [MessagesService],
  exports: [MessagesService],
})
export class MessagesModule {}
