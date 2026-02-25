package com.gatherle.notification.config;

import org.apache.activemq.ActiveMQConnectionFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.jms.annotation.EnableJms;
import org.springframework.jms.config.DefaultJmsListenerContainerFactory;
import org.springframework.jms.core.JmsTemplate;
import org.springframework.jms.support.converter.MappingJackson2MessageConverter;
import org.springframework.jms.support.converter.MessageType;

/**
 * JMS / ActiveMQ configuration. Sets up Jackson-based message conversion so DTOs are serialized as
 * JSON.
 */
@Configuration
@EnableJms
public class JmsConfig {

  @Value("${spring.activemq.broker-url}")
  private String brokerUrl;

  @Value("${spring.activemq.user}")
  private String user;

  @Value("${spring.activemq.password}")
  private String password;

  @Bean
  public ActiveMQConnectionFactory connectionFactory() {
    ActiveMQConnectionFactory factory = new ActiveMQConnectionFactory();
    factory.setBrokerURL(brokerUrl);
    factory.setUserName(user);
    factory.setPassword(password);
    factory.setTrustedPackages(java.util.List.of("com.gatherle.notification"));
    return factory;
  }

  @Bean
  public MappingJackson2MessageConverter jacksonJmsMessageConverter() {
    MappingJackson2MessageConverter converter = new MappingJackson2MessageConverter();
    converter.setTargetType(MessageType.TEXT);
    converter.setTypeIdPropertyName("_typeId");
    return converter;
  }

  @Bean
  public JmsTemplate jmsTemplate(
      ActiveMQConnectionFactory connectionFactory,
      MappingJackson2MessageConverter messageConverter) {
    JmsTemplate template = new JmsTemplate(connectionFactory);
    template.setMessageConverter(messageConverter);
    return template;
  }

  @Bean
  public DefaultJmsListenerContainerFactory jmsListenerContainerFactory(
      ActiveMQConnectionFactory connectionFactory,
      MappingJackson2MessageConverter messageConverter) {
    DefaultJmsListenerContainerFactory factory = new DefaultJmsListenerContainerFactory();
    factory.setConnectionFactory(connectionFactory);
    factory.setMessageConverter(messageConverter);
    factory.setConcurrency("1-3");
    return factory;
  }
}
