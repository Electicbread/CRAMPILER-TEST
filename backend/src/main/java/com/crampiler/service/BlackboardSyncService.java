package com.crampiler.service;

import biweekly.Biweekly;
import biweekly.ICalendar;
import biweekly.component.VEvent;
import com.crampiler.model.Assignment;
import com.crampiler.repository.AssignmentRepository;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.io.InputStream;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Instant;
import java.util.List;
import java.util.Optional;

/**
 * Connects to the student's private Blackboard Learn .ics feed, parses
 * VEVENT records with the biweekly library, and upserts them into MongoDB
 * keyed by their iCalendar UID (see Assignment#id).
 */
@Service
public class BlackboardSyncService {

    private final AssignmentRepository assignmentRepository;
    private final HttpClient httpClient = HttpClient.newHttpClient();
    private volatile Instant lastSyncedAt;
    private volatile String lastSyncError;

    public BlackboardSyncService(AssignmentRepository assignmentRepository) {
        this.assignmentRepository = assignmentRepository;
    }

    public Instant getLastSyncedAt() { return lastSyncedAt; }
    public String getLastSyncError() { return lastSyncError; }

    /**
     * Fetches the .ics feed at the given URL, parses every VEVENT, and
     * upserts a matching Assignment for each one. Existing subtasks and
     * completion state are preserved across re-syncs.
     *
     * @return number of assignments created or updated
     */
    public int syncFromFeed(String icsUrl) {
        try (InputStream body = fetch(icsUrl)) {
            ICalendar ical = Biweekly.parse(body).first();
            if (ical == null) return 0;

            int count = 0;
            for (VEvent event : ical.getEvents()) {
                upsertFromEvent(event);
                count++;
            }
            lastSyncedAt = Instant.now();
            lastSyncError = null;
            return count;
        } catch (IOException e) {
            lastSyncError = e.getMessage();
            throw new RuntimeException("Failed to fetch/parse Blackboard .ics feed: " + e.getMessage(), e);
        }
    }

    private InputStream fetch(String icsUrl) throws IOException {
        try {
            HttpRequest request = HttpRequest.newBuilder(URI.create(icsUrl)).GET().build();
            HttpResponse<InputStream> response = httpClient.send(request, HttpResponse.BodyHandlers.ofInputStream());
            return response.body();
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            throw new IOException("Interrupted while fetching feed", e);
        }
    }

    private void upsertFromEvent(VEvent event) {
        String uid = event.getUid() != null ? event.getUid().getValue() : UidFallback.from(event);
        Instant dueDate = event.getDateStart() != null
                ? event.getDateStart().getValue().toInstant()
                : null;
        String title = event.getSummary() != null ? event.getSummary().getValue() : "Untitled Assignment";
        String courseCode = CourseCodeExtractor.fromSummaryOrCategories(event);
        String category = CategoryClassifier.classify(title);

        Optional<Assignment> existing = assignmentRepository.findById(uid);
        Assignment assignment = existing.orElseGet(Assignment::new);

        assignment.setId(uid);
        assignment.setTitle(title);
        assignment.setDueDate(dueDate);
        assignment.setCourseCode(courseCode);
        assignment.setCategory(category);
        // subtasks & completed flag intentionally left untouched if the assignment already existed

        assignmentRepository.save(assignment);
    }

    /** Small helpers kept inline to avoid over-engineering the parsing layer. */
    private static class UidFallback {
        static String from(VEvent event) {
            String summary = event.getSummary() != null ? event.getSummary().getValue() : "event";
            String start = event.getDateStart() != null ? event.getDateStart().getValue().toString() : "";
            return (summary + "-" + start).replaceAll("\\s+", "-");
        }
    }

    private static class CourseCodeExtractor {
        static String fromSummaryOrCategories(VEvent event) {
            if (event.getCategories() != null && !event.getCategories().isEmpty()
                    && !event.getCategories().get(0).getValues().isEmpty()) {
                return event.getCategories().get(0).getValues().get(0);
            }
            return "UNASSIGNED";
        }
    }

    private static class CategoryClassifier {
        static String classify(String title) {
            String lower = title.toLowerCase();
            if (lower.contains("midterm")) return "Midterm";
            if (lower.contains("final")) return "Final";
            if (lower.contains("quiz")) return "Quiz";
            if (lower.contains("lab")) return "Lab";
            return "Homework";
        }
    }

    public List<Assignment> allTasks() {
        return assignmentRepository.findAll();
    }
}
