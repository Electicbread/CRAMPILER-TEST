package com.crampiler.model;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.util.HashMap;
import java.util.Map;

/**
 * Maps to the "courses" collection.
 * Holds the syllabus category weights the student sets in the Courses tab
 * (e.g. Midterms = 30%, Quizzes = 10%) — this is the W input to the
 * Velocity Priority Engine (see VelocityScoringService).
 */
@Document(collection = "courses")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class Course {

    @Id
    private String id;

    private String courseCode;
    private String courseName;

    /** e.g. {"Midterm": 0.30, "Quiz": 0.10, "Homework": 0.20, "Final": 0.40}, stored as 0-1 fractions. */
    private Map<String, Double> categoryWeights = new HashMap<>();

    /** Student's target grade as a fraction, e.g. 0.90 for a 90%/A-. Informational only (not used in scoring). */
    private double targetGrade;
}
