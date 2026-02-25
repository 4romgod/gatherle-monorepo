package com.gatherle.notification.soap;

import com.gatherle.notification.soap.TicketVerificationTypes.VerifyTicketRequest;
import com.gatherle.notification.soap.TicketVerificationTypes.VerifyTicketResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.ws.server.endpoint.annotation.Endpoint;
import org.springframework.ws.server.endpoint.annotation.PayloadRoot;
import org.springframework.ws.server.endpoint.annotation.RequestPayload;
import org.springframework.ws.server.endpoint.annotation.ResponsePayload;

/**
 * SOAP endpoint for ticket verification. Validates event tickets before allowing check-in
 * notifications.
 *
 * <p>WSDL available at: /ws/ticket-verification.wsdl Endpoint: /ws
 */
@Endpoint
public class TicketVerificationEndpoint {

  private static final Logger log = LoggerFactory.getLogger(TicketVerificationEndpoint.class);
  private static final String NAMESPACE_URI = "http://gatherle.com/soap/ticket";

  @PayloadRoot(namespace = NAMESPACE_URI, localPart = "verifyTicketRequest")
  @ResponsePayload
  public VerifyTicketResponse verifyTicket(@RequestPayload VerifyTicketRequest request) {
    log.info(
        "SOAP ticket verification: ticketId={}, eventId={}",
        request.getTicketId(),
        request.getEventId());

    VerifyTicketResponse response = new VerifyTicketResponse();

    // Simulated verification logic — in production, query a ticketing database
    if (request.getTicketId() != null && request.getTicketId().startsWith("TKT-")) {
      response.setValid(true);
      response.setHolderName("Demo Attendee");
      response.setEventName("Gatherle Launch Party");
      response.setTicketType("GENERAL_ADMISSION");
      response.setMessage("Ticket verified successfully");
    } else {
      response.setValid(false);
      response.setMessage("Invalid ticket ID format. Expected format: TKT-XXXXX");
    }

    log.info("Ticket verification result: valid={}", response.isValid());
    return response;
  }
}
