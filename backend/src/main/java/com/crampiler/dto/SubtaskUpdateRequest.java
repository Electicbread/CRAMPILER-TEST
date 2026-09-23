package com.crampiler.dto;

public class SubtaskUpdateRequest {

    private String subtaskId;
    private boolean completed;
    /** Optional: if subtaskId doesn't yet exist, this description creates it. */
    private String description;

    public String getSubtaskId() { return subtaskId; }
    public void setSubtaskId(String subtaskId) { this.subtaskId = subtaskId; }
    public boolean isCompleted() { return completed; }
    public void setCompleted(boolean completed) { this.completed = completed; }
    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }
}
