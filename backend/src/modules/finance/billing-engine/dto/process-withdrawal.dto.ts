import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsOptional, IsString, MaxLength } from 'class-validator';

export class ProcessWithdrawalDto {
  @ApiProperty({ example: 'cmabc123enroll', description: 'Enrollment ID' })
  @IsString()
  @MaxLength(191)
  enrollmentId!: string;

  @ApiProperty({ example: '2026-05-10', description: 'Withdrawal date' })
  @IsDateString()
  withdrawalDate!: string;

  @ApiPropertyOptional({ example: 'cmabc123term', description: 'Academic term ID (optional)' })
  @IsOptional()
  @IsString()
  @MaxLength(191)
  academicTermId?: string;

  @ApiPropertyOptional({ example: 'انسحاب بسبب الانتقال', description: 'Reason/notes' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}
