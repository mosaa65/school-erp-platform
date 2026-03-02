import { Module } from '@nestjs/common';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';
import { StudentEnrollmentsModule } from '../student-enrollments/student-enrollments.module';
import { SubjectsModule } from '../subjects/subjects.module';
import { StudentBooksController } from './student-books.controller';
import { StudentBooksService } from './student-books.service';

@Module({
  imports: [AuditLogsModule, StudentEnrollmentsModule, SubjectsModule],
  controllers: [StudentBooksController],
  providers: [StudentBooksService],
  exports: [StudentBooksService],
})
export class StudentBooksModule {}
