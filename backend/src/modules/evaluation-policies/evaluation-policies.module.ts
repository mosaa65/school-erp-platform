import { Module } from '@nestjs/common';
import { GradingOutcomeRulesModule } from './grading-outcome-rules/grading-outcome-rules.module';
import { GradingPoliciesModule } from './grading-policies/grading-policies.module';
import { GradingPolicyComponentsModule } from './grading-policy-components/grading-policy-components.module';

@Module({
  imports: [
    GradingPoliciesModule,
    GradingPolicyComponentsModule,
    GradingOutcomeRulesModule,
  ],
  exports: [
    GradingPoliciesModule,
    GradingPolicyComponentsModule,
    GradingOutcomeRulesModule,
  ],
})
export class EvaluationPoliciesModule {}
