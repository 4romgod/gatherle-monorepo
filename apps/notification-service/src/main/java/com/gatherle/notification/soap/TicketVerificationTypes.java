package com.gatherle.notification.soap;

import jakarta.xml.bind.annotation.*;

/**
 * SOAP request/response types for ticket verification. This demonstrates SOAP API integration — a
 * common enterprise pattern. In Gatherle's context, this could verify event tickets before
 * check-in.
 */
public class TicketVerificationTypes {

  @XmlRootElement(name = "verifyTicketRequest", namespace = "http://gatherle.com/soap/ticket")
  @XmlAccessorType(XmlAccessType.FIELD)
  public static class VerifyTicketRequest {
    @XmlElement(namespace = "http://gatherle.com/soap/ticket")
    private String ticketId;

    @XmlElement(namespace = "http://gatherle.com/soap/ticket")
    private String eventId;

    public VerifyTicketRequest() {}

    public String getTicketId() {
      return ticketId;
    }

    public void setTicketId(String ticketId) {
      this.ticketId = ticketId;
    }

    public String getEventId() {
      return eventId;
    }

    public void setEventId(String eventId) {
      this.eventId = eventId;
    }
  }

  @XmlRootElement(name = "verifyTicketResponse", namespace = "http://gatherle.com/soap/ticket")
  @XmlAccessorType(XmlAccessType.FIELD)
  public static class VerifyTicketResponse {
    @XmlElement(namespace = "http://gatherle.com/soap/ticket")
    private boolean valid;

    @XmlElement(namespace = "http://gatherle.com/soap/ticket")
    private String holderName;

    @XmlElement(namespace = "http://gatherle.com/soap/ticket")
    private String eventName;

    @XmlElement(namespace = "http://gatherle.com/soap/ticket")
    private String ticketType;

    @XmlElement(namespace = "http://gatherle.com/soap/ticket")
    private String message;

    public VerifyTicketResponse() {}

    public boolean isValid() {
      return valid;
    }

    public void setValid(boolean valid) {
      this.valid = valid;
    }

    public String getHolderName() {
      return holderName;
    }

    public void setHolderName(String holderName) {
      this.holderName = holderName;
    }

    public String getEventName() {
      return eventName;
    }

    public void setEventName(String eventName) {
      this.eventName = eventName;
    }

    public String getTicketType() {
      return ticketType;
    }

    public void setTicketType(String ticketType) {
      this.ticketType = ticketType;
    }

    public String getMessage() {
      return message;
    }

    public void setMessage(String message) {
      this.message = message;
    }
  }
}
