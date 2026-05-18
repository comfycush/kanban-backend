import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { AppService } from './app.service';
import { ApiEnvelope } from './common/swagger/api-envelope.swagger';

@ApiTags('Health')
@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get('health')
  @ApiOperation({ summary: 'Health check' })
  @ApiEnvelope(null, { dataString: true })
  getHello(): string {
    return this.appService.getHello();
  }
}
