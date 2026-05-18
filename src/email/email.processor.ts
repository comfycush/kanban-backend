import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { Job } from 'bullmq';

@Processor('email')
@Injectable()
export class EmailProcessor extends WorkerHost {
  private readonly log = new Logger(EmailProcessor.name);

  process(job: Job) {
    this.log.log(
      `Email job received (replace with SMTP/SES): ${JSON.stringify(job.data)}`,
    );
    return Promise.resolve();
  }
}
