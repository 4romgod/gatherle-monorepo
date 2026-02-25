package com.gatherle.notification.controller;

import com.gatherle.notification.dto.NotificationResponse;
import com.gatherle.notification.service.NotificationService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import java.util.Map;
import org.springframework.data.domain.Page;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

/**
 * REST API for querying and managing notifications. Consumed by the Gatherle webapp and Angular
 * admin dashboard.
 */
@RestController
@RequestMapping("/api/v1/notifications")
@CrossOrigin(origins = "*") // Tighten in production
@Tag(name = "Notifications", description = "Query and manage user notifications")
public class NotificationController {

  private final NotificationService notificationService;

  public NotificationController(NotificationService notificationService) {
    this.notificationService = notificationService;
  }

  /** GET /api/v1/notifications/{recipientId} Get paginated notifications for a user. */
  @Operation(summary = "Get notifications", description = "Get paginated notifications for a user")
  @GetMapping("/{recipientId}")
  public ResponseEntity<Page<NotificationResponse>> getNotifications(
      @Parameter(description = "User ID of the notification recipient") @PathVariable
          String recipientId,
      @RequestParam(defaultValue = "0") int page,
      @RequestParam(defaultValue = "20") int size) {
    return ResponseEntity.ok(notificationService.getNotifications(recipientId, page, size));
  }

  /** GET /api/v1/notifications/{recipientId}/unread Get unread notifications for a user. */
  @Operation(
      summary = "Get unread notifications",
      description = "Get paginated unread notifications for a user")
  @GetMapping("/{recipientId}/unread")
  public ResponseEntity<Page<NotificationResponse>> getUnreadNotifications(
      @Parameter(description = "User ID of the notification recipient") @PathVariable
          String recipientId,
      @RequestParam(defaultValue = "0") int page,
      @RequestParam(defaultValue = "20") int size) {
    return ResponseEntity.ok(notificationService.getUnreadNotifications(recipientId, page, size));
  }

  /** GET /api/v1/notifications/{recipientId}/unread/count Get unread count for badge display. */
  @Operation(
      summary = "Get unread count",
      description = "Get unread notification count for badge display")
  @GetMapping("/{recipientId}/unread/count")
  public ResponseEntity<Map<String, Long>> getUnreadCount(
      @Parameter(description = "User ID of the notification recipient") @PathVariable
          String recipientId) {
    long count = notificationService.getUnreadCount(recipientId);
    return ResponseEntity.ok(Map.of("count", count));
  }

  /** PATCH /api/v1/notifications/{id}/read Mark a single notification as read. */
  @Operation(summary = "Mark as read", description = "Mark a single notification as read")
  @PatchMapping("/{id}/read")
  public ResponseEntity<NotificationResponse> markAsRead(
      @Parameter(description = "Notification ID") @PathVariable Long id) {
    return ResponseEntity.ok(notificationService.markAsRead(id));
  }

  /**
   * PATCH /api/v1/notifications/{recipientId}/read-all Mark all notifications as read for a user.
   */
  @Operation(
      summary = "Mark all as read",
      description = "Mark all notifications as read for a user")
  @PatchMapping("/{recipientId}/read-all")
  public ResponseEntity<Map<String, Integer>> markAllAsRead(
      @Parameter(description = "User ID of the notification recipient") @PathVariable
          String recipientId) {
    int updated = notificationService.markAllAsRead(recipientId);
    return ResponseEntity.ok(Map.of("updated", updated));
  }
}
