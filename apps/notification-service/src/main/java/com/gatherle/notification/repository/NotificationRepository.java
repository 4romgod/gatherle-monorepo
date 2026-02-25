package com.gatherle.notification.repository;

import com.gatherle.notification.entity.Notification;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

@Repository
public interface NotificationRepository extends JpaRepository<Notification, Long> {

  Page<Notification> findByRecipientIdOrderByCreatedAtDesc(String recipientId, Pageable pageable);

  Page<Notification> findByRecipientIdAndReadOrderByCreatedAtDesc(
      String recipientId, boolean read, Pageable pageable);

  long countByRecipientIdAndRead(String recipientId, boolean read);

  @Modifying
  @Query(
      "UPDATE Notification n SET n.read = true, n.readAt = CURRENT_TIMESTAMP WHERE n.recipientId = :recipientId AND n.read = false")
  int markAllAsRead(String recipientId);
}
