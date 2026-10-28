package health_assistant.module.workout.repository;

import health_assistant.module.workout.entity.WorkoutSession;
import health_assistant.module.billing.entity.BillingPlan;
import org.junit.jupiter.api.Test;
import org.springframework.data.repository.query.parser.PartTree;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;

class WorkoutSessionRepositoryQueryTest {
    @Test
    void activeSlotLookupUsesARealWorkoutSessionProperty() {
        assertDoesNotThrow(() -> new PartTree(
                "findFirstByPlanSlotIdAndStatusInOrderByStartedAtDesc", WorkoutSession.class));
    }

    @Test
    void billingPlanLookupUsesThePlanCodePrimaryKey() {
        assertDoesNotThrow(() -> new PartTree("findByCodeAndEnabledTrue", BillingPlan.class));
    }
}
