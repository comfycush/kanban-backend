import { Module, forwardRef } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { BoardsModule } from '../boards/boards.module';
import { MessagesModule } from '../messages/messages.module';
import { BoardGateway } from './board.gateway';
import { ChatGateway } from './chat.gateway';

@Module({
  imports: [
    BoardsModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.getOrThrow('JWT_SECRET'),
        signOptions: {
          expiresIn: config.get('JWT_EXPIRES_IN') ?? '7d',
        },
      }),
    }),
    forwardRef(() => MessagesModule),
  ],
  providers: [BoardGateway, ChatGateway],
  exports: [BoardGateway, ChatGateway],
})
export class RealtimeModule {}
