import {
  Injectable,
  Logger,
} from '@nestjs/common';
import { AuditStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';

export type GradingNotificationType =
  | 'MONTHLY_GRADES_INCOMPLETE'
  | 'FINAL_EXAM_SCORES_MISSING'
  | 'SEMESTER_GRADES_INCOMPLETE'
  | 'ANNUAL_GRADES_INCOMPLETE';

export interface GradingNotificationPayload {
  type: GradingNotificationType;
  sectionId: string;
  subjectId?: string;
  academicTermId?: string;
  academicYearId: string;
  gradeLevelId: string;
  affectedStudentsCount: number;
  message: string;
  details?: Record<string, any>;
}

@Injectable()
export class GradingNotificationsService {
  private readonly logger = new Logger(GradingNotificationsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogsService: AuditLogsService,
  ) {}

  async createNotification(
    payload: GradingNotificationPayload,
    actorUserId: string,
  ) {
    try {
      // Log the notification for audit purposes
      await this.auditLogsService.record({
        actorUserId,
        action: 'GRADING_NOTIFICATION_CREATED',
        resource: 'grading-notifications',
        status: AuditStatus.SUCCESS,
        details: {
          type: payload.type,
          sectionId: payload.sectionId,
          subjectId: payload.subjectId,
          academicTermId: payload.academicTermId,
          academicYearId: payload.academicYearId,
          gradeLevelId: payload.gradeLevelId,
          affectedStudentsCount: payload.affectedStudentsCount,
          message: payload.message,
          details: payload.details,
        },
      });

      // Log to console for immediate visibility
      this.logger.warn(`[GRADING NOTIFICATION] ${payload.type}: ${payload.message}`, {
        sectionId: payload.sectionId,
        subjectId: payload.subjectId,
        academicTermId: payload.academicTermId,
        academicYearId: payload.academicYearId,
        affectedStudentsCount: payload.affectedStudentsCount,
        details: payload.details,
      });

      // TODO: In future, this could send emails, push notifications, or store in database
      // For now, we just log it

    } catch (error) {
      this.logger.error('Failed to create grading notification', error);
    }
  }

  async notifyMonthlyGradesIncomplete(
    sectionId: string,
    subjectId: string,
    academicTermId: string,
    academicYearId: string,
    gradeLevelId: string,
    affectedStudentsCount: number,
    actorUserId: string,
  ) {
    await this.createNotification(
      {
        type: 'MONTHLY_GRADES_INCOMPLETE',
        sectionId,
        subjectId,
        academicTermId,
        academicYearId,
        gradeLevelId,
        affectedStudentsCount,
        message: `لا يمكن حساب الدرجات الفصلية: ${affectedStudentsCount} طالب لم يكملوا المحصلات الشهرية لجميع أشهر الفصل`,
        details: {
          subjectId,
          academicTermId,
        },
      },
      actorUserId,
    );
  }

  async notifyFinalExamScoresMissing(
    sectionId: string,
    subjectId: string,
    academicTermId: string,
    academicYearId: string,
    gradeLevelId: string,
    affectedStudentsCount: number,
    actorUserId: string,
  ) {
    await this.createNotification(
      {
        type: 'FINAL_EXAM_SCORES_MISSING',
        sectionId,
        subjectId,
        academicTermId,
        academicYearId,
        gradeLevelId,
        affectedStudentsCount,
        message: `لا يمكن حساب الدرجات الفصلية: ${affectedStudentsCount} طالب لم يتم تعبئة درجة الاختبار النهائي لهم`,
        details: {
          subjectId,
          academicTermId,
        },
      },
      actorUserId,
    );
  }

  async notifySemesterGradesIncomplete(
    sectionId: string,
    academicYearId: string,
    gradeLevelId: string,
    affectedStudentsCount: number,
    actorUserId: string,
  ) {
    await this.createNotification(
      {
        type: 'SEMESTER_GRADES_INCOMPLETE',
        sectionId,
        academicYearId,
        gradeLevelId,
        affectedStudentsCount,
        message: `لا يمكن حساب النتائج السنوية: ${affectedStudentsCount} طالب لم يكملوا الدرجات الفصلية لجميع فصول السنة`,
        details: {},
      },
      actorUserId,
    );
  }

  async notifyAnnualGradesIncomplete(
    sectionId: string,
    academicYearId: string,
    gradeLevelId: string,
    affectedStudentsCount: number,
    actorUserId: string,
  ) {
    await this.createNotification(
      {
        type: 'ANNUAL_GRADES_INCOMPLETE',
        sectionId,
        academicYearId,
        gradeLevelId,
        affectedStudentsCount,
        message: `لا يمكن حساب الدرجات السنوية: ${affectedStudentsCount} طالب لم يكملوا الدرجات الفصلية المطلوبة`,
        details: {},
      },
      actorUserId,
    );
  }
}