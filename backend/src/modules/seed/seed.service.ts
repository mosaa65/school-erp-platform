import {
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { runCoreSeed } from '../../../prisma/seeds/core/index';

@Injectable()
export class SeedService {
  private readonly logger = new Logger(SeedService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  async triggerCoreSeed(token?: string): Promise<{
    success: boolean;
    message: string;
    adminCredentials: { email: string; password: string };
  }> {
    const nodeEnv = this.config.get<string>('NODE_ENV') ?? 'production';

    if (!['development', 'staging'].includes(nodeEnv)) {
      throw new ForbiddenException(
        `Seed endpoint is only available in development or staging environments (current: ${nodeEnv})`,
      );
    }

    const seedToken = this.config.get<string>('SEED_TOKEN');

    if (seedToken) {
      if (!token || token !== seedToken) {
        throw new ForbiddenException(
          'Invalid or missing seed token. Provide the correct token in the request body.',
        );
      }
    }

    try {
      this.logger.log('Core seed triggered via HTTP endpoint');

      const result = await runCoreSeed(this.prisma);

      this.logger.log(
        `Core seed completed successfully. Admin email: ${result.adminCredentials.email}`,
      );

      return {
        success: true,
        message: 'Core seed completed successfully',
        adminCredentials: result.adminCredentials,
      };
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Unknown error during seed';

      this.logger.error(`Core seed failed: ${message}`, error instanceof Error ? error.stack : undefined);

      throw new InternalServerErrorException(
        `Core seed failed: ${message}`,
      );
    }
  }
}
