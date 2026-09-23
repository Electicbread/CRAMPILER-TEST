package com.crampiler;

import com.crampiler.model.Assignment;
import com.crampiler.model.Course;
import com.crampiler.model.Subtask;
import com.crampiler.service.VelocityScoringService;

import org.junit.jupiter.api.Test;

import java.time.Duration;
import java.time.Instant;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

class VelocityScoringServiceTest {

    private final VelocityScoringService engine = new VelocityScoringService();

    private Course courseWithWeight(String category, double fraction) {
        Course course = new Course();
        course.setCategoryWeights(Map.of(category, fraction));
        return course;
    }

    private Assignment assignmentDueIn(double hours, String category, int subtaskCount, int doneCount) {
        Assignment a = new Assignment("id", "TEST101", "Test Task",
                Instant.now().plus(Duration.ofMinutes((long) (hours * 60))), category);
        for (int i = 0; i < subtaskCount; i++) {
            Subtask s = new Subtask();
            s.setCompleted(i < doneCount);
            a.getSubtasks().add(s);
        }
        return a;
    }

    @Test
    void sundayNightDilemma_examOutranksQuiz_beforeAnyProgress() {
        Assignment quiz = assignmentDueIn(12, "Quiz", 1, 0);
        engine.scoreAndAttach(quiz, courseWithWeight("Quiz", 0.05));

        Assignment exam = assignmentDueIn(60, "Final", 4, 0);
        engine.scoreAndAttach(exam, courseWithWeight("Final", 0.40));

        assertEquals(0.833, quiz.getVelocityScore(), 0.01);
        assertEquals(1.333, exam.getVelocityScore(), 0.01);
        assertTrue(exam.getVelocityScore() > quiz.getVelocityScore());
    }

    @Test
    void exam_scoreDropsAsSubtasksComplete_untilQuizRetakesTheLead() {
        Course examCourse = courseWithWeight("Final", 0.40);

        Assignment exam75 = assignmentDueIn(60, "Final", 4, 3);
        engine.scoreAndAttach(exam75, examCourse);
        assertEquals(0.833, exam75.getVelocityScore(), 0.01);

        Assignment examDone = assignmentDueIn(60, "Final", 4, 4);
        engine.scoreAndAttach(examDone, examCourse);
        assertEquals(0.667, examDone.getVelocityScore(), 0.01);

        Assignment quiz = assignmentDueIn(12, "Quiz", 1, 0);
        engine.scoreAndAttach(quiz, courseWithWeight("Quiz", 0.05));
        assertTrue(quiz.getVelocityScore() > examDone.getVelocityScore());
    }

    @Test
    void overdueTask_getsCriticalOverrideScore() {
        Assignment overdue = assignmentDueIn(-5, "Homework", 0, 0);
        engine.scoreAndAttach(overdue, courseWithWeight("Homework", 0.10));

        assertTrue(overdue.isOverdue());
        assertEquals(999.0, overdue.getVelocityScore(), 0.001);
    }

    @Test
    void overdueTaskWithLatePenalty_decaysInsteadOfOverriding() {
        Assignment overdue = assignmentDueIn(-20, "Homework", 0, 0);
        overdue.setLatePenaltyEnabled(true);
        engine.scoreAndAttach(overdue, courseWithWeight("Homework", 0.20));

        assertTrue(overdue.isOverdue());
        assertEquals(72.0, overdue.getVelocityScore(), 0.5);
        assertTrue(overdue.getVelocityScore() < 999.0);
    }

    @Test
    void taskWithNoSubtasks_treatedAsFullyIncomplete() {
        Assignment noSubtasks = assignmentDueIn(24, "Homework", 0, 0);
        engine.scoreAndAttach(noSubtasks, courseWithWeight("Homework", 0.10));
        assertEquals(0.833, noSubtasks.getVelocityScore(), 0.01);
    }

    @Test
    void completedTask_isExcludedFromRanking() {
        Assignment done = assignmentDueIn(1, "Final", 4, 4);
        done.setCompleted(true);
        engine.scoreAndAttach(done, courseWithWeight("Final", 0.40));

        assertEquals(0.0, done.getVelocityScore(), 0.001);
        assertTrue(!done.isOverdue());
    }

    @Test
    void unmappedCategory_fallsBackToTenPercentWeight() {
        Assignment task = assignmentDueIn(24, "SomeCategoryNotInSyllabus", 0, 0);
        Course course = new Course();
        course.setCategoryWeights(Map.of("Final", 0.40));
        engine.scoreAndAttach(task, course);
        assertEquals(0.833, task.getVelocityScore(), 0.01);
    }
}