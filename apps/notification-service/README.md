# Gatherle Notification Service

A **Java Spring Boot microservice** that handles event-driven notifications for the Gatherle event
management platform. This service demonstrates real-world usage of **Kafka**, **JMS/ActiveMQ**,
**JDBC/JPA/SQL**, **Prometheus**, **SOAP**, **Docker**, and **Maven** — all wired together in a
single, production-shaped application.

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Technology Deep-Dive](#technology-deep-dive)
   - [Java](#java)
   - [Maven](#maven)
   - [Spring Boot](#spring-boot)
   - [Apache Kafka](#apache-kafka)
   - [JMS & ActiveMQ](#jms--activemq)
   - [JDBC, JPA & SQL](#jdbc-jpa--sql)
   - [Flyway (Database Migrations)](#flyway-database-migrations)
   - [Prometheus & Micrometer](#prometheus--micrometer)
   - [SOAP Web Services](#soap-web-services)
   - [Docker & Docker Compose](#docker--docker-compose)
   - [OpenAPI / Swagger](#openapi--swagger)
3. [Project Structure](#project-structure)
4. [How the Code Works](#how-the-code-works)
   - [Application Entry Point](#application-entry-point)
   - [Kafka Consumer](#kafka-consumer)
   - [Notification Service (Business Logic)](#notification-service-business-logic)
   - [JMS Email Pipeline](#jms-email-pipeline)
   - [REST Controllers](#rest-controllers)
   - [SOAP Endpoint](#soap-endpoint)
   - [Data Layer (Entities & Repositories)](#data-layer-entities--repositories)
   - [Configuration Classes](#configuration-classes)
5. [Getting Started](#getting-started)
   - [Prerequisites](#prerequisites)
   - [Start Infrastructure](#start-infrastructure)
   - [Build & Run the App](#build--run-the-app)
   - [Test It Out](#test-it-out)
6. [Testing](#testing)
7. [Code Formatting](#code-formatting)
8. [Docker Production Build](#docker-production-build)
9. [Monitoring Dashboard](#monitoring-dashboard)
10. [How This Fits Into Gatherle](#how-this-fits-into-gatherle)
11. [What's Next](#whats-next)

---

## Architecture Overview

```
                                     ┌──────────────────────────────┐
┌──────────────┐    ┌─────────┐      │    Notification Service      │
│ Node.js API  │──▶│  Kafka  │─────▶│    (Spring Boot / Java)      │
│ (GraphQL)    │    │  Topics │      │                              │
└──────────────┘    └─────────┘      │  ┌────────────────────────┐  │
    producer          publish/       │  │  NotificationService   │  │
                      consume        │  │  (business logic)      │  │
                                     │  └───────────┬────────────┘  │
                                     │        ┌─────┴──────┐        │
                                     │        ▼            ▼        │
                                     │   ┌────────┐  ┌──────────┐   │
                                     │   │  JPA   │  │   JMS    │   │
                                     │   │  Save  │  │  Email Q │   │
                                     │   └───┬────┘  └─────┬────┘   │
                                     └───────┼─────────────┼────────┘
                                             ▼             ▼
                                     ┌────────────┐  ┌──────────┐
                                     │ PostgreSQL │  │ ActiveMQ │
                                     │  (store)   │  │ (emails) │
                                     └────────────┘  └──────────┘

┌────────────┐                       ┌──────────────────────────────┐
│ Prometheus │◀─────────────────────│ /actuator/prometheus         │
└────────────┘        scrape         └──────────────────────────────┘

┌────────────┐                       ┌──────────────────────────────┐
│  Client    │─────────────────────▶│ REST API  /api/v1/...        │
└────────────┘     query notifs      └──────────────────────────────┘

┌────────────┐                       ┌──────────────────────────────┐
│  Legacy    │─────────────────────▶│ SOAP  /ws                    │
└────────────┘   ticket verification └──────────────────────────────┘
```

**Data flow in plain English:**

1. The existing Node.js GraphQL API publishes a JSON event to a **Kafka topic** when something
   happens (e.g., a user RSVPs to an event, an event is cancelled).
2. This Java service **consumes** that Kafka message.
3. It saves a **Notification** row to **PostgreSQL** via JPA.
4. If the notification type requires an email (reminders, cancellations), it puts a message onto an
   **ActiveMQ JMS queue**.
5. A JMS listener picks up the email request and delivers it (currently simulated — ready for SES or
   SendGrid).
6. The service exposes **REST endpoints** so the frontend can fetch a user's notifications.
7. **Prometheus** scrapes custom metrics (notifications created, emails sent, failures) from the
   `/actuator/prometheus` endpoint.
8. A **SOAP endpoint** exists for ticket verification — demonstrates enterprise integration.

---

## Technology Deep-Dive

### Java

**What it is:** Java is a compiled, statically-typed, object-oriented programming language. Code is
written in `.java` files, compiled to **bytecode** (`.class` files), and runs on the **Java Virtual
Machine** (JVM). This means Java can run on any OS that has a JVM — "write once, run anywhere."

**Version we use:** Java 21 (LTS — Long Term Support). This version introduced modern features like:

- **Records** — immutable data classes in one line (we use these for DTOs)
- **Switch expressions** — cleaner `switch` syntax that returns values
- **Text blocks** — multi-line strings with `"""`
- **Pattern matching** — smarter `instanceof` checks

**Key concepts for this project:**

| Concept | What it means |
|---------|---------------|
| `package` | Namespace for organizing classes (like folders). E.g., `com.gatherle.notification.service` |
| `class` | A blueprint for objects. Most Java files define one public class |
| `interface` | A contract that a class promises to implement (like TypeScript interfaces) |
| `annotation` | Metadata prefixed with `@`. E.g., `@Service`, `@Transactional`. Spring uses these heavily to configure behavior without XML |
| `import` | Brings in classes from other packages. Like `import` in TypeScript |
| Dependency Injection | Instead of `new MyService()`, Spring creates objects for you and passes them in via constructor parameters. This is the core Spring pattern |

**TypeScript ↔ Java quick comparison:**

```
TypeScript                          Java
─────────────────────────────       ─────────────────────────────
const x: string = "hello";         String x = "hello";
interface Foo { bar(): void; }      public interface Foo { void bar(); }
class MyService { ... }             public class MyService { ... }
export default ...                  public class ... (one per file)
?.  (optional chaining)             (no equivalent; null checks)
async/await                         CompletableFuture (or reactive)
```

### Maven

**What it is:** Maven is a **build tool** and **dependency manager** for Java. It's what `npm` is to
Node.js. Every Java project using Maven has a `pom.xml` file (like `package.json`).

**How it works:**

```
pom.xml (Project Object Model)
├── Declares project metadata (groupId, artifactId, version)
├── Lists dependencies (like npm dependencies)
├── Defines build plugins (like npm scripts + tools)
└── Inherits from a parent POM (Spring Boot manages versions)
```

**Key commands:**

| Command | What it does | npm equivalent |
|---------|-------------|---------------|
| `mvn compile` | Compiles `.java` → `.class` files | (no direct equivalent; TS: `tsc`) |
| `mvn test` | Runs all tests | `npm test` |
| `mvn package` | Compiles + tests + builds a `.jar` file | `npm run build` |
| `mvn clean` | Deletes `target/` directory (build output) | `rm -rf dist/` |
| `mvn dependency:resolve` | Downloads all dependencies to local cache | `npm install` |
| `mvn spring-boot:run` | Starts the Spring Boot app | `npm run dev` |
| `mvn spotless:apply` | Formats code (like Prettier) | `npx prettier --write .` |
| `mvn spotless:check` | Checks formatting (CI) | `npx prettier --check .` |

**Our `pom.xml` explained:**

```xml
<parent>
  <groupId>org.springframework.boot</groupId>
  <artifactId>spring-boot-starter-parent</artifactId>
  <version>3.4.3</version>
</parent>
```

This is like extending a base config. Spring Boot's parent POM pre-defines compatible versions for
hundreds of libraries so you don't have to manage version conflicts yourself.

```xml
<dependency>
  <groupId>org.springframework.boot</groupId>
  <artifactId>spring-boot-starter-web</artifactId>
  <!-- no <version> needed — parent manages it -->
</dependency>
```

A "starter" bundles several dependencies together. `spring-boot-starter-web` pulls in an embedded
Tomcat server, Spring MVC, Jackson for JSON, and more — just like how `create-next-app` gives you a
full stack from one install.

**Build lifecycle:** `mvn package` runs these phases in order:

```
validate → compile → test → package → verify → install → deploy
```

You only specify the phase you want. Maven runs all preceding phases automatically.

### Spring Boot

**What it is:** Spring Boot is a framework that makes it easy to build production-grade Java
applications. It's built on top of the **Spring Framework** (a massive ecosystem for enterprise
Java), but removes most of the painful configuration.

**The core idea — Inversion of Control (IoC):**

In normal code, YOU create objects:

```java
// You're in control
EmailService emailService = new EmailService();
NotificationService notifService = new NotificationService(emailService);
```

In Spring, the FRAMEWORK creates objects (called "beans") and wires them together:

```java
@Service  // ← Tells Spring: "Create an instance of this and manage it"
public class NotificationService {

  private final EmailQueueProducer emailProducer;

  // Spring sees this constructor, finds an EmailQueueProducer bean it already
  // created, and passes it in automatically. This is "dependency injection."
  public NotificationService(EmailQueueProducer emailProducer) {
    this.emailProducer = emailProducer;
  }
}
```

**Key annotations we use:**

| Annotation | Where | What it does |
|-----------|-------|-------------|
| `@SpringBootApplication` | Main class | Enables auto-configuration, component scanning, and bean definition |
| `@Service` | Business logic classes | Marks a class as a Spring-managed service bean |
| `@Component` | General-purpose classes | Like `@Service` but without semantic meaning |
| `@Repository` | Data access classes | Marks a JPA repository; enables exception translation |
| `@RestController` | HTTP endpoint classes | Combines `@Controller` + `@ResponseBody` — returns JSON by default |
| `@Configuration` | Config classes | Declares beans and configuration settings |
| `@Endpoint` | SOAP classes | Marks a class as a SOAP web service endpoint |
| `@Transactional` | Methods/classes | Wraps the method in a database transaction (auto-commit or rollback) |
| `@EnableKafka` | Main class | Activates Kafka listener support |
| `@EnableJms` | Main class | Activates JMS listener support |

**Auto-configuration magic:** When Spring Boot starts, it scans your classpath. If it finds
`spring-kafka` on the classpath AND `spring.kafka.bootstrap-servers` in your config, it
automatically creates a `KafkaTemplate`, consumer factory, and everything else needed. You just
write your `@KafkaListener` method and it works.

**application.yml:** This is Spring Boot's configuration file (like `.env` + config combined). It
uses YAML format and supports profiles (e.g., `application-test.yml` is loaded when you activate the
`test` profile).

### Apache Kafka

**What it is:** Kafka is a distributed **event streaming platform**. Think of it as a durable,
high-throughput message bus. Producers publish messages to **topics**, and consumers read from those
topics.

**Why not just use HTTP?**

| Feature | HTTP (REST) | Kafka |
|---------|------------|-------|
| Coupling | Tight — caller waits for response | Loose — producer doesn't know/care who consumes |
| Delivery | "Fire and forget" unless you add retry | Messages persist; consumers can replay |
| Throughput | Limited by HTTP overhead | Millions of messages/second |
| Multiple consumers | Would need webhooks | Multiple consumer groups read independently |
| Ordering | Manual | Guaranteed within a partition |

**Core concepts:**

```
Producer ──▶ Topic ──▶ Consumer

             Topic: "gatherle.notifications.events"
             ┌──────────────────────────────────┐
             │  Partition 0                     │
             │  [msg1] [msg2] [msg3] [msg4] ... │ ← ordered, append-only log
             └──────────────────────────────────┘
```

| Concept | Explanation |
|---------|-------------|
| **Topic** | A named stream of messages. Like a channel you publish to. We have 3: `gatherle.notifications.events`, `.social`, `.org` |
| **Partition** | A topic is split into partitions for parallelism. Messages within one partition are ordered |
| **Consumer Group** | A named group of consumers. Each partition is read by exactly one consumer in the group. This is how Kafka distributes load |
| **Offset** | A consumer's position in a partition. Kafka remembers where each consumer group left off |
| **Broker** | A Kafka server instance. In production, you'd have 3+ brokers for reliability |
| **KRaft mode** | Kafka's new built-in consensus mechanism, replacing ZooKeeper (a separate coordination service) |

**How we use Kafka:**

```java
@KafkaListener(
  topics = "gatherle.notifications.events",
  groupId = "notification-service"
)
public void handleEventNotification(String message) {
  // 'message' is the raw JSON string from the Kafka topic
  NotificationEvent event = objectMapper.readValue(message, NotificationEvent.class);
  notificationService.processEvent(event);
}
```

Spring Kafka handles the polling loop, offset commits, error handling, and deserialization behind
the scenes. You just write the method.

**Message format** (what the Node.js API would produce):

```json
{
  "type": "EVENT_REMINDER_24H",
  "actorId": "system",
  "recipientId": "user-abc-123",
  "referenceId": "event-456",
  "referenceType": "EVENT",
  "message": "Your event 'Jazz Night' starts in 24 hours"
}
```

### JMS & ActiveMQ

**What is JMS?** Java Message Service — a Java API specification for sending messages between
applications. It defines a standard interface, and vendors provide implementations (like how JDBC is
a standard and PostgreSQL/MySQL are implementations).

**What is ActiveMQ?** An open-source **message broker** that implements JMS. It's like a post office
that receives, stores, and delivers messages. ActiveMQ Classic (what we use) is the traditional
version; ActiveMQ Artemis is the newer version.

**Kafka vs. JMS — when to use which:**

| Aspect | Kafka | JMS (ActiveMQ) |
|--------|-------|----------------|
| Model | Pub/sub (topics), log-based | Queues (point-to-point) or topics |
| Retention | Messages persist after consumption | Messages deleted after acknowledgment |
| Use case | Event streaming, analytics, replays | Task queues, work distribution |
| Scale | Massive (millions/sec) | Moderate (thousands/sec) |
| Ordering | Per-partition | Per-queue |
| Redelivery | Consumer can replay from any offset | Broker redelivers on failure |

**Why we use both:** Kafka is for **event distribution** (one event → many services). JMS/ActiveMQ
is for **task processing** — we want each email delivery to be processed exactly once, with retry
support.

**How we use JMS:**

```
Kafka Consumer                              ActiveMQ Queue
─────────────                               ──────────────
Receives event   ──▶  NotificationService  ──▶  "gatherle.email.delivery"
                      saves to DB ────────────▶  EmailQueueProducer.sendEmailRequest()
                                                        │
                                                        ▼
                                              EmailQueueConsumer.processEmailDelivery()
                                              (sends email, saves DeliveryLog)
```

**Producer side:**

```java
jmsTemplate.convertAndSend("gatherle.email.delivery", emailRequest);
// The message is serialized to JSON (via our JmsConfig) and placed on the queue
```

**Consumer side:**

```java
@JmsListener(destination = "gatherle.email.delivery")
public void processEmailDelivery(EmailDeliveryRequest request) {
  // ActiveMQ delivers the message here exactly once
  // If this method throws, ActiveMQ will redeliver it
}
```

**ActiveMQ Web Console:** Visit `http://localhost:8161` (admin/admin) to see queues, messages, and
consumers. It's a great debugging tool.

### JDBC, JPA & SQL

These three work together as the data persistence stack:

```
Your Code   ──▶   JPA (ORM)   ──▶   JDBC (driver)   ──▶   PostgreSQL (database)
   │                 │                    │                       │
   │  Java objects   │  SQL generated     │  Low-level protocol   │  Tables & rows
   │  (entities)     │  automatically     │  (TCP connection)     │  on disk
```

**JDBC (Java Database Connectivity):** The low-level API for talking to databases. It handles
connections, executing SQL, and reading result sets. You rarely use JDBC directly because JPA wraps
it.

**JPA (Java Persistence API):** An ORM (Object-Relational Mapping) specification. It maps Java
classes to database tables. **Hibernate** is the most popular JPA implementation (and what Spring
Boot uses by default).

**How we use JPA:**

1. **Entity class** — maps to a table:

```java
@Entity                             // "this class maps to a database table"
@Table(name = "notifications")      // table name in PostgreSQL
public class Notification {

  @Id                                // primary key column
  @GeneratedValue(strategy = GenerationType.IDENTITY)  // auto-increment
  private Long id;

  @Column(nullable = false, length = 50)   // column constraints
  private String type;

  // JPA uses getters/setters to read/write field values
}
```

2. **Repository interface** — generates SQL automatically:

```java
@Repository
public interface NotificationRepository extends JpaRepository<Notification, Long> {
  // Spring Data JPA generates the SQL for you based on the method name!

  // SELECT * FROM notifications WHERE recipient_id = ? ORDER BY created_at DESC
  Page<Notification> findByRecipientIdOrderByCreatedAtDesc(String recipientId, Pageable pageable);

  // SELECT COUNT(*) FROM notifications WHERE recipient_id = ? AND read = ?
  long countByRecipientIdAndRead(String recipientId, boolean read);

  // For complex queries, you write JPQL (a SQL-like language for JPA):
  @Query("UPDATE Notification n SET n.read = true WHERE n.recipientId = :recipientId")
  int markAllAsRead(String recipientId);
}
```

You never write `new NotificationRepository()`. Spring creates a proxy class at runtime that
implements all these methods with actual SQL.

**SQL (our migration):**

```sql
CREATE TABLE notifications (
  id              BIGSERIAL PRIMARY KEY,   -- auto-incrementing 64-bit integer
  type            VARCHAR(50)  NOT NULL,
  actor_id        VARCHAR(100) NOT NULL,
  recipient_id    VARCHAR(100) NOT NULL,
  reference_id    VARCHAR(100),
  reference_type  VARCHAR(50),
  message         TEXT         NOT NULL,
  read            BOOLEAN      NOT NULL DEFAULT FALSE,
  channel         VARCHAR(20)  NOT NULL DEFAULT 'IN_APP',
  created_at      TIMESTAMP    NOT NULL DEFAULT NOW(),
  read_at         TIMESTAMP
);
```

**Column naming:** JPA maps Java's camelCase (`recipientId`) to SQL's snake_case (`recipient_id`)
automatically via the `SpringPhysicalNamingStrategy`.

### Flyway (Database Migrations)

**What it is:** Flyway is a database migration tool. It manages SQL scripts that evolve your schema
over time — like `knex` migrations or Rails migrations.

**How it works:**

```
src/main/resources/db/migration/
├── V1__create_notifications_tables.sql    ← "Version 1"
├── V2__add_priority_column.sql            ← "Version 2" (future)
└── V3__create_preferences_table.sql       ← "Version 3" (future)
```

**Naming convention:** `V{version}__{description}.sql` (note the double underscore).

When the app starts, Flyway:

1. Checks a `flyway_schema_history` table in the database
2. Sees which migrations have run
3. Runs any new migrations **in order**
4. Records them in the history table

This means you never manually run `CREATE TABLE` — Flyway does it for you as part of app startup.

### Prometheus & Micrometer

**What is Prometheus?** An open-source **monitoring and alerting system**. It works on a **pull**
model — Prometheus periodically **scrapes** (HTTP GET) a metrics endpoint on your app and stores the
time-series data.

**What is Micrometer?** A metrics facade for Java — like SLF4J is for logging. It provides a
standard API for recording metrics, and plugs into many backends (Prometheus, Datadog, CloudWatch,
etc.).

**How they work together:**

```
Your Java code                    Spring Actuator              Prometheus
──────────────                    ───────────────              ──────────
Counter.increment()  ──▶  Exposes /actuator/prometheus  ◀──  Scrapes every 15s
                          in Prometheus text format           Stores time-series data
                                                             Query via PromQL
                                                             View in Grafana
```

**What the metrics endpoint looks like** (`GET /actuator/prometheus`):

```
# HELP notifications_created_total Total notifications created
# TYPE notifications_created_total counter
notifications_created_total 42.0

# HELP emails_sent_total Emails successfully sent
# TYPE emails_sent_total counter
emails_sent_total 15.0

# HELP jvm_memory_used_bytes JVM memory usage
# TYPE jvm_memory_used_bytes gauge
jvm_memory_used_bytes{area="heap",id="G1 Eden Space"} 1.2345678E7
```

**Custom metrics in our code:**

```java
// In the constructor — register a counter
this.notificationsCreated = Counter.builder("notifications.created")
    .description("Total notifications created")
    .register(meterRegistry);

// In business logic — increment it
notificationsCreated.increment();
```

Spring Boot Actuator automatically adds dozens of metrics (JVM memory, GC, HTTP latency, Kafka
consumer lag, connection pool stats) with zero config.

**Prometheus config** (`prometheus.yml`):

```yaml
scrape_configs:
  - job_name: 'notification-service'
    metrics_path: '/actuator/prometheus'
    scrape_interval: 15s
    static_configs:
      - targets: ['host.docker.internal:8081']
```

**Accessing Prometheus:** Visit `http://localhost:9090` → enter a query like
`notifications_created_total` → see the graph.

### SOAP Web Services

**What it is:** SOAP (Simple Object Access Protocol) is an older web service standard that uses
**XML** for messages and **WSDL** (Web Services Description Language) to describe the service
contract. It was the dominant enterprise integration approach before REST became popular.

**Why include it?** Many enterprises still run SOAP services. Understanding SOAP shows you can work
with legacy systems — a real-world skill for enterprise environments.

**SOAP vs. REST:**

| Aspect | REST | SOAP |
|--------|------|------|
| Format | JSON (usually) | XML (always) |
| Contract | OpenAPI/Swagger (optional) | WSDL (required, strict) |
| Transport | HTTP only | HTTP, SMTP, JMS, etc. |
| Standards | Lightweight | Heavy (WS-Security, WS-Transaction, etc.) |
| Tooling | Postman, curl | SoapUI, WSDL-generated clients |
| Error handling | HTTP status codes | SOAP Fault elements |

**How SOAP works in our service:**

1. We define an **XSD schema** (`ticket-verification.xsd`) — the XML equivalent of a TypeScript
   interface
2. Spring auto-generates a **WSDL** from the XSD at `/ws/ticket-verification.wsdl`
3. Our `@Endpoint` class handles incoming SOAP requests
4. Clients send XML, receive XML

**Example SOAP request:**

```xml
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/"
                  xmlns:tkt="http://gatherle.com/soap/ticket">
  <soapenv:Body>
    <tkt:verifyTicketRequest>
      <tkt:ticketId>TKT-12345</tkt:ticketId>
      <tkt:eventId>event-456</tkt:eventId>
    </tkt:verifyTicketRequest>
  </soapenv:Body>
</soapenv:Envelope>
```

**Example SOAP response:**

```xml
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/">
  <soapenv:Body>
    <ns2:verifyTicketResponse xmlns:ns2="http://gatherle.com/soap/ticket">
      <ns2:valid>true</ns2:valid>
      <ns2:holderName>Demo Attendee</ns2:holderName>
      <ns2:eventName>Gatherle Launch Party</ns2:eventName>
      <ns2:ticketType>GENERAL_ADMISSION</ns2:ticketType>
      <ns2:message>Ticket verified successfully</ns2:message>
    </ns2:verifyTicketResponse>
  </soapenv:Body>
</soapenv:Envelope>
```

### Docker & Docker Compose

**What is Docker?** A tool that packages your application and all its dependencies into a
**container** — a lightweight, isolated environment that runs consistently on any machine.

Think of it as a shipping container for software: it doesn't matter what's inside or what ship it's
on — the container interface is standard.

**Key concepts:**

| Concept | What it is |
|---------|-----------|
| **Image** | A read-only template (recipe). Built from a `Dockerfile`. Like a snapshot |
| **Container** | A running instance of an image. Like a VM but much lighter (shares the host kernel) |
| **Dockerfile** | Instructions for building an image. Like a Makefile for containers |
| **Volume** | Persistent storage that survives container restarts |
| **Port mapping** | `-p 8081:8081` maps container port to host port |

**Our Dockerfile (multi-stage build):**

```dockerfile
# Stage 1: Build (uses full Maven + JDK image — large, ~400MB)
FROM maven:3.9-eclipse-temurin-21-alpine AS build
WORKDIR /app
COPY pom.xml .
RUN mvn dependency:go-offline -B       # Download deps (cached layer)
COPY src ./src
RUN mvn package -DskipTests -B         # Compile and build .jar

# Stage 2: Run (uses slim JRE image — small, ~100MB)
FROM eclipse-temurin:21-jre-alpine
WORKDIR /app
COPY --from=build /app/target/*.jar app.jar
EXPOSE 8081
ENTRYPOINT ["java", "-jar", "app.jar"]
```

Multi-stage builds mean the final image **only contains the JRE and your .jar** — no Maven, no
source code, no build tools. The production image is small and secure.

**What is Docker Compose?** A tool for defining and running **multi-container applications**. Instead
of running 4 separate `docker run` commands, you define everything in `docker-compose.yml` and run
`docker compose up`.

**Our `docker-compose.yml` defines 4 services:**

| Service | Image | Port | Purpose |
|---------|-------|------|---------|
| `postgres` | `postgres:16-alpine` | 5432 | Relational database for storing notifications |
| `kafka` | `apache/kafka:3.8.0` | 9092 | Event streaming — receives events from Node.js API |
| `activemq` | `apache/activemq-classic:6.1.4` | 61616, 8161 | JMS broker for email delivery queue |
| `prometheus` | `prom/prometheus:v2.53.0` | 9090 | Metrics collection and monitoring |

**Key Docker Compose features we use:**

```yaml
services:
  postgres:
    image: postgres:16-alpine          # Use this Docker image
    ports:
      - "5432:5432"                    # host:container port mapping
    environment:
      POSTGRES_DB: gatherle_notifications  # Env vars passed to container
    volumes:
      - pgdata:/var/lib/postgresql/data    # Persistent storage
    healthcheck:                            # Docker checks if service is ready
      test: ["CMD-SHELL", "pg_isready -U gatherle"]
      interval: 5s
      retries: 5

volumes:
  pgdata:    # Named volume — persists across docker compose down/up
```

### OpenAPI / Swagger

**What it is:** OpenAPI (formerly Swagger) is a specification for describing REST APIs. It generates:

- **Interactive documentation** (Swagger UI) — try API calls from the browser
- **Machine-readable schema** — importable into Postman, code generators
- **Client SDKs** — auto-generated in any language

**How we use it:** The `springdoc-openapi` library scans our `@RestController` classes and their
annotations to auto-generate the OpenAPI spec. We enhance the docs with annotations:

```java
@Operation(summary = "Get notifications for a user")  // endpoint description
@Tag(name = "Notifications")                          // group in Swagger UI
```

**URLs (when app is running):**

| URL | What you see |
|-----|-------------|
| `http://localhost:8081/swagger-ui.html` | Interactive Swagger UI |
| `http://localhost:8081/v3/api-docs` | Raw OpenAPI JSON spec |
| `http://localhost:8081/v3/api-docs.yaml` | Raw OpenAPI YAML spec |

You can copy the JSON URL into **Postman** → Import → Link to get a ready-to-use collection.

---

## Project Structure

```
apps/notification-service/
├── pom.xml                          ← Maven build file (like package.json)
├── docker-compose.yml               ← Infrastructure containers
├── Dockerfile                       ← Production container build
├── prometheus.yml                   ← Prometheus scrape config
├── .gitignore
│
└── src/
    ├── main/
    │   ├── java/com/gatherle/notification/
    │   │   ├── NotificationServiceApplication.java     ← Entry point (@SpringBootApplication)
    │   │   │
    │   │   ├── config/
    │   │   │   ├── JmsConfig.java                      ← ActiveMQ/JMS configuration
    │   │   │   └── WebServiceConfig.java               ← SOAP/WSDL configuration
    │   │   │
    │   │   ├── consumer/
    │   │   │   └── NotificationEventConsumer.java       ← Kafka listeners (3 topics)
    │   │   │
    │   │   ├── controller/
    │   │   │   ├── NotificationController.java          ← REST GET/PATCH endpoints
    │   │   │   └── NotificationPublishController.java   ← REST POST (bypass Kafka)
    │   │   │
    │   │   ├── dto/
    │   │   │   ├── NotificationEvent.java               ← Kafka message shape
    │   │   │   ├── NotificationResponse.java            ← REST response (Java record)
    │   │   │   └── EmailDeliveryRequest.java            ← JMS message shape
    │   │   │
    │   │   ├── entity/
    │   │   │   ├── Notification.java                    ← JPA entity → notifications table
    │   │   │   └── DeliveryLog.java                     ← JPA entity → delivery_logs table
    │   │   │
    │   │   ├── jms/
    │   │   │   ├── EmailQueueProducer.java              ← Puts emails on ActiveMQ queue
    │   │   │   └── EmailQueueConsumer.java              ← Reads from queue, sends email
    │   │   │
    │   │   ├── repository/
    │   │   │   ├── NotificationRepository.java          ← JPA data access (auto-SQL)
    │   │   │   └── DeliveryLogRepository.java           ← JPA data access (delivery tracking)
    │   │   │
    │   │   ├── service/
    │   │   │   └── NotificationService.java             ← Core business logic
    │   │   │
    │   │   └── soap/
    │   │       ├── TicketVerificationEndpoint.java       ← SOAP endpoint
    │   │       └── TicketVerificationTypes.java          ← JAXB request/response types
    │   │
    │   └── resources/
    │       ├── application.yml                          ← Main config (ports, DB, Kafka, etc.)
    │       ├── db/migration/
    │       │   └── V1__create_notifications_tables.sql  ← Flyway migration
    │       └── wsdl/
    │           └── ticket-verification.xsd              ← SOAP schema definition
    │
    └── test/
        ├── java/com/gatherle/notification/
        │   └── NotificationServiceApplicationTests.java ← Integration test (embedded Kafka + H2)
        └── resources/
            └── application-test.yml                     ← Test config (H2, embedded broker)
```

**How to read this structure:**

- `src/main/java/` — Your application source code. The package path
  (`com/gatherle/notification/`) matches the Java `package` declaration.
- `src/main/resources/` — Config files, SQL migrations, schemas. Anything non-Java that the app
  needs.
- `src/test/java/` — Test code. Mirrors the main source structure.
- `src/test/resources/` — Test-specific config.
- `target/` — Build output (created by Maven, gitignored).

---

## How the Code Works

### Application Entry Point

[NotificationServiceApplication.java](src/main/java/com/gatherle/notification/NotificationServiceApplication.java)

```java
@SpringBootApplication  // Combination of 3 annotations:
                        //   @Configuration — this class can define beans
                        //   @EnableAutoConfiguration — Spring configures itself from classpath
                        //   @ComponentScan — scans this package and subpackages for @Service, @Component, etc.
@EnableKafka            // Activates @KafkaListener annotation processing
@EnableJms              // Activates @JmsListener annotation processing
public class NotificationServiceApplication {
  public static void main(String[] args) {
    SpringApplication.run(NotificationServiceApplication.class, args);
  }
}
```

When `main()` runs, Spring Boot:

1. Scans `com.gatherle.notification` and all sub-packages
2. Finds all `@Service`, `@Component`, `@Repository`, `@Controller`, `@Configuration` classes
3. Creates instances of each (resolving constructor dependencies automatically)
4. Starts the embedded Tomcat web server on port 8081
5. Connects to Kafka, PostgreSQL, ActiveMQ
6. Begins listening for Kafka messages and HTTP requests

### Kafka Consumer

[NotificationEventConsumer.java](src/main/java/com/gatherle/notification/consumer/NotificationEventConsumer.java)

This class has **three methods**, each listening to a different Kafka topic:

| Method | Topic | Events |
|--------|-------|--------|
| `handleEventNotification` | `gatherle.notifications.events` | Event reminders, cancellations, updates, RSVPs |
| `handleSocialNotification` | `gatherle.notifications.social` | Follows, friend requests, mentions |
| `handleOrgNotification` | `gatherle.notifications.org` | Org invites, role changes, removals |

Each method:

1. Receives the raw JSON string from Kafka
2. Deserializes it to a `NotificationEvent` DTO using Jackson's `ObjectMapper`
3. Calls `notificationService.processEvent(event)` — the shared business logic
4. Increments a Prometheus counter on success or failure

### Notification Service (Business Logic)

[NotificationService.java](src/main/java/com/gatherle/notification/service/NotificationService.java)

The core of the application. `processEvent()`:

1. Creates a `Notification` JPA entity from the event data
2. Saves it to PostgreSQL via the repository (`notificationRepository.save()`)
3. Increments the `notifications.created` Prometheus counter
4. Checks if the notification type is email-eligible (reminders, cancellations, org invites)
5. If yes → dispatches to the JMS email queue via `EmailQueueProducer`

Other methods handle the REST API reads:

- `getNotifications()` — paginated query for a user
- `getUnreadNotifications()` — same, filtered to unread
- `getUnreadCount()` — count of unread notifications
- `markAsRead()` / `markAllAsRead()` — state mutation

### JMS Email Pipeline

**Producer** →
[EmailQueueProducer.java](src/main/java/com/gatherle/notification/jms/EmailQueueProducer.java)

Builds an `EmailDeliveryRequest` (notification ID, recipient, subject, body) and sends it to the
`gatherle.email.delivery` ActiveMQ queue. The subject is determined by a Java 21 switch expression
based on notification type.

**Consumer** →
[EmailQueueConsumer.java](src/main/java/com/gatherle/notification/jms/EmailQueueConsumer.java)

Picks up messages from the queue and:

1. Looks up the original `Notification` entity
2. Creates a `DeliveryLog` entry (tracks attempt count, status, timestamps)
3. Simulates email delivery (TODO: integrate with SES/SendGrid)
4. Marks delivery as `DELIVERED` or `FAILED`
5. Increments Prometheus counters (`emails.sent` or `emails.failed`)

### REST Controllers

**Notifications API** →
[NotificationController.java](src/main/java/com/gatherle/notification/controller/NotificationController.java)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/notifications/{recipientId}` | Paginated list of all notifications |
| GET | `/api/v1/notifications/{recipientId}/unread` | Unread notifications only |
| GET | `/api/v1/notifications/{recipientId}/unread/count` | Count of unread |
| PATCH | `/api/v1/notifications/{id}/read` | Mark one as read |
| PATCH | `/api/v1/notifications/{recipientId}/read-all` | Mark all as read |

**Publish API** →
[NotificationPublishController.java](src/main/java/com/gatherle/notification/controller/NotificationPublishController.java)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/notifications` | Create a notification directly (bypasses Kafka) |

This is useful for testing without Kafka running. Uses Jakarta Bean Validation
(`@Valid`, `@NotBlank`) to validate the request body.

### SOAP Endpoint

[TicketVerificationEndpoint.java](src/main/java/com/gatherle/notification/soap/TicketVerificationEndpoint.java)

A SOAP web service at `/ws` that verifies event tickets. Currently simulated — validates that the
ticket ID starts with `TKT-`.

[TicketVerificationTypes.java](src/main/java/com/gatherle/notification/soap/TicketVerificationTypes.java)

JAXB-annotated request/response classes. JAXB (Jakarta XML Binding) converts between Java objects
and XML — the SOAP equivalent of Jackson for JSON.

### Data Layer (Entities & Repositories)

**Entities** are JPA-annotated classes that map to database tables:

- [Notification.java](src/main/java/com/gatherle/notification/entity/Notification.java) →
  `notifications` table
- [DeliveryLog.java](src/main/java/com/gatherle/notification/entity/DeliveryLog.java) →
  `delivery_logs` table

The `DeliveryLog` has a `@ManyToOne` relationship to `Notification` — one notification can have
multiple delivery attempts.

**Repositories** extend `JpaRepository<EntityType, IdType>` and get CRUD operations for free:

```java
// These methods exist automatically (from JpaRepository):
save(entity)           // INSERT or UPDATE
findById(id)           // SELECT by primary key
findAll()              // SELECT *
deleteById(id)         // DELETE by primary key
count()                // SELECT COUNT(*)

// These are generated from method name (Spring Data magic):
findByRecipientIdOrderByCreatedAtDesc(...)    // builds the SQL from the method name
countByRecipientIdAndRead(...)                // same — parses method name into WHERE clause
```

### Configuration Classes

[JmsConfig.java](src/main/java/com/gatherle/notification/config/JmsConfig.java)

Configures:

- `ActiveMQConnectionFactory` — connection to the ActiveMQ broker
- `MappingJackson2MessageConverter` — serializes JMS messages as JSON (not default Java
  serialization)
- `JmsTemplate` — the producer template for sending messages
- `JmsListenerContainerFactory` — configures concurrency for consumers (`1-3` threads)

[WebServiceConfig.java](src/main/java/com/gatherle/notification/config/WebServiceConfig.java)

Configures:

- `MessageDispatcherServlet` — routes SOAP requests to `/ws/*`
- `DefaultWsdl11Definition` — auto-generates WSDL from the XSD schema
- Binds the XSD at `/ws/ticket-verification.wsdl`

---

## Getting Started

### Prerequisites

| Tool | Check command | Install |
|------|--------------|---------|
| Java 21 | `java --version` | `sudo apt install default-jdk` |
| Maven | `mvn --version` | `sudo apt install maven` |
| Docker | `docker --version` | `sudo apt install docker.io` |
| Docker Compose | `docker compose version` | Included with Docker |

If Docker gives "permission denied", run:

```bash
sudo usermod -aG docker $USER && newgrp docker
```

### Start Infrastructure

From the `apps/notification-service` directory:

```bash
# Start PostgreSQL, Kafka, ActiveMQ, and Prometheus
docker compose up -d

# Verify all 4 containers are running and healthy
docker compose ps
```

Wait until all services show `healthy` status (takes ~30 seconds).

### Build & Run the App

```bash
# Compile the project (first time downloads dependencies — ~2 minutes)
mvn compile

# Start the application
mvn spring-boot:run
```

You should see output ending with:

```
Started NotificationServiceApplication in X.XXX seconds
```

### Test It Out

**1. Create a notification (REST API — bypasses Kafka):**

```bash
curl -s -X POST http://localhost:8081/api/v1/notifications \
  -H "Content-Type: application/json" \
  -d '{
    "type": "EVENT_REMINDER_24H",
    "actorId": "system",
    "recipientId": "user-abc-123",
    "referenceId": "event-789",
    "referenceType": "EVENT",
    "message": "Your event Jazz Night starts in 24 hours!"
  }' | jq
```

**2. Get notifications for a user:**

```bash
curl -s http://localhost:8081/api/v1/notifications/user-abc-123 | jq
```

**3. Get unread count:**

```bash
curl -s http://localhost:8081/api/v1/notifications/user-abc-123/unread/count
```

**4. Mark a notification as read:**

```bash
curl -s -X PATCH http://localhost:8081/api/v1/notifications/1/read | jq
```

**5. Publish a Kafka message (using the Kafka CLI inside the container):**

```bash
docker exec -it gatherle-kafka /opt/kafka/bin/kafka-console-producer.sh \
  --broker-list localhost:9092 \
  --topic gatherle.notifications.events

# Then type this JSON and press Enter:
{"type":"EVENT_CANCELLED","actorId":"organizer-1","recipientId":"user-abc-123","referenceId":"event-789","referenceType":"EVENT","message":"Jazz Night has been cancelled"}
# Press Ctrl+C to exit
```

**6. Check Prometheus metrics:**

```bash
curl -s http://localhost:8081/actuator/prometheus | grep -E "notifications_created|emails"
```

**7. Test the SOAP endpoint:**

```bash
curl -X POST http://localhost:8081/ws \
  -H "Content-Type: text/xml" \
  -d '<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/"
                        xmlns:tkt="http://gatherle.com/soap/ticket">
    <soapenv:Body>
      <tkt:verifyTicketRequest>
        <tkt:ticketId>TKT-12345</tkt:ticketId>
        <tkt:eventId>event-789</tkt:eventId>
      </tkt:verifyTicketRequest>
    </soapenv:Body>
  </soapenv:Envelope>'
```

**8. Open UIs in the browser:**

| URL | What |
|-----|------|
| `http://localhost:8081/swagger-ui.html` | Swagger interactive API docs |
| `http://localhost:8081/actuator/health` | Health check |
| `http://localhost:9090` | Prometheus query UI |
| `http://localhost:8161` | ActiveMQ web console (admin/admin) |

---

## Testing

Tests use an **embedded environment** — no Docker needed:

- **H2** in-memory database replaces PostgreSQL
- **Embedded Kafka** replaces the Docker Kafka container
- **Embedded ActiveMQ** (`vm://` broker URL) replaces the Docker ActiveMQ container
- Flyway is disabled (JPA `create-drop` manages the schema)

```bash
# Run all tests
mvn test

# Run a specific test class
mvn test -Dtest=NotificationServiceApplicationTests

# Run with verbose output
mvn test -X
```

The test config is in
[application-test.yml](src/test/resources/application-test.yml),
activated by `@ActiveProfiles("test")` on the test class.

---

## Code Formatting

We use **Spotless** with **Google Java Format** (2-space indentation) — the Java equivalent of
Prettier.

```bash
# Check formatting (fails if files are unformatted)
mvn spotless:check

# Auto-fix formatting
mvn spotless:apply
```

The style is configured in `pom.xml`:

```xml
<googleJavaFormat>
  <version>1.25.2</version>
  <style>GOOGLE</style>   <!-- 2-space indent -->
</googleJavaFormat>
```

---

## Docker Production Build

```bash
# Build the Docker image
docker build -t gatherle/notification-service .

# Run it (connecting to the Docker Compose infrastructure)
docker run -p 8081:8081 \
  --network notification-service_default \
  -e SPRING_DATASOURCE_URL=jdbc:postgresql://postgres:5432/gatherle_notifications \
  -e SPRING_KAFKA_BOOTSTRAP_SERVERS=kafka:9092 \
  -e SPRING_ACTIVEMQ_BROKER_URL=tcp://activemq:61616 \
  gatherle/notification-service
```

---

## Monitoring Dashboard

Once the app is running and producing notifications, visit **Prometheus** at
`http://localhost:9090` and try these queries:

| PromQL Query | What it shows |
|-------------|---------------|
| `notifications_created_total` | Total notifications processed |
| `emails_sent_total` | Successful email deliveries |
| `emails_failed_total` | Failed email deliveries |
| `rate(notifications_created_total[5m])` | Notifications per second (5m average) |
| `jvm_memory_used_bytes{area="heap"}` | JVM heap memory usage |
| `http_server_requests_seconds_count` | Total HTTP requests served |
| `kafka_consumer_records_consumed_total` | Kafka messages consumed |

---

## How This Fits Into Gatherle

This service is designed to integrate with the existing Gatherle platform:

```
┌──────────────────────────────────────────────────────────────────┐
│                     Gatherle Platform                            │
│                                                                  │
│  ┌─────────────────┐          ┌───────────────────────────────┐  │
│  │  Next.js Webapp │◀── GQL ─▶│  Node.js GraphQL API          │  │
│  │  (apps/webapp)  │          │  (apps/api)                   │  │
│  └─────────────────┘          │                               │  │
│                               │  When things happen:          │  │
│                               │  • User RSVPs → publish Kafka │  │
│                               │  • Event cancelled → Kafka    │  │
│                               │  • Org invite → Kafka         │  │
│                               └───────────┬───────────────────┘  │
│                                           │                      │
│                                     Kafka topics                 │
│                                           │                      │
│                               ┌───────────▼───────────────────┐  │
│                               │  Java Notification Service    │  │
│                               │  (apps/notification-service)  │  │
│                               │                               │  │
│                               │  • Stores notifications (PG)  │  │
│                               │  • Sends emails (JMS→ActiveMQ)│  │
│                               │  • Exposes REST API for reads │  │
│                               │  • Metrics via Prometheus     │  │
│                               └───────────────────────────────┘  │
│                                                                  │
│  ┌─────────────────┐                                             │
│  │  MongoDB         │  ← Existing user/event data (apps/api)     │
│  └─────────────────┘                                             │
│  ┌─────────────────┐                                             │
│  │  PostgreSQL      │  ← Notification data (this service)        │
│  └─────────────────┘                                             │
└──────────────────────────────────────────────────────────────────┘
```

**Integration points planned:**

1. **Node.js Kafka Producer** — Add a Kafka producer to `apps/api` that publishes events when users
   RSVP, organizers cancel events, etc.
2. **Webapp notification bell** — The Next.js app can call this service's REST API (or go through
   the GraphQL API as a proxy) to show a notification count badge and dropdown.
3. **Real email delivery** — Replace the simulated email with AWS SES or SendGrid.
4. **WebSocket push** — The existing WebSocket infrastructure in `apps/api` can forward real-time
   notifications to connected clients.

---

## What's Next

Planned additions for Day 2:

| Tool | What we'll build |
|------|-----------------|
| **Kubernetes** | K8s manifests (Deployment, Service, ConfigMap, HPA) for deploying this service |
| **Terraform** | IaC for provisioning AWS resources (MSK for Kafka, RDS for PostgreSQL, SQS as JMS alternative) |
| **Angular** | Admin dashboard for viewing notifications, monitoring metrics, and managing delivery |
| **Kafka Producer** | Add event publishing to the Node.js GraphQL API |

---

## Quick Reference Card

```
BUILD & RUN
  mvn compile                    Compile source code
  mvn spring-boot:run            Start the application
  mvn test                       Run tests
  mvn package                    Build .jar artifact
  mvn spotless:apply             Format code (Prettier equivalent)

DOCKER
  docker compose up -d           Start all infrastructure
  docker compose ps              Check container status
  docker compose logs kafka      View Kafka logs
  docker compose down            Stop everything
  docker compose down -v         Stop + delete data volumes

ENDPOINTS (app on :8081)
  GET  /swagger-ui.html                            Swagger UI
  GET  /actuator/health                            Health check
  GET  /actuator/prometheus                        Raw metrics
  GET  /api/v1/notifications/{userId}              User's notifications
  GET  /api/v1/notifications/{userId}/unread       Unread only
  GET  /api/v1/notifications/{userId}/unread/count Unread count
  POST /api/v1/notifications                       Create notification
  PATCH /api/v1/notifications/{id}/read            Mark as read
  PATCH /api/v1/notifications/{userId}/read-all    Mark all as read
  POST /ws                                         SOAP ticket verification

EXTERNAL UIS
  http://localhost:9090          Prometheus
  http://localhost:8161          ActiveMQ Console (admin/admin)
```
