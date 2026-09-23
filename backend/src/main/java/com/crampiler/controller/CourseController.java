package com.crampiler.controller;

import com.crampiler.model.Course;
import com.crampiler.repository.CourseRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.Optional;

/**
 * Course codes must be unique: VelocityScoringService looks courses up BY
 * code, so a duplicate would cause one course to silently shadow another's
 * weights for every task in it.
 */
@RestController
@RequestMapping("/api/courses")
public class CourseController {

    private final CourseRepository courseRepository;

    public CourseController(CourseRepository courseRepository) {
        this.courseRepository = courseRepository;
    }

    @GetMapping
    public List<Course> getCourses() {
        return courseRepository.findAll();
    }

    @PostMapping
    public ResponseEntity<?> createCourse(@RequestBody Course course) {
        if (isBlank(course.getCourseCode())) {
            return ResponseEntity.badRequest().body("Course code is required.");
        }
        Optional<Course> existing = courseRepository.findByCourseCode(course.getCourseCode());
        if (existing.isPresent()) {
            return ResponseEntity.status(409).body(
                    "A course with code \"" + course.getCourseCode() + "\" already exists.");
        }
        return ResponseEntity.ok(courseRepository.save(course));
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> updateCourse(@PathVariable String id, @RequestBody Course updated) {
        Optional<Course> maybeCourse = courseRepository.findById(id);
        if (maybeCourse.isEmpty()) {
            return ResponseEntity.notFound().build();
        }

        if (!isBlank(updated.getCourseCode())) {
            Optional<Course> codeOwner = courseRepository.findByCourseCode(updated.getCourseCode());
            if (codeOwner.isPresent() && !codeOwner.get().getId().equals(id)) {
                return ResponseEntity.status(409).body(
                        "A course with code \"" + updated.getCourseCode() + "\" already exists.");
            }
        }

        Course course = maybeCourse.get();
        course.setCourseCode(updated.getCourseCode());
        course.setCourseName(updated.getCourseName());
        course.setTargetGrade(updated.getTargetGrade());
        if (updated.getCategoryWeights() != null) {
            course.setCategoryWeights(updated.getCategoryWeights());
        }
        return ResponseEntity.ok(courseRepository.save(course));
    }

    @PutMapping("/{id}/weights")
    public ResponseEntity<Course> updateWeights(@PathVariable String id,
            @RequestBody Map<String, Double> weights) {
        return courseRepository.findById(id)
                .map(course -> {
                    course.setCategoryWeights(weights);
                    return ResponseEntity.ok(courseRepository.save(course));
                })
                .orElseGet(() -> ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteCourse(@PathVariable String id) {
        if (!courseRepository.existsById(id)) {
            return ResponseEntity.notFound().build();
        }
        courseRepository.deleteById(id);
        return ResponseEntity.noContent().build();
    }

    private boolean isBlank(String s) {
        return s == null || s.isBlank();
    }
}