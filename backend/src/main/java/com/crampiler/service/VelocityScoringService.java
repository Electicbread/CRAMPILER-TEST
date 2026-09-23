package com.crampiler.service;

import com.crampiler.model.Assignment;
import com.crampiler.model.Course;
import com.crampiler.model.Subtask;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.time.Instant;

/**
 * The CramPiler Velocity Priority Engine.
 *
 *   V = W x (1 + D) / H
 *
 *   W (Weight)  - the course's syllabus percentage for this assignment's
 *                  category, e.g. 40 for a 40%-of-grade exam. Stored on
 *                  Course as a 0-1 fraction (for the slider UI) and
 *                  multiplied by 100 here to match the documented formula.
 *   D (Deficit) - fraction of incomplete subtasks: 0.0 = fully done,
 *                  1.0 = nothing checked off yet. A task with no subtasks
 *                  at all is treated as D = 1.0 (not started).
 *   H (Hours)   - hours remaining until the deadline.
 *
 * Overdue handling (H <= 0):
 *   - Default: Critical Override. The task is pinned to a flat max-priority
 *     score (999) and flagged `overdue` so the UI can lock it at the top in
 *     red, regardless of weight or deficit.
 *   - If the task has `latePenaltyEnabled`, the flat override is skipped.
 *     Instead the effective weight decays 10% per full day late
 *     (Dynamic Late Penalty), and H is floored at 0.5h so the formula
 *     still produces a shrinking-but-finite score instead of dividing by
 *     zero or a negative number.
 */
@Service
public class VelocityScoringService {

    private static final double CRITICAL_OVERRIDE_SCORE = 999.0;
    private static final double LATE_PENALTY_PER_DAY = 0.10;

    public void scoreAndAttach(Assignment assignment, Course course) {
        if (assignment.isCompleted()) {
            // Completed tasks are archived, not ranked — see TaskController#getActiveTasks.
            assignment.setVelocityScore(0);
            assignment.setOverdue(false);
            return;
        }

        double hoursLeft = hoursLeft(assignment.getDueDate());
        boolean isOverdue = hoursLeft <= 0;
        assignment.setOverdue(isOverdue);

        if (isOverdue && !assignment.isLatePenaltyEnabled()) {
            assignment.setVelocityScore(CRITICAL_OVERRIDE_SCORE);
            return;
        }

        double weight = weightPercent(assignment, course, isOverdue);
        double deficit = deficit(assignment);
        double h = Math.max(hoursLeft, 0.5); // floor so we never divide by ~0

        double score = (weight * (1 + deficit)) / h;
        assignment.setVelocityScore(score);
    }

    /** W: the course's syllabus weight for this category, as a 0-100 percentage. */
    private double weightPercent(Assignment assignment, Course course, boolean isOverdue) {
        double baseFraction = course.getCategoryWeights().getOrDefault(assignment.getCategory(), 0.10);
        double basePercent = baseFraction * 100;

        if (!isOverdue || !assignment.isLatePenaltyEnabled() || assignment.getDueDate() == null) {
            return basePercent;
        }

        long daysLate = Duration.between(assignment.getDueDate(), Instant.now()).toDays() + 1; // any part of a day counts
        double decayed = basePercent * Math.max(0, 1 - LATE_PENALTY_PER_DAY * daysLate);
        return decayed;
    }

    /** D: fraction of subtasks still incomplete. No subtasks yet = fully undone (1.0). */
    private double deficit(Assignment assignment) {
        if (assignment.getSubtasks() == null || assignment.getSubtasks().isEmpty()) {
            return 1.0;
        }
        long total = assignment.getSubtasks().size();
        long done = assignment.getSubtasks().stream().filter(Subtask::isCompleted).count();
        return (total - done) / (double) total;
    }

    /** H: hours remaining until the deadline. Negative once overdue. */
    private double hoursLeft(Instant dueDate) {
        if (dueDate == null) return 24.0 * 30; // no due date -> treat as low priority (30 days out)
        long minutes = Duration.between(Instant.now(), dueDate).toMinutes();
        return minutes / 60.0;
    }
}
