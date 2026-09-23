package com.crampiler.repository;

import com.crampiler.model.Assignment;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;

public interface AssignmentRepository extends MongoRepository<Assignment, String> {

    List<Assignment> findByCourseCode(String courseCode);

    List<Assignment> findByCompletedFalse();

    List<Assignment> findByCompletedTrue();

    List<Assignment> findByCourseCodeAndCompletedFalse(String courseCode);
}
