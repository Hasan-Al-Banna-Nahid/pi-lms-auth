import {
  Injectable,
  OnModuleInit,
  OnModuleDestroy,
  Global,
} from '@nestjs/common';
import { PrismaClient } from 'prisma/generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import 'dotenv/config';

@Global()
@Injectable()
export class PrismaService implements OnModuleInit, OnModuleDestroy {
  public prisma: PrismaClient;

  constructor() {
    const connectionString = process.env.DATABASE_URL;

    const pool = new Pool({
      connectionString,
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
      keepAlive: true,
    });

    pool.on('error', (err) => {
      console.error('Unexpected error on idle Prisma/PG client', err);
    });

    const adapter = new PrismaPg(pool);

    this.prisma = new PrismaClient({
      adapter,
      log: ['error', 'warn'],
    });
  }

  async onModuleInit() {
    try {
      await this.prisma.$connect();
      console.log('✅ Database connected successfully');
    } catch (error) {
      console.error('❌ Database connection failed:', error);
    }
  }

  async onModuleDestroy() {
    await this.prisma.$disconnect();
  }
}
