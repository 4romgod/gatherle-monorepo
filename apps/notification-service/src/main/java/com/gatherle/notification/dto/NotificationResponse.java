package com.gatherle.notification.dto;

import java.time.Instant;

/** Response DTO for the REST API — returned when querying notifications. */
public record NotificationResponse(
    Long id,
    String type,
    String actorId,
    String recipientId,
    String referenceId,
    String referenceType,
    String message,
    boolean read,
    String channel,
    Instant createdAt,
    Instant readAt) {}
