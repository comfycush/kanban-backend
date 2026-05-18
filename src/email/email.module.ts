import { Global, Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ConfigService } from '@nestjs/config';
import { EmailOutbox } from './email-outbox.service';
import { EmailProcessor } from './email.processor';

@Global()
@Module({
  imports: [
    BullModule.forRootAsync({
      useFactory: (config: ConfigService) => {
        const url = config.get<string>('REDIS_URL', 'redis://127.0.0.1:6379');
        return {
          connection: { url } as { url: string },
        };
      },
      inject: [ConfigService],
    }),
    BullModule.registerQueue({ name: 'email' }),
  ],
  providers: [EmailOutbox, EmailProcessor],
  exports: [EmailOutbox],
})
export class EmailModule {}
