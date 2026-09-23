package com.crampiler.model;

import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

@Document(collection = "assignments")
@Getter
@Setter
@NoArgsConstructor
public class Assignment {

    @Id
    private String id;

    private String courseCode;
    private String title;
    private Instant dueDate;

    private String category;

    private boolean completed = false;
    private List<Subtask> subtasks = new ArrayList<>();

    /**
     * Set the moment `completed` flips to true, cleared if it flips back to
     * false. This is what streak/weekly-completion stats are computed from
     * — using dueDate for that would misattribute a late-completed task to
     * the wrong day.
     */
    private Instant completedAt;

    private boolean latePenaltyEnabled = false;

    private transient double velocityScore;
    private transient boolean overdue;

    public Assignment(String id, String courseCode, String title, Instant dueDate, String category) {
        this.id = id;
        this.courseCode = courseCode;
        this.title = title;
        this.dueDate = dueDate;
        this.category = category;
    }
}