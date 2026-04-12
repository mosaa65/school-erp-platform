import { INestApplication, Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

const PRISMA_CONNECT_MAX_RETRIES = 8;
const PRISMA_CONNECT_RETRY_DELAY_MS = 2000;

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  async onModuleInit(): Promise<void> {
    let lastError: unknown;

    for (let attempt = 1; attempt <= PRISMA_CONNECT_MAX_RETRIES; attempt += 1) {
      try {
        await this.$connect();
        return;
      } catch (error) {
        lastError = error;
        if (attempt >= PRISMA_CONNECT_MAX_RETRIES) {
          throw error;
        }

        await new Promise((resolve) => {
          setTimeout(resolve, PRISMA_CONNECT_RETRY_DELAY_MS);
        });
      }
    }

    throw lastError;
  }

  enableShutdownHooks(app: INestApplication): void {
    process.on('beforeExit', () => {
      void app.close();
    });
  }
}
