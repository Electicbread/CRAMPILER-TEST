package com.crampiler.service;

import com.crampiler.dto.ChatRequest;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;

@Service
public class ChatService {

  private static final String SYSTEM_PROMPT = String.join("\n",
      "You are the in-app help assistant for CramPiler, a student priority planner.",
      "Answer ONLY questions about how to use CramPiler or how it works.",
      "Be concise (2-4 sentences unless asked for detail).",
      "",
      "How CramPiler works:",
      "- It ranks tasks with a Velocity Score: V = W x (1 + D) / H",
      "  - W = the task's syllabus weight (e.g. 40 for a 40% exam), set per course in the Courses tab.",
      "  - D = fraction of subtasks still incomplete (0 = all done, 1 = none done; a task with no subtasks counts as D=1).",
      "  - H = hours left until the due date.",
      "- Overdue tasks are pinned to the top (score 999) unless the task's \"Late Penalty\" toggle is on, in which case its weight decays 10% per day late instead.",
      "- The Dashboard shows the #1 task as a big Hero Card, #2-3 as Runner-Ups, and everything else in a dimmed \"Upcoming Radar\" list sorted by date.",
      "- The Calendar tab has a \"Burnout Heatmap\" that colors weeks by how much of your grade is due that week (25%+ = amber, 50%+ = red).",
      "- The Courses tab lets you add courses, pick a syllabus type (Paired/Math/GED/Other/PATHFIT/Lab) to auto-fill standard weight breakdowns, or build custom categories by hand.",
      "- The Settings tab has the Blackboard .ics sync and the dark/light mode toggle.",
      "- Blackboard's calendar feed has no course info, so synced tasks land as \"Unassigned\" until manually assigned in the Courses tab.",
      "",
      "If asked something unrelated to CramPiler, politely say you can only help with questions about the app.");

  @Value("${crampiler.chat.api-key:}")
  private String apiKey;

  @Value("${crampiler.chat.api-url:https://api.groq.com/openai/v1/chat/completions}")
  private String apiUrl;

  @Value("${crampiler.chat.model:openai/gpt-oss-20b}")
  private String model;

  private final HttpClient httpClient = HttpClient.newHttpClient();

  public String reply(ChatRequest request) {
    if (apiKey == null || apiKey.isBlank()) {
      return "The chat assistant isn't configured yet — an admin needs to set "
          + "the CRAMPILER_CHAT_API_KEY environment variable on the backend "
          + "(a free key is available at console.groq.com).";
    }

    try {
      String body = buildRequestBody(request);
      HttpRequest httpRequest = HttpRequest.newBuilder(URI.create(apiUrl))
          .header("Content-Type", "application/json")
          .header("Authorization", "Bearer " + apiKey)
          .POST(HttpRequest.BodyPublishers.ofString(body, StandardCharsets.UTF_8))
          .build();

      HttpResponse<String> response = httpClient.send(httpRequest, HttpResponse.BodyHandlers.ofString());
      if (response.statusCode() != 200) {
        return "The chat assistant is temporarily unavailable (status " + response.statusCode() + ").";
      }
      return extractContent(response.body());
    } catch (Exception e) {
      return "The chat assistant hit an error: " + e.getMessage();
    }
  }

  private String buildRequestBody(ChatRequest request) {
    StringBuilder messages = new StringBuilder();
    messages.append("{\"role\":\"system\",\"content\":").append(jsonString(SYSTEM_PROMPT)).append("}");

    List<ChatRequest.ChatMessage> history = request.getHistory() != null ? request.getHistory() : new ArrayList<>();
    for (ChatRequest.ChatMessage m : history) {
      messages.append(",{\"role\":").append(jsonString(m.getRole()))
          .append(",\"content\":").append(jsonString(m.getContent())).append("}");
    }
    messages.append(",{\"role\":\"user\",\"content\":").append(jsonString(request.getMessage())).append("}");

    return "{\"model\":" + jsonString(model) + ",\"messages\":[" + messages + "],\"max_tokens\":300}";
  }

  private String jsonString(String s) {
    if (s == null)
      s = "";
    return "\"" + s.replace("\\", "\\\\").replace("\"", "\\\"").replace("\n", "\\n") + "\"";
  }

  private String extractContent(String responseBody) {
    int idx = responseBody.indexOf("\"content\"");
    if (idx == -1)
      return "Sorry, I couldn't parse a response just now.";
    int start = responseBody.indexOf('"', responseBody.indexOf(':', idx) + 1) + 1;
    StringBuilder sb = new StringBuilder();
    for (int i = start; i < responseBody.length(); i++) {
      char c = responseBody.charAt(i);
      if (c == '"' && responseBody.charAt(i - 1) != '\\')
        break;
      sb.append(c);
    }
    return sb.toString().replace("\\n", "\n").replace("\\\"", "\"").replace("\\\\", "\\");
  }
}