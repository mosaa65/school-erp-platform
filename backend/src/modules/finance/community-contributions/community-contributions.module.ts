import { Module } from '@nestjs/common';
import { AuditLogsModule } from '../../audit-logs/audit-logs.module';
import { CommunityContributionsController } from './community-contributions.controller';
import { CommunityContributionsService } from './community-contributions.service';

@Module({
  imports: [AuditLogsModule],
  controllers: [CommunityContributionsController],
  providers: [CommunityContributionsService],
})
export class CommunityContributionsModule {}
