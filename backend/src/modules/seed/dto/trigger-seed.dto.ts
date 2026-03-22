import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class TriggerSeedDto {
  @ApiPropertyOptional({
    description: 'Optional seed token for additional security (matches SEED_TOKEN env var)',
    example: 'my-secret-token',
  })
  @IsOptional()
  @IsString()
  token?: string;
}
