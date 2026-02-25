package com.gatherle.notification.entity;

import jakarta.persistence.*;
import java.time.Instant;

/**
 * Represents a notification sent to a user. Maps to the Gatherle notification types defined in the
 * platform spec: FOLLOW_RECEIVED, EVENT_RSVP, EVENT_REMINDER_24H, EVENT_CANCELLED, etc.
 */
@Entity
@Table(
    name = "notifications",
    indexes = {
      @Index(name = "idx_notification_recipient", columnList = "recipientId"),
      @Index(name = "idx_notification_created", columnList = "createdAt"),
      @Index(name = "idx_notification_read", columnList = "recipientId, read")
    })
public class Notification {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  /** The type of notification, e.g. EVENT_RSVP, FOLLOW_RECEIVED, EVENT_CANCELLED */
  @Column(nullable = false, length = 50)
  private String type;

  /** The user who triggered the notification (e.g. the person who RSVP'd) */
  @Column(nullable = false, length = 64)
  private String actorId;

  /** The user receiving the notification */
  @Column(nullable = false, length = 64)
  private String recipientId;

  /** Optional reference to the related entity (event ID, org ID, etc.) */
  @Column(length = 64)
  private String referenceId;

  /** The entity type of the reference (EVENT, ORGANIZATION, USER) */
  @Column(length = 30)
  private String referenceType;

  /** Human-readable notification message */
  @Column(nullable = false, length = 500)
  private String message;

  /** Whether the notification has been read */
  @Column(nullable = false)
  private boolean read = false;

  /** Delivery channel used: IN_APP, EMAIL, PUSH */
  @Column(nullable = false, length = 20)
  private String channel;

  @Column(nullable = false, updatable = false)
  private Instant createdAt;

  private Instant readAt;

  @PrePersist
  protected void onCreate() {
    this.createdAt = Instant.now();
  }

  // --- Getters & Setters ---

  public Long getId() {
    return id;
  }

  public void setId(Long id) {
    this.id = id;
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

  public boolean isRead() {
    return read;
  }

  public void setRead(boolean read) {
    this.read = read;
  }

  public String getChannel() {
    return channel;
  }

  public void setChannel(String channel) {
    this.channel = channel;
  }

  public Instant getCreatedAt() {
    return createdAt;
  }

  public void setCreatedAt(Instant createdAt) {
    this.createdAt = createdAt;
  }

  public Instant getReadAt() {
    return readAt;
  }

  public void setReadAt(Instant readAt) {
    this.readAt = readAt;
  }
}
