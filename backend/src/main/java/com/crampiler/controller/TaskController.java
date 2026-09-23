package com.crampiler.controller;

import com.crampiler.dto.AssignmentRequest;
import com.crampiler.dto.CompleteRequest;
import com.crampiler.dto.SubtaskUpdateRequest;
import com.crampiler.dto.SyncRequest;
import com.crampiler.model.Assignment;
import com.crampiler.model.Course;
import com.crampiler.model.Subtask;
import com.crampiler.repository.AssignmentRepository;
import com.crampiler.repository.CourseRepository;
import com.crampiler.service.BlackboardSyncService;
import com.crampiler.service.VelocityScoringService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import java.util.stream.Collectors;

/**
 * REST Controller (application tier) for everything task-related.
 * GET /api/tasks - ALL tasks (active + completed), scored — used by the
 * Calendar
 * GET /api/tasks/velocity - active tasks only, sorted by Velocity Score desc —
 * feeds the Dashboard
 * GET /api/tasks/completed - the Archive: completed tasks, most recently due
 * first
 * POST /api/tasks - create a task manually
 * PUT /api/tasks/{id} - update a task's fields
 * DELETE /api/tasks/{id} - delete a task
 * PUT /api/tasks/{id}/complete - mark a task done / not done directly (moves it
 * into/out of the Archive)
 * PUT /api/tasks/{id}/subtasks - add/toggle a subtask (the D input to the
 * engine)
 * DELETE /api/tasks/{id}/subtasks/{sid} - remove a subtask
 * POST /api/sync - manual Blackboard sync
 * GET /api/sync/status - last successful sync time, for the sidebar indicator
 */
@RestController
@RequestMapping("/api")
public class TaskController {

    private final AssignmentRepository assignmentRepository;
    private final CourseRepository courseRepository;
    private final BlackboardSyncService blackboardSyncService;
    private final VelocityScoringService velocityScoringService;

    public TaskController(AssignmentRepository assignmentRepository,
            CourseRepository courseRepository,
            BlackboardSyncService blackboardSyncService,
            VelocityScoringService velocityScoringService) {
        this.assignmentRepository = assignmentRepository;
        this.courseRepository = courseRepository;
        this.blackboardSyncService = blackboardSyncService;
        this.velocityScoringService = velocityScoringService;
    }

    private Map<String, Course> allCoursesByCode() {
        return courseRepository.findAll().stream()
                .filter(c -> c.getCourseCode() != null)
                .collect(Collectors.toMap(Course::getCourseCode, c -> c, (a, b) -> a));
    }

    /**
     * All tasks (active + completed), each with its current Velocity Score
     * attached. Used by the Calendar view.
     */
    @GetMapping("/tasks")
    public List<Assignment> getAllTasks() {
        List<Assignment> tasks = assignmentRepository.findAll();
        Map<String, Course> coursesByCode = allCoursesByCode();
        tasks.forEach(t -> velocityScoringService.scoreAndAttach(t,
                coursesByCode.getOrDefault(t.getCourseCode(), new Course())));
        return tasks;
    }

    /**
     * Active (incomplete) tasks only, sorted by descending Velocity Score.
     * This is the Priority Pool the Dashboard's Hero Card / Runner-Ups /
     * Upcoming Radar are all built from.
     */
    @GetMapping("/tasks/velocity")
    public List<Assignment> getActiveTasksByVelocity() {
        List<Assignment> tasks = assignmentRepository.findByCompletedFalse();
        Map<String, Course> coursesByCode = allCoursesByCode();
        tasks.forEach(t -> velocityScoringService.scoreAndAttach(t,
                coursesByCode.getOrDefault(t.getCourseCode(), new Course())));
        tasks.sort(Comparator.comparingDouble(Assignment::getVelocityScore).reversed());
        return tasks;
    }

    /**
     * The Archive: tasks marked done, removed from the Velocity Engine entirely.
     */
    @GetMapping("/tasks/completed")
    public List<Assignment> getCompletedTasks() {
        List<Assignment> tasks = assignmentRepository.findByCompletedTrue();
        tasks.sort(Comparator.comparing(
                (Assignment a) -> a.getDueDate() != null ? a.getDueDate() : Instant.EPOCH).reversed());
        return tasks;
    }

    /** Creates a task by hand (not from a Blackboard sync). */
    @PostMapping("/tasks")
    public Assignment createTask(@Valid @RequestBody AssignmentRequest request) {
        Assignment assignment = new Assignment(
                UUID.randomUUID().toString(),
                request.getCourseCode(),
                request.getTitle(),
                request.getDueDate(),
                request.getCategory() != null ? request.getCategory() : "Homework");
        assignment.setLatePenaltyEnabled(request.isLatePenaltyEnabled());
        return assignmentRepository.save(assignment);
    }

    /**
     * Updates a task's title, due date, course, category, or late-penalty toggle.
     */
    @PutMapping("/tasks/{id}")
    public ResponseEntity<Assignment> updateTask(@PathVariable String id,
            @Valid @RequestBody AssignmentRequest request) {
        return assignmentRepository.findById(id)
                .map(task -> {
                    task.setTitle(request.getTitle());
                    task.setDueDate(request.getDueDate());
                    task.setCourseCode(request.getCourseCode());
                    if (request.getCategory() != null)
                        task.setCategory(request.getCategory());
                    task.setLatePenaltyEnabled(request.isLatePenaltyEnabled());
                    return ResponseEntity.ok(assignmentRepository.save(task));
                })
                .orElseGet(() -> ResponseEntity.notFound().build());
    }

    /** Deletes a task outright. */
    @DeleteMapping("/tasks/{id}")
    public ResponseEntity<Void> deleteTask(@PathVariable String id) {
        if (!assignmentRepository.existsById(id)) {
            return ResponseEntity.notFound().build();
        }
        assignmentRepository.deleteById(id);
        return ResponseEntity.noContent().build();
    }

    /**
     * Marks a task done/not-done directly. Completing it removes it from the
     * Velocity Engine and moves it into the Archive (GET /api/tasks/completed).
     */
    @PutMapping("/tasks/{id}/complete")
    public ResponseEntity<Assignment> setComplete(@PathVariable String id,
            @RequestBody CompleteRequest request) {
        return assignmentRepository.findById(id)
                .map(task -> {
                    task.setCompleted(request.isCompleted());
                    task.setCompletedAt(request.isCompleted() ? Instant.now() : null);
                    if (task.getSubtasks() != null) {
                        task.getSubtasks().forEach(s -> s.setCompleted(request.isCompleted()));
                    }
                    return ResponseEntity.ok(assignmentRepository.save(task));
                })
                .orElseGet(() -> ResponseEntity.notFound().build());
    }

    /**
     * Manually triggers a Blackboard .ics sync (in addition to the hourly scheduled
     * one).
     */
    @PostMapping("/sync")
    public ResponseEntity<String> syncNow(@Valid @RequestBody SyncRequest request) {
        int count = blackboardSyncService.syncFromFeed(request.getIcsUrl());
        return ResponseEntity.ok("Synced " + count + " assignments from Blackboard feed.");
    }

    /**
     * Last successful sync time, for the sidebar's "Last synced: X mins ago"
     * indicator.
     */
    @GetMapping("/sync/status")
    public Map<String, Object> syncStatus() {
        Map<String, Object> status = new HashMap<>();
        status.put("lastSyncedAt", blackboardSyncService.getLastSyncedAt());
        status.put("lastError", blackboardSyncService.getLastSyncError());
        return status;
    }

    /**
     * Checks/unchecks (or creates) a subtask — the D (Deficit) input to the
     * Velocity Engine.
     */
    @PutMapping("/tasks/{id}/subtasks")
    public ResponseEntity<Assignment> updateSubtask(@PathVariable String id,
            @RequestBody SubtaskUpdateRequest request) {
        Optional<Assignment> maybeAssignment = assignmentRepository.findById(id);
        if (maybeAssignment.isEmpty()) {
            return ResponseEntity.notFound().build();
        }

        Assignment assignment = maybeAssignment.get();

        if (request.getSubtaskId() == null || request.getSubtaskId().isBlank()) {
            Subtask newSubtask = new Subtask();
            newSubtask.setDescription(request.getDescription());
            newSubtask.setCompleted(request.isCompleted());
            assignment.getSubtasks().add(newSubtask);
        } else {
            assignment.getSubtasks().stream()
                    .filter(s -> s.getId().equals(request.getSubtaskId()))
                    .findFirst()
                    .ifPresent(s -> s.setCompleted(request.isCompleted()));
        }

        boolean allDone = !assignment.getSubtasks().isEmpty()
                && assignment.getSubtasks().stream().allMatch(Subtask::isCompleted);
        if (allDone && !assignment.isCompleted()) {
            assignment.setCompletedAt(Instant.now());
        } else if (!allDone) {
            assignment.setCompletedAt(null);
        }
        assignment.setCompleted(allDone);

        return ResponseEntity.ok(assignmentRepository.save(assignment));
    }

    /** Removes a single subtask from a task's checklist. */
    @DeleteMapping("/tasks/{id}/subtasks/{subtaskId}")
    public ResponseEntity<Assignment> deleteSubtask(@PathVariable String id, @PathVariable String subtaskId) {
        return assignmentRepository.findById(id)
                .map(task -> {
                    task.getSubtasks().removeIf(s -> s.getId().equals(subtaskId));
                    return ResponseEntity.ok(assignmentRepository.save(task));
                })
                .orElseGet(() -> ResponseEntity.notFound().build());
    }
}
