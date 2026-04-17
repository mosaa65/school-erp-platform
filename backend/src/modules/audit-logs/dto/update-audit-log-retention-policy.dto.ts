import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { IsInt, Max, Min, ValidateIf } from 'class-validator';

export class UpdateAuditLogRetentionPolicyDto {
  @ApiProperty({
    nullable: true,
    example: 365,
    description:
      'Retention period in days. Send null to disable automatic cleanup.',
  })
  @ValidateIf(
    (_object: UpdateAuditLogRetentionPolicyDto, value: unknown) =>
      value !== null,
  )
  @Type(() => Number)
  @IsInt()
  @Min(7)
  @Max(3650)
  retentionDays!: number | null;
}
