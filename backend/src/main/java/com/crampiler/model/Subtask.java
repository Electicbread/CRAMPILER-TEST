package com.crampiler.model;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.util.UUID;

/**
 * Nested (embedded) document stored inside an Assignment.
 * Mirrors the "Task Checklist (Subtasks)" widget on the client tier.
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class Subtask {

    private String id = UUID.randomUUID().toString();
    private String description;
    private boolean completed;
}
