package com.gatherle.notification.dto;

/**
 * Kafka event payload — the message format published by the Node.js API. Matches the Gatherle
 * notification event types (EVENT_RSVP, FOLLOW_RECEIVED, etc.)
 */
public class NotificationEvent {

  private String type;
  private String actorId;
  private String recipientId;
  private String referenceId;
  private String referenceType;
  private String message;

  public NotificationEvent() {}

  public NotificationEvent(
      String type,
      String actorId,
      String recipientId,
      String referenceId,
      String referenceType,
      String message) {
    this.type = type;
    this.actorId = actorId;
    this.recipientId = recipientId;
    this.referenceId = referenceId;
    this.referenceType = referenceType;
    this.message = message;
  }

  public String getType() {
    return type;
  }

  public void setType(String type) {
    this.type = type;
  }

  public String getActorId() {
    return actorId;
  }

  public void setActorId(String actorId) {
    this.actorId = actorId;
  }

  public String getRecipientId() {
    return recipientId;
  }

  public void setRecipientId(String recipientId) {
    this.recipientId = recipientId;
  }

  public String getReferenceId() {
    return referenceId;
  }

  public void setReferenceId(String referenceId) {
    this.referenceId = referenceId;
  }

  public String getReferenceType() {
    return referenceType;
  }

  public void setReferenceType(String referenceType) {
    this.referenceType = referenceType;
  }

  public String getMessage() {
    return message;
  }

  public void setMessage(String message) {
    this.message = message;
  }

  @Override
  public String toString() {
    return "NotificationEvent{type='%s', actor='%s', recipient='%s', ref='%s'}"
        .formatted(type, actorId, recipientId, referenceId);
  }
}
