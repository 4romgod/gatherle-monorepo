package com.gatherle.notification.controller;

import com.gatherle.notification.dto.NotificationEvent;
import com.gatherle.notification.entity.Notification;
import com.gatherle.notification.service.NotificationService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

/**
 * REST endpoint for directly creating notifications (bypass Kafka). Useful for testing, admin
 * tools, and synchronous notification creation.
 */
@RestController
@RequestMapping("/api/v1/notifications")
@CrossOrigin(origins = "*")
@Tag(name = "Publish", description = "Create notifications directly (bypass Kafka)")
public class NotificationPublishController {

  private final NotificationService notificationService;

  public NotificationPublishController(NotificationService notificationService) {
    this.notificationService = notificationService;
  }

  /** POST /api/v1/notifications Create a notification directly (without going through Kafka). */
  @Operation(
      summary = "Create notification",
      description =
          "Create a notification directly, bypassing Kafka. Useful for testing and admin tools.")
  @PostMapping
  public ResponseEntity<Long> createNotification(@RequestBody @Valid CreateNotificationRequest request) {
    NotificationEvent event =
        new NotificationEvent(
            request.type(),
            request.actorId(),
            request.recipientId(),
            request.referenceId(),
            request.referenceType(),
            request.message());
    Notification notification = notificationService.processEvent(event);
    return ResponseEntity.status(HttpStatus.CREATED).body(notification.getId());
  }

  public record CreateNotificationRequest(
      @NotBlank String type,
      @NotBlank String actorId,
      @NotBlank String recipientId,
      String referenceId,
      String referenceType,
      @NotBlank String message) {}
}
