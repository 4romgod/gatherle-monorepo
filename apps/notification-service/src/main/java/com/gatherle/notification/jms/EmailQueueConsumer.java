package com.gatherle.notification.jms;

import com.gatherle.notification.dto.EmailDeliveryRequest;
import com.gatherle.notification.entity.DeliveryLog;
import com.gatherle.notification.entity.Notification;
import com.gatherle.notification.repository.DeliveryLogRepository;
import com.gatherle.notification.repository.NotificationRepository;
import io.micrometer.core.instrument.Counter;
import io.micrometer.core.instrument.MeterRegistry;
import java.time.Instant;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.jms.annotation.JmsListener;
import org.springframework.stereotype.Component;

/**
 * Consumes email delivery requests from the JMS queue and processes them. In production, this would
 * integrate with an email provider (SES, SendGrid, etc.). For now, it logs the delivery and records
 * it in the delivery_logs table.
 */
@Component
public class EmailQueueConsumer {

  private static final Logger log = LoggerFactory.getLogger(EmailQueueConsumer.class);

  private final DeliveryLogRepository deliveryLogRepository;
  private final NotificationRepository notificationRepository;
  private final Counter emailsSent;
  private final Counter emailsFailed;

  public EmailQueueConsumer(
      DeliveryLogRepository deliveryLogRepository,
      NotificationRepository notificationRepository,
      MeterRegistry meterRegistry) {
    this.deliveryLogRepository = deliveryLogRepository;
    this.notificationRepository = notificationRepository;
    this.emailsSent =
        Counter.builder("emails.sent")
            .description("Emails successfully sent")
            .register(meterRegistry);
    this.emailsFailed =
        Counter.builder("emails.failed")
            .description("Email delivery failures")
            .register(meterRegistry);
  }

  @JmsListener(destination = EmailQueueProducer.EMAIL_QUEUE)
  public void processEmailDelivery(EmailDeliveryRequest request) {
    log.info(
        "Processing email delivery: notificationId={}, recipient={}",
        request.getNotificationId(),
        request.getRecipientId());

    Notification notification =
        notificationRepository.findById(request.getNotificationId()).orElse(null);

    if (notification == null) {
      log.warn("Notification not found for email delivery: id={}", request.getNotificationId());
      return;
    }

    DeliveryLog deliveryLog = new DeliveryLog();
    deliveryLog.setNotification(notification);
    deliveryLog.setChannel("EMAIL");
    deliveryLog.setAttemptCount(1);
    deliveryLog.setLastAttemptAt(Instant.now());

    try {
      // TODO: Integrate with actual email provider (SES, SendGrid)
      // For now, simulate email delivery
      log.info(
          "📧 Sending email to user '{}': subject='{}', body='{}'",
          request.getRecipientId(),
          request.getSubject(),
          request.getBody());

      deliveryLog.setStatus("DELIVERED");
      deliveryLog.setDeliveredAt(Instant.now());
      emailsSent.increment();

      log.info("Email delivered successfully for notification id={}", request.getNotificationId());
    } catch (Exception e) {
      deliveryLog.setStatus("FAILED");
      deliveryLog.setErrorMessage(e.getMessage());
      emailsFailed.increment();

      log.error("Email delivery failed for notification id={}", request.getNotificationId(), e);
    }

    deliveryLogRepository.save(deliveryLog);
  }
}
