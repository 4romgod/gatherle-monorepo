package com.gatherle.notification.entity;

import jakarta.persistence.*;
import java.time.Instant;

/**
 * Tracks delivery attempts for notifications across channels (EMAIL, PUSH). Used for retry logic
 * and delivery monitoring.
 */
@Entity
@Table(
    name = "delivery_logs",
    indexes = {
      @Index(name = "idx_delivery_notification", columnList = "notification_id"),
      @Index(name = "idx_delivery_status", columnList = "status")
    })
public class DeliveryLog {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "notification_id", nullable = false)
  private Notification notification;

  /** Delivery channel: EMAIL, PUSH, SMS */
  @Column(nullable = false, length = 20)
  private String channel;

  /** Status: PENDING, SENT, DELIVERED, FAILED */
  @Column(nullable = false, length = 20)
  private String status;

  /** Number of delivery attempts */
  @Column(nullable = false)
  private int attemptCount = 0;

  /** Error message if delivery failed */
  @Column(length = 1000)
  private String errorMessage;

  @Column(nullable = false, updatable = false)
  private Instant createdAt;

  private Instant lastAttemptAt;

  private Instant deliveredAt;

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

  public Notification getNotification() {
    return notification;
  }

  public void setNotification(Notification notification) {
    this.notification = notification;
  }

  public String getChannel() {
    return channel;
  }

  public void setChannel(String channel) {
    this.channel = channel;
  }

  public String getStatus() {
    return status;
  }

  public void setStatus(String status) {
    this.status = status;
  }

  public int getAttemptCount() {
    return attemptCount;
  }

  public void setAttemptCount(int attemptCount) {
    this.attemptCount = attemptCount;
  }

  public String getErrorMessage() {
    return errorMessage;
  }

  public void setErrorMessage(String errorMessage) {
    this.errorMessage = errorMessage;
  }

  public Instant getCreatedAt() {
    return createdAt;
  }

  public void setCreatedAt(Instant createdAt) {
    this.createdAt = createdAt;
  }

  public Instant getLastAttemptAt() {
    return lastAttemptAt;
  }

  public void setLastAttemptAt(Instant lastAttemptAt) {
    this.lastAttemptAt = lastAttemptAt;
  }

  public Instant getDeliveredAt() {
    return deliveredAt;
  }

  public void setDeliveredAt(Instant deliveredAt) {
    this.deliveredAt = deliveredAt;
  }
}
