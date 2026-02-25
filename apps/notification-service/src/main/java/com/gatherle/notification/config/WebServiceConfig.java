package com.gatherle.notification.config;

import org.springframework.boot.web.servlet.ServletRegistrationBean;
import org.springframework.context.ApplicationContext;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.io.ClassPathResource;
import org.springframework.ws.config.annotation.EnableWs;
import org.springframework.ws.config.annotation.WsConfigurerAdapter;
import org.springframework.ws.transport.http.MessageDispatcherServlet;
import org.springframework.ws.wsdl.wsdl11.DefaultWsdl11Definition;
import org.springframework.xml.xsd.SimpleXsdSchema;
import org.springframework.xml.xsd.XsdSchema;

/**
 * Spring Web Services configuration for SOAP endpoints. Serves the WSDL at
 * /ws/ticket-verification.wsdl
 */
@EnableWs
@Configuration
public class WebServiceConfig extends WsConfigurerAdapter {

  @Bean
  public ServletRegistrationBean<MessageDispatcherServlet> messageDispatcherServlet(
      ApplicationContext applicationContext) {
    MessageDispatcherServlet servlet = new MessageDispatcherServlet();
    servlet.setApplicationContext(applicationContext);
    servlet.setTransformWsdlLocations(true);
    return new ServletRegistrationBean<>(servlet, "/ws/*");
  }

  @Bean(name = "ticket-verification")
  public DefaultWsdl11Definition defaultWsdl11Definition(XsdSchema ticketSchema) {
    DefaultWsdl11Definition wsdl = new DefaultWsdl11Definition();
    wsdl.setPortTypeName("TicketVerificationPort");
    wsdl.setLocationUri("/ws");
    wsdl.setTargetNamespace("http://gatherle.com/soap/ticket");
    wsdl.setSchema(ticketSchema);
    return wsdl;
  }

  @Bean
  public XsdSchema ticketSchema() {
    return new SimpleXsdSchema(new ClassPathResource("wsdl/ticket-verification.xsd"));
  }
}
