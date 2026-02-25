package com.gatherle.notification;

import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.kafka.test.context.EmbeddedKafka;
import org.springframework.test.context.ActiveProfiles;

@SpringBootTest
@ActiveProfiles("test")
@EmbeddedKafka(
    partitions = 1,
    topics = {
      "gatherle.notifications.events",
      "gatherle.notifications.social",
      "gatherle.notifications.org"
    })
class NotificationServiceApplicationTests {

  @Test
  void contextLoads() {
    // Verifies the full Spring context starts up
  }
}
