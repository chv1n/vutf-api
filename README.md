# Verification System for Undergraduate Thesis Format : API Service

<p align="left">
  A comprehensive NestJS backend system for managing thesis projects, advisor assignments, submissions, and inspections in academic institutions.
</p>

<p align="center">
  <img alt="Node" src="https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen" />
  <img alt="NestJS" src="https://img.shields.io/badge/nestjs-%5E11.0.1-red" />
  <img alt="TypeScript" src="https://img.shields.io/badge/typescript-%5E5.0.0-blue" />
  <img alt="PostgreSQL" src="https://img.shields.io/badge/postgres-%3E%3D15-336791" />
</p>

---

## Key Features at a Glance

- JWT-based Authentication with OTP verification and password reset
- Role-Based Access Control (Admin, Instructor, Student) with fine-grained permissions
- Thesis Group Management - Formation, tracking, and approval workflows
- Submission System - PDF file uploads with verification rounds (max 50MB)
- Inspection Rounds - Time-windowed submission periods by academic year/term
- Advisor Assignment - Automatic assignment and tracking
- Dashboard & Analytics - Real-time progress tracking and statistics
- Real-time Notifications - WebSocket-based instant updates (Socket.io)
- Async Job Processing - RabbitMQ queue for PDF verification
- Secure File Storage - S3-compatible storage (MinIO, AWS S3, etc.)
- Email Service - OTP and notifications via Nodemailer + Handlebars templates
- Audit Logging - Complete activity trail with IP tracking
- Document Configuration - Dynamic document settings with Redis caching

---

## Prerequisites

Before you begin, ensure you have the following installed:

- Node.js v18 or higher
- npm or yarn package manager
- PostgreSQL v15 (or use Docker Compose)
- Redis v7 (or use Docker Compose)
- RabbitMQ v3 (or use Docker Compose)
- S3-compatible Storage (MinIO, AWS S3, etc., or use Docker Compose)
- Docker & Docker Compose (recommended for quick setup)

---

## Quick Start

### 1. Clone & Install Dependencies

```bash
git clone <repository-url>
cd vutf-api
npm install
```

### 2. Environment Configuration

Create a `.env` file in the root directory:

```bash
cp .env.example .env
```

Then edit `.env` with your configuration (see Configuration section).

### 3. Start Services with Docker Compose (Recommended)

```bash
docker-compose up -d
```

This will start:
- PostgreSQL (port 5434)
- Redis (port 6379)
- RabbitMQ (port 5672 + 15672 for UI)
- MinIO/Storage (port 9000 + 9001 for console)
- Adminer (port 8080) for database GUI

### 4. Run Database Migrations

```bash
npm run migration:run
```

### 5. Seed Database with Sample Data (Optional)

```bash
npm run seed
```

### 6. Start the Application

```bash
# Development mode (with hot reload)
npm run start:dev

# Production build
npm run build
npm run start:prod
```

The API will be available at http://localhost:3000/api/v1

---

## Technology Stack

| Category | Technology | Purpose |
|----------|-----------|---------|
| **Framework** | NestJS v11.0.1 | Progressive Node.js framework |
| **Language** | TypeScript | Type-safe development |
| **Database** | PostgreSQL 15 + TypeORM | Relational data storage & ORM |
| **Authentication** | Passport.js + JWT + bcrypt | Secure user authentication |
| **Real-time** | Socket.io (@nestjs/websockets) | WebSocket-based notifications |
| **Caching** | Redis + ioredis | In-memory cache for tokens & OTP |
| **Message Queue** | RabbitMQ + @golevelup/nestjs-rabbitmq | Async job processing |
| **File Storage** | S3-compatible (MinIO, AWS S3, etc.) | Object storage |
| **Email** | Nodemailer + Handlebars | Email/OTP delivery |
| **File Processing** | ExcelJS, PDFMake, Archiver | Document generation |
| **HTTP Client** | Axios | External API calls |
| **Validation** | class-validator | DTO validation |
| **Scheduling** | @nestjs/schedule | Task scheduling |
| **Testing** | Jest + Supertest | Unit & E2E testing |
| **Linting** | ESLint + Prettier | Code quality |

---

## Configuration & Environment Variables

Create a `.env` file in the root with the following variables:

| Variable | Default | Description |
|----------|---------|-------------|
| **PORT** | 3000 | Application port |
| **NODE_ENV** | development | Environment (development/production) |
| **FRONTEND_URL** | http://localhost:5173 | Frontend URL for CORS |
| **DB_HOST** | localhost | PostgreSQL host |
| **DB_PORT** | 5432 | PostgreSQL port |
| **DB_USERNAME** | postgres | Database username |
| **DB_PASSWORD** | postgres | Database password |
| **DB_DATABASE** | vutf_db | Database name |
| **REDIS_HOST** | localhost | Redis host |
| **REDIS_PORT** | 6379 | Redis port |
| **REDIS_PASSWORD** | *(empty)* | Redis password (if auth required) |
| **JWT_ACCESS_SECRET** | *(required)* | Secret key for access tokens |
| **JWT_REFRESH_SECRET** | *(required)* | Secret key for refresh tokens |
| **JWT_ACCESS_EXPIRE** | 15m | Access token expiration |
| **JWT_REFRESH_EXPIRE** | 7d | Refresh token expiration |
| **MAIL_HOST** | smtp.gmail.com | SMTP server host |
| **MAIL_PORT** | 587 | SMTP port |
| **MAIL_USER** | *(required)* | Email address for sending |
| **MAIL_PASSWORD** | *(required)* | Email password/app-password |
| **MAIL_FROM** | "No Reply" <noreply@example.com> | From email address |
| **STORAGE_ENDPOINT** | localhost | Storage endpoint (S3, MinIO, etc.) |
| **STORAGE_PORT** | 9000 | Storage port |
| **STORAGE_USE_SSL** | false | Use SSL/TLS |
| **STORAGE_ROOT_USER** | minioadmin | Storage root user |
| **STORAGE_ROOT_PASSWORD** | minioadmin | Storage root password |
| **STORAGE_ACCESS_KEY** | *(required)* | Storage access key |
| **STORAGE_SECRET_KEY** | *(required)* | Storage secret key |
| **STORAGE_BUCKET** | submissions | Default bucket name |
| **STORAGE_REGION** | us-east-1 | Storage region |
| **RABBITMQ_HOST** | localhost | RabbitMQ host |
| **RABBITMQ_PORT** | 5672 | RabbitMQ port |
| **RABBITMQ_USER** | guest | RabbitMQ username |
| **RABBITMQ_PASSWORD** | guest | RabbitMQ password |
| **RABBITMQ_JOB_QUEUE** | pdf_verification_jobs | PDF job queue name |
| **RABBITMQ_RESULT_QUEUE** | pdf_verification_results | Result queue name |
| **UPLOAD_MAX_FILE_SIZE** | 52428800 | Max file size in bytes (50MB) |

---

## Database

### Core Entities

| Entity | Purpose |
|--------|---------|
| `user_account` | User authentication with roles (admin, instructor, student) |
| `student` | Student profile linked to user account |
| `instructor` | Instructor profile linked to user account |
| `thesis_group` | Student thesis group (statuses: incomplete → pending → approved/rejected) |
| `group_member` | Group membership tracking with member status |
| `thesis` | Core thesis/capstone project entity |
| `thesis_topic` | Pre-defined thesis topics for selection |
| `advisor_assignment` | Advisor-to-group assignments |
| `submissions` | File submissions (statuses: pending → verified/rejected) |
| `inspection_round` | Submission deadline periods (year/term/round based) |
| `report_file` | Generated reports and outputs |
| `notifications` | User notifications |
| `audit_log` | Complete audit trail of user actions |
| `permissions` | Fine-grained access control permissions |
| `user_permissions` | Many-to-many: user to permissions mapping |

### Database Migrations

```bash
# Generate new migration
npm run migration:generate

# Run pending migrations
npm run migration:run

# Revert last migration
npm run migration:revert
```

---

## API Endpoints Overview

All endpoints are prefixed with `/api/v1`

### Authentication (`/auth`)
- `POST /auth/login` - User login with email/password
- `POST /auth/logout` - User logout
- `POST /auth/refresh` - Refresh JWT tokens
- `POST /auth/request-otp` - Request OTP for registration
- `POST /auth/verify-otp` - Verify registration OTP
- `POST /auth/register` - User registration
- `POST /auth/forgot-password` - Initiate password reset
- `POST /auth/reset-password` - Complete password reset
- `GET /auth/me` - Get current user profile

### User Management (`/users`)
- `GET /users` - List all users (admin only)
- `GET /users/:id` - Get user by ID
- `PUT /users/:id` - Update user profile
- `DELETE /users/:id` - Deactivate user account

### Thesis Groups (`/thesis-group`)
- `POST /thesis-group` - Create thesis group
- `GET /thesis-group` - List thesis groups
- `GET /thesis-group/:id` - Get group details
- `PUT /thesis-group/:id` - Update group
- `POST /thesis-group/:id/submit-for-approval` - Submit for approval
- `POST /thesis-group/:id/approve` - Approve group (advisor)
- `POST /thesis-group/:id/reject` - Reject group (advisor)

### Submissions (`/submissions`)
- `POST /submissions` - Submit file (student, max 50MB PDF)
- `GET /submissions` - List submissions
- `GET /submissions/:id` - Get submission details
- `GET /submissions/:id/file` - Download submission file
- `GET /submissions/group/:groupId` - Get group submissions
- `POST /submissions/:id/verify` - Verify submission (instructor)
- `POST /submissions/:id/reject` - Reject submission (instructor)

### Inspection Rounds (`/inspection-rounds`)
- `GET /inspection-rounds` - List inspection rounds
- `POST /inspection-rounds` - Create inspection round (admin)
- `PUT /inspection-rounds/:id` - Update round
- `DELETE /inspection-rounds/:id` - Delete round

### Dashboard (`/dashboard`)
- `GET /dashboard` - Get dashboard analytics
- `GET /dashboard/statistics` - Get system statistics

### Additional Modules
- `/student` - Student profile management
- `/instructor` - Instructor profile management
- `/advisor-assignment` - Advisor assignments
- `/announcements` - System announcements
- `/audit-logs` - Activity audit trail
- `/notifications` - Real-time notifications

---

## Key Features & Workflows

### 1. Thesis Group Formation Workflow
```
Group Creation → Add Members → Select Topic → 
Submit for Approval → Pending Status → 
Approved/Rejected by Advisor
```

### 2. Submission & Verification Process
```
Active Inspection Round → Student Uploads PDF → 
Pending Verification → Async PDF Processing via RabbitMQ → 
Verified/Rejected Result → Notification Sent
```

### 3. Real-time Notifications
- WebSocket (Socket.io) connection for instant updates
- Events: new submission, verification result, approval status
- Automatic reconnection with exponential backoff

### 4. Async PDF Processing
- RabbitMQ job queue (`pdf_verification_jobs`)
- Background workers verify PDF integrity
- Results sent to `pdf_verification_results` queue
- User notified via WebSocket upon completion

### 5. File Storage & Access Control
- Files stored securely in S3-compatible storage
- Pre-signed URLs for download links (time-limited)
- Access control: only group members and advisors can download
- 50MB file size limit enforced

### 6. OTP & Email Service
- Registration OTP valid for 5 minutes
- Password reset OTP valid for 5 minutes
- Rate limiting: max 3 OTP requests per 15 minutes
- Handlebars templates for professional emails

### 7. Login Attempt Rate Limiting
- Max 5 failed login attempts
- Account locked for 15 minutes after max attempts
- Unlock via admin action or time-based auto-unlock
- Complete audit trail with IP tracking

---

## Running Services with Docker Compose

Quick reference for local services:

```bash
# Start all services
docker-compose up -d

# Stop all services
docker-compose down

# View logs
docker-compose logs -f

# Rebuild containers
docker-compose build --no-cache
```

### Service Endpoints

| Service | Port | URL | Notes |
|---------|------|-----|-------|
| API | 3000 | http://localhost:3000 | NestJS backend |
| PostgreSQL | 5434 | - | Database (`vutf_db`) |
| Redis | 6379 | - | Cache store |
| RabbitMQ | 5672 | - | Message broker (AMQP) |
| RabbitMQ UI | 15672 | http://localhost:15672 | Management console (guest/guest) |
| Storage | 9000 | - | S3-compatible object storage API |
| Storage Console | 9001 | http://localhost:9001 | File browser UI (minioadmin/minioadmin) |
| Adminer | 8080 | http://localhost:8080 | Database GUI |

---

## Development

### Run Tests

```bash
# Unit tests
npm run test

# Unit tests with coverage
npm run test:cov

# E2E tests
npm run test:e2e

# Watch mode for tests
npm run test:watch
```

### Code Quality

```bash
# Lint code
npm run lint

# Format code
npm run format

# Check formatting
npm run format:check
```

### Build for Production

```bash
# Compile TypeScript
npm run build

# Run production server
npm run start:prod
```

### Database Seeding

```bash
# Seed sample data
npm run seed

# Generate migrations after model changes
npm run migration:generate
```

---

## API Documentation

The API follows RESTful conventions with structured responses.

### Response Format

**Success Response:**
```json
{
  "statusCode": 200,
  "message": "Success",
  "data": {
    "id": "uuid",
    "email": "user@example.com"
  }
}
```

**Error Response:**
```json
{
  "statusCode": 400,
  "message": "Bad Request",
  "error": "Invalid email format"
}
```

### Authentication

Include JWT token in request header:
```
Authorization: Bearer <your-jwt-token>
```

### Common Endpoints

**Login:**
```bash
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "password123"
  }'
```

**Submit File:**
```bash
curl -X POST http://localhost:3000/api/v1/submissions \
  -H "Authorization: Bearer <token>" \
  -F "file=@thesis.pdf" \
  -F "groupId=<group-id>" \
  -F "inspectionRoundId=<round-id>"
```

**Get Dashboard:**
```bash
curl -X GET http://localhost:3000/api/v1/dashboard \
  -H "Authorization: Bearer <token>"
```

For more detailed API documentation, refer to the source code comments or enable Swagger/OpenAPI if configured.

---

## Useful Commands

```bash
# Development
npm run start:dev          # Start with hot reload
npm run start              # Start normally
npm run build              # Build for production
npm run start:prod         # Production server

# Testing
npm run test               # Run unit tests
npm run test:e2e           # Run E2E tests
npm run test:cov           # Coverage report

# Database
npm run migration:run      # Run pending migrations
npm run migration:generate # Generate new migration
npm run migration:revert   # Revert last migration
npm run seed               # Seed database

# Code Quality
npm run lint               # Run ESLint
npm run format             # Format with Prettier

# Docker
docker-compose up -d       # Start services
docker-compose down        # Stop services
docker-compose logs -f     # View logs
```


