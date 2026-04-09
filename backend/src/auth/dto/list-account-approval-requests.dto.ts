import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { IsEnum, IsOptional, IsString, MaxLength, Min } from 'class-validator';
import { AccountApprovalPurpose } from '@prisma/client';

export class ListAccountApprovalRequestsDto {
  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @Type(() => Number)
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ example: 20 })
  @IsOptional()
  @Type(() => Number)
  @Min(1)
  limit?: number;

  @ApiPropertyOptional({
    enum: AccountApprovalPurpose,
    example: AccountApprovalPurpose.FIRST_PASSWORD_SETUP,
  })
  @IsOptional()
  @IsEnum(AccountApprovalPurpose)
  purpose?: AccountApprovalPurpose;

  @ApiPropertyOptional({ example: 'Ahmad' })
  @IsOptional()
  @Transform(({ value }: { value?: string }) => value?.trim() || undefined)
  @IsString()
  @MaxLength(191)
  search?: string;
}
