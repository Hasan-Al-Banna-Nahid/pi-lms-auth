import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './modules/auth/auth.module';
import { PrismaModule } from 'lib/prisma.module';
import { BullModule } from '@nestjs/bullmq';

@Module({
  imports: [
    AuthModule,
    PrismaModule,
    BullModule.forRoot({
      connection: {
        host: 'pi-lms-auth-wydufe.serverless.use1.cache.amazonaws.com',
        port: 6379,
      },
    }),
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
