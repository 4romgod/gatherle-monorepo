package com.gatherle.notification.consumer;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.gatherle.notification.dto.NotificationEvent;
import com.gatherle.notification.service.NotificationService;
import io.micrometer.core.instrument.Counter;
import io.micrometer.core.instrument.MeterRegistry;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Component;

/**
 * Kafka consumer that listens to notification topics published by the Gatherle Node.js API.
 *
 * <p>Topics: - gatherle.notifications.social (FOLLOW_RECEIVED, FOLLOW_ACCEPTED, MENTION) -
 * gatherle.notifications.events (EVENT_RSVP, EVENT_CANCELLED, EVENT_REMINDER_*, etc.) -
 * gatherle.notifications.org (ORG_INVITE, ORG_ROLE_CHANGED, ORG_EVENT_PUBLISHED)
 */
@Component
public class NotificationEventConsumer {

  private static final Logger log = LoggerFactory.getLogger(NotificationEventConsumer.class);

  private final NotificationService notificationService;
  private final ObjectMapper objectMapper;
  private final Counter consumedEvents;
  private final Counter failedEvents;

  public NotificationEventConsumer(
      NotificationService notificationService,
      ObjectMapper objectMapper,
      MeterRegistry meterRegistry) {
    this.notificationService = notificationService;
    this.objectMapper = objectMapper;
    this.consumedEvents =
        Counter.builder("kafka.events.consumed")
            .description("Kafka events successfully consumed")
            .register(meterRegistry);
    this.failedEvents =
        Counter.builder("kafka.events.failed")
            .description("Kafka events that failed processing")
            .register(meterRegistry);
  }

  @KafkaListener(topics = "gatherle.notifications.events", groupId = "notification-service")
  public void handleEventNotification(String message) {
    processMessage(message, "events");
  }

  @KafkaListener(topics = "gatherle.notifications.social", groupId = "notification-service")
  public void handleSocialNotification(String message) {
    processMessage(message, "social");
  }

  @KafkaListener(topics = "gatherle.notifications.org", groupId = "notification-service")
  public void handleOrgNotification(String message) {
    processMessage(message, "org");
  }

  private void processMessage(String message, String topic) {
    try {
      log.debug("Received Kafka message on topic '{}': {}", topic, message);
      NotificationEvent event = objectMapper.readValue(message, NotificationEvent.class);
      notificationService.processEvent(event);
      consumedEvents.increment();
    } catch (Exception e) {
      failedEvents.increment();
      log.error("Failed to process Kafka message on topic '{}': {}", topic, message, e);
    }
  }
}
