package com.gatherle.notification.dto;

/** JMS message payload for email delivery requests. */
public class EmailDeliveryRequest implements java.io.Serializable {

  private static final long serialVersionUID = 1L;

  private Long notificationId;
  private String recipientId;
  private String subject;
  private String body;

  public EmailDeliveryRequest() {}

  public EmailDeliveryRequest(
      Long notificationId, String recipientId, String subject, String body) {
    this.notificationId = notificationId;
    this.recipientId = recipientId;
    this.subject = subject;
    this.body = body;
  }

  public Long getNotificationId() {
    return notificationId;
  }

  public void setNotificationId(Long notificationId) {
    this.notificationId = notificationId;
  }

  public String getRecipientId() {
    return recipientId;
  }

  public void setRecipientId(String recipientId) {
    this.recipientId = recipientId;
  }

  public String getSubject() {
    return subject;
  }

  public void setSubject(String subject) {
    this.subject = subject;
  }

  public String getBody() {
    return body;
  }

  public void setBody(String body) {
    this.body = body;
  }
}
