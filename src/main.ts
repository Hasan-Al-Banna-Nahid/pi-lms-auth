import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ExpressAdapter } from '@nestjs/platform-express';
import express from 'express';

const server = express();

export const createVercelServer = async () => {
  const app = await NestFactory.create(AppModule, new ExpressAdapter(server));
  app.enableCors();
  await app.init();
};

// Vercel এর জন্য এন্ট্রি পয়েন্ট
export default async (req: any, res: any) => {
  await createVercelServer();
  server(req, res);
};
