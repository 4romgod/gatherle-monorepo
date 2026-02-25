package com.gatherle.notification.repository;

import com.gatherle.notification.entity.DeliveryLog;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface DeliveryLogRepository extends JpaRepository<DeliveryLog, Long> {

  List<DeliveryLog> findByNotificationId(Long notificationId);

  List<DeliveryLog> findByStatus(String status);

  long countByStatus(String status);
}
