import { InjectQueue } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { Queue } from 'bullmq';

@Injectable()
export class EmailOutbox {
  private readonly log = new Logger(EmailOutbox.name);

  constructor(@InjectQueue('email') private readonly emailQueue: Queue) {}

  enqueueEmail(payload: Record<string, unknown>) {
    return this.emailQueue.add('outbound', payload, {
      removeOnComplete: true,
      attempts: 2,
    });
  }
}
