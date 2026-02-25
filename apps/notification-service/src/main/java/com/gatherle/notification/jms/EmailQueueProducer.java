package com.gatherle.notification.jms;

import com.gatherle.notification.dto.EmailDeliveryRequest;
import com.gatherle.notification.entity.Notification;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.jms.core.JmsTemplate;
import org.springframework.stereotype.Component;

/**
 * Produces email delivery requests to the ActiveMQ JMS queue. Emails that need reliable delivery
 * (event reminders, cancellations) are placed on a JMS queue for guaranteed processing with retry
 * support.
 */
@Component
public class EmailQueueProducer {

  private static final Logger log = LoggerFactory.getLogger(EmailQueueProducer.class);
  public static final String EMAIL_QUEUE = "gatherle.email.delivery";

  private final JmsTemplate jmsTemplate;

  public EmailQueueProducer(JmsTemplate jmsTemplate) {
    this.jmsTemplate = jmsTemplate;
  }

  /** Send an email delivery request to the JMS queue. */
  public void sendEmailRequest(Notification notification) {
    String subject = buildSubject(notification);
    String body = buildBody(notification);

    EmailDeliveryRequest request =
        new EmailDeliveryRequest(
            notification.getId(), notification.getRecipientId(), subject, body);

    jmsTemplate.convertAndSend(EMAIL_QUEUE, request);
    log.info(
        "Email request queued: notificationId={}, recipient={}",
        notification.getId(),
        notification.getRecipientId());
  }

  private String buildSubject(Notification notification) {
    return switch (notification.getType()) {
      case "EVENT_REMINDER_24H" -> "Reminder: Your event is tomorrow!";
      case "EVENT_REMINDER_1H" -> "Starting soon: Your event begins in 1 hour";
      case "EVENT_CANCELLED" -> "Event cancelled";
      case "EVENT_UPDATED" -> "Event details updated";
      case "ORG_INVITE" -> "You've been invited to join an organization";
      default -> "Gatherle Notification";
    };
  }

  private String buildBody(Notification notification) {
    return notification.getMessage();
  }
}
