import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { TriggerSeedDto } from './dto/trigger-seed.dto';
import { SeedService } from './seed.service';

@ApiTags('Seed')
@Controller('seed')
export class SeedController {
  constructor(private readonly seedService: SeedService) {}

  @Post('core')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Trigger core database seed',
    description:
      'Runs the core seed (permissions, roles, admin user, lookups, settings, school profile). ' +
      'Only available in development and staging environments. ' +
      'Set the SEED_TOKEN environment variable to require a token for this endpoint.',
  })
  triggerCoreSeed(@Body() body: TriggerSeedDto) {
    return this.seedService.triggerCoreSeed(body.token);
  }
}
