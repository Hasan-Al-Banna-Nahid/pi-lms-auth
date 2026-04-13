// src/main.ts
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ExpressAdapter } from '@nestjs/platform-express';
import express from 'express';

const server = express();

export const createServer = async () => {
  const app = await NestFactory.create(AppModule, new ExpressAdapter(server));
  app.enableCors();
  await app.init();
  app.listen(process.env.PORT || 3000);
  return server;
};

// Vercel expects a default export for the handler
export default async (req: any, res: any) => {
  await createServer();
  server(req, res);
};
