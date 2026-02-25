-- V1: Create notifications and delivery_logs tables
CREATE TABLE notifications (
    id              BIGSERIAL PRIMARY KEY,
    type            VARCHAR(50)  NOT NULL,
    actor_id        VARCHAR(64)  NOT NULL,
    recipient_id    VARCHAR(64)  NOT NULL,
    reference_id    VARCHAR(64),
    reference_type  VARCHAR(30),
    message         VARCHAR(500) NOT NULL,
    read            BOOLEAN      NOT NULL DEFAULT FALSE,
    channel         VARCHAR(20)  NOT NULL,
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    read_at         TIMESTAMPTZ
);

CREATE INDEX idx_notification_recipient ON notifications (recipient_id);
CREATE INDEX idx_notification_created   ON notifications (created_at);
CREATE INDEX idx_notification_read      ON notifications (recipient_id, read);

CREATE TABLE delivery_logs (
    id              BIGSERIAL PRIMARY KEY,
    notification_id BIGINT       NOT NULL REFERENCES notifications(id),
    channel         VARCHAR(20)  NOT NULL,
    status          VARCHAR(20)  NOT NULL,
    attempt_count   INT          NOT NULL DEFAULT 0,
    error_message   VARCHAR(1000),
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    last_attempt_at TIMESTAMPTZ,
    delivered_at    TIMESTAMPTZ
);

CREATE INDEX idx_delivery_notification ON delivery_logs (notification_id);
CREATE INDEX idx_delivery_status       ON delivery_logs (status);
