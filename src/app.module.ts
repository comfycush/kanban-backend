import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { PrismaModule } from './prisma/prisma.module';
import { CommonModule } from './common/common.module';
import { MembershipsModule } from './memberships/memberships.module';
import { OrgsModule } from './orgs/orgs.module';
import { BoardsModule } from './boards/boards.module';
import { ColumnsModule } from './columns/columns.module';
import { CardsModule } from './cards/cards.module';
import { ActivityLogsModule } from './activity-logs/activity-logs.module';
import { RealtimeModule } from './realtime/realtime.module';
import { MessagesModule } from './messages/messages.module';
import { StorageModule } from './storage/storage.module';
import { NotificationsModule } from './notifications/notifications.module';
import { EmailModule } from './email/email.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    CommonModule,
    AuthModule,
    EmailModule,
    NotificationsModule,
    MembershipsModule,
    OrgsModule,
    BoardsModule,
    ColumnsModule,
    CardsModule,
    ActivityLogsModule,
    RealtimeModule,
    MessagesModule,
    StorageModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
