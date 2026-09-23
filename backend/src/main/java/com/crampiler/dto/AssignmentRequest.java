package com.crampiler.dto;

import jakarta.validation.constraints.NotBlank;

import java.time.Instant;

/**
 * Used for manual task creation (POST /api/tasks) and full updates
 * (PUT /api/tasks/{id}) — as opposed to SubtaskUpdateRequest, which only
 * touches the checklist inside a task.
 */
public class AssignmentRequest {

    @NotBlank
    private String title;

    private Instant dueDate;
    private String courseCode;
    private String category;
    private boolean latePenaltyEnabled;

    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }
    public Instant getDueDate() { return dueDate; }
    public void setDueDate(Instant dueDate) { this.dueDate = dueDate; }
    public String getCourseCode() { return courseCode; }
    public void setCourseCode(String courseCode) { this.courseCode = courseCode; }
    public String getCategory() { return category; }
    public void setCategory(String category) { this.category = category; }
    public boolean isLatePenaltyEnabled() { return latePenaltyEnabled; }
    public void setLatePenaltyEnabled(boolean latePenaltyEnabled) { this.latePenaltyEnabled = latePenaltyEnabled; }
}
