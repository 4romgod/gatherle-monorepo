package com.gatherle.notification.service;

import com.gatherle.notification.dto.NotificationEvent;
import com.gatherle.notification.dto.NotificationResponse;
import com.gatherle.notification.entity.Notification;
import com.gatherle.notification.jms.EmailQueueProducer;
import com.gatherle.notification.repository.NotificationRepository;
import io.micrometer.core.instrument.Counter;
import io.micrometer.core.instrument.MeterRegistry;
import java.time.Instant;
import java.util.Set;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Core notification business logic. Creates notifications from Kafka events,
 * manages read state,
 * and dispatches to delivery channels.
 */
@Service
public class NotificationService {

  private static final Logger log = LoggerFactory.getLogger(NotificationService.class);

  /** Notification types that also trigger email delivery via JMS */
  private static final Set<String> EMAIL_ELIGIBLE_TYPES = Set.of(
      "EVENT_REMINDER_24H",
      "EVENT_REMINDER_1H",
      "EVENT_CANCELLED",
      "EVENT_UPDATED",
      "ORG_INVITE");

  private final NotificationRepository notificationRepository;
  private final EmailQueueProducer emailQueueProducer;
  private final Counter notificationsCreated;
  private final Counter emailsDispatched;

  public NotificationService(
      NotificationRepository notificationRepository,
      EmailQueueProducer emailQueueProducer,
      MeterRegistry meterRegistry) {
    this.notificationRepository = notificationRepository;
    this.emailQueueProducer = emailQueueProducer;
    this.notificationsCreated = Counter.builder("notifications.created")
        .description("Total notifications created")
        .register(meterRegistry);
    this.emailsDispatched = Counter.builder("notifications.emails.dispatched")
        .description("Email delivery requests sent to JMS queue")
        .register(meterRegistry);
  }

  /**
   * Process a notification event from Kafka — create the notification and
   * dispatch side effects.
   */
  @Transactional
  public Notification processEvent(NotificationEvent event) {
    log.info("Processing notification event: {}", event);

    Notification notification = new Notification();
    notification.setType(event.getType());
    notification.setActorId(event.getActorId());
    notification.setRecipientId(event.getRecipientId());
    notification.setReferenceId(event.getReferenceId());
    notification.setReferenceType(event.getReferenceType());
    notification.setMessage(event.getMessage());
    notification.setChannel("IN_APP");

    notification = notificationRepository.save(notification);
    notificationsCreated.increment();

    log.info(
        "Notification created: id={}, type={}, recipient={}",
        notification.getId(),
        notification.getType(),
        notification.getRecipientId());

    // Dispatch email for eligible notification types
    if (EMAIL_ELIGIBLE_TYPES.contains(event.getType())) {
      emailQueueProducer.sendEmailRequest(notification);
      emailsDispatched.increment();
      log.info("Email delivery queued for notification id={}", notification.getId());
    }

    return notification;
  }

  /** Get paginated notifications for a user. */
  public Page<NotificationResponse> getNotifications(String recipientId, int page, int size) {
    return notificationRepository
        .findByRecipientIdOrderByCreatedAtDesc(recipientId, PageRequest.of(page, size))
        .map(this::toResponse);
  }

  /** Get unread notifications for a user. */
  public Page<NotificationResponse> getUnreadNotifications(String recipientId, int page, int size) {
    return notificationRepository
        .findByRecipientIdAndReadOrderByCreatedAtDesc(
            recipientId, false, PageRequest.of(page, size))
        .map(this::toResponse);
  }

  /** Get unread count for a user. */
  public long getUnreadCount(String recipientId) {
    return notificationRepository.countByRecipientIdAndRead(recipientId, false);
  }

  /** Mark a single notification as read. */
  @Transactional
  public NotificationResponse markAsRead(Long notificationId) {
    Notification notification = notificationRepository
        .findById(notificationId)
        .orElseThrow(
            () -> new IllegalArgumentException("Notification not found: " + notificationId));
    notification.setRead(true);
    notification.setReadAt(Instant.now());
    return toResponse(notificationRepository.save(notification));
  }

  /** Mark all notifications as read for a user. */
  @Transactional
  public int markAllAsRead(String recipientId) {
    return notificationRepository.markAllAsRead(recipientId);
  }

  private NotificationResponse toResponse(Notification n) {
    return new NotificationResponse(
        n.getId(),
        n.getType(),
        n.getActorId(),
        n.getRecipientId(),
        n.getReferenceId(),
        n.getReferenceType(),
        n.getMessage(),
        n.isRead(),
        n.getChannel(),
        n.getCreatedAt(),
        n.getReadAt());
  }
}
