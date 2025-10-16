# CLIRDEC: PRESENCE - Attendance Monitoring System

## Overview
CLIRDEC: PRESENCE is a comprehensive attendance monitoring system for Central Luzon State University's Information Technology department. It leverages RFID technology and web-based management tools for real-time attendance tracking, automated notifications, and extensive reporting for faculty and administrators. The project aims to provide an efficient and reliable solution for managing attendance.

## User Preferences
Preferred communication style: Simple, everyday language.
Color theme: #2596be (rgb(37, 150, 190)) - consistent blue theme throughout system
Login design: Modern split-screen layout with enhanced branding, features showcase, and professional form design
UI Style: Modern glass effects, gradient backgrounds, professional typography, and smooth animations

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript using Vite
- **UI Framework**: Shadcn/ui components built on Radix UI
- **Styling**: Tailwind CSS with custom design system
- **State Management**: TanStack Query for server state and caching
- **Routing**: Wouter for lightweight client-side routing
- **Authentication**: Session-based authentication with Replit Auth integration
- **Design Elements**: Clean UI design with gender-based avatars (male/female character placeholders using Lucide icons) for a professional, game-like appearance. Profile pictures are removed for a minimalist design.

### Backend Architecture
- **Runtime**: Node.js with Express.js
- **Language**: TypeScript with Drizzle ORM
- **Database**: PostgreSQL with connection pooling
- **Authentication**: Session-based authentication with Replit Auth integration
- **WebSocket**: Real-time notifications via WebSocket server (port 5000 for web clients, dedicated /iot for ESP32 devices) with strict CORS origin validation
- **Security**: Production-hardened WebSocket CORS with exact-match origin whitelist. Development-only Replit domain access with pattern validation. No debug logging in production builds.
- **Error Handling**: Comprehensive global error handlers.
- **Memory Optimization**: Aggressive garbage collection and cleanup to maintain low memory usage (targeting ~42MB optimal performance).

### Data Storage Solutions
- **Primary Database**: PostgreSQL with Drizzle ORM
- **Session Storage**: In-memory session management (for development).

### Key Components
- **Core Entities**: Users/Professors, Students, Classrooms, Subjects, Schedules, Class Sessions, Attendance Records, Computers.
- **RFID Integration**: RFID card-based student identification with proximity sensor validation for dual validation. Includes real-time tap simulation for development.
- **Email Notification System**: Automated parent notifications for absences/tardiness, daily attendance summaries via Brevo.
- **Automation Features**: Auto-start class sessions, intelligent late arrival detection, automated session ending, computer assignment workflows.
- **IoT Device Integration**: ESP32 S3 Arduino firmware (RFID RC522 + PIR sensor) for real-time device management via WebSocket. Includes automatic device discovery, registration, and health monitoring.
- **Role-Based Access Control**: Separate permissions for administrators (system-wide management) and faculty (class-specific actions, attendance tracking, basic reporting).

### Data Flow
- **Authentication Flow**: Faculty login → Replit Auth → Session creation → Dashboard access.
- **Attendance Flow**: RFID tap → Student identification → Attendance record creation → Real-time updates.
- **Notification Flow**: Attendance event → Rule evaluation → Email queue → SendGrid delivery.
- **Reporting Flow**: Data aggregation → Export generation (PDF/CSV).
- **Student Management Flow**: Edit form pre-populates with current data → User modifies specific fields → Backend validates only changed fields → Database updates partial data.

### Recent Changes (October 2025 - Production Ready)
- **Production-Ready Database**: Removed ALL demo data (students, test sessions). System starts empty with only admin/faculty and core infrastructure.
- **Automatic Schedule Population**: When faculty creates recurring schedule, system auto-generates ALL class sessions for entire semester (Philippine calendar: 1st Aug-Dec, 2nd Jan-May, Summer Jun-Jul).
- **Real Attendance Data Integration**: Parent alerting system now uses actual database queries via `getAttendanceByStudent()` with proper session date resolution - no more mock data.
- **Manual Monitoring Triggers**: Attendance monitoring and email processing disabled by default, activated via API endpoints to prevent spam: `POST /api/attendance/trigger-monitoring` and `POST /api/email/process-queue`.
- **Ghost Attendance Detection**: Fully functional validation system flags RFID-without-sensor (`ghost_tap`) and sensor-without-RFID (`sensor_without_rfid`) discrepancies within 7-second validation window.
- **Behavior-Based Parent Alerts**: Analyzes real attendance patterns (rates, consecutive absences ≥3, late arrivals ≥3/week) to queue appropriate email notifications.
- **WebSocket Security Hardening (Oct 14, 2025)**: Implemented strict CORS origin validation with exact-match whitelist to prevent subdomain bypass attacks. Replaced vulnerable `startsWith()` checks with secure `includes()` matching. Replit domains restricted to development mode only with pattern validation (`endsWith('.replit.dev')` or `endsWith('.replit.app')`).
- **Production Logging Cleanup (Oct 14, 2025)**: All debug console.log statements now conditional on environment. Server uses `NODE_ENV === 'development'`, client uses `import.meta.env.DEV`. Production builds run clean without debug overhead.
- **WebSocket Stability Improvements (Oct 14, 2025)**: Added immediate server welcome message on connection, implemented "connected" message type handling, removed connection delays. WebSocket now establishes and maintains stable connections without code 1006 errors.
- **Dependency Updates (Oct 14, 2025)**: Updated browserslist database (caniuse-lite) from 12 months outdated to latest version for accurate browser compatibility checks.
- **Railway Deployment Ready (Oct 14, 2025)**: Port configuration now uses `process.env.PORT` for Railway compatibility. GitHub Actions CI/CD workflows configured for automated deployment. Complete deployment guides created (RAILWAY_DEPLOY.md, DEPLOYMENT_CHECKLIST.md) with VS Code integration instructions.
- **Session Security Enhancements (Oct 16, 2025)**: Implemented automatic session timeout after 10 minutes of inactivity with 30-second warning dialog. Added logout confirmation dialogs for both desktop and mobile interfaces. Activity tracking monitors mouse, keyboard, scroll, and touch events for seamless user experience.
- **SEO & International Discoverability (Oct 16, 2025)**: Comprehensive SEO optimization for global search engine visibility. Added 40+ meta tags including Open Graph, Twitter Cards, structured data (JSON-LD), geo-targeting tags for Philippines, canonical URLs, and hreflang tags. Created robots.txt for search engine crawling and sitemap.xml for better indexing across Google, Bing, Yahoo, Baidu, Yandex, and DuckDuckGo. Optimized for international discovery with multi-language support.
- **CRUD & Data Integrity Improvements (Oct 16, 2025)**: Comprehensive data handling enhancements across all entities:
  - **Privacy Protection**: Removed user edit endpoint - admins can only CREATE and DELETE user accounts, cannot edit faculty passwords or personal information for privacy
  - **Soft Delete Reactivation**: System now reactivates soft-deleted accounts when recreating with same email/ID instead of blocking creation
  - **Comprehensive Validation**: Added Zod validation schemas for all create/update operations with detailed error reporting
  - **Duplicate Prevention**: Duplicate checks for student IDs, RFID cards, faculty IDs, classroom names, email addresses
  - **Input Sanitization**: Automatic trimming and case normalization for all string inputs (emails lowercase, names trimmed)
  - **Foreign Key Validation**: Validates references before creating enrollments, schedules, and related entities
  - **Standardized Errors**: Consistent error messages with field-level validation feedback
  - **Partial Updates**: All update endpoints support partial data - only provided fields are updated
- **ISO 27001/27701 Compliance Features (Oct 16, 2025)**: Implemented enterprise-grade security and privacy controls:
  - **Audit Logging System**: Comprehensive activity tracking (login, logout, create, delete, hard delete) with user ID, IP address, user agent, timestamp, and status logging via dedicated `audit_logs` table
  - **Rate Limiting**: Brute force protection with 5 failed login attempts per 15-minute window triggering account lockout, tracked in `login_attempts` table
  - **Password Policy**: Strong password enforcement requiring 8+ characters with uppercase, lowercase, number, and special character validation via Zod schema
  - **GDPR Hard Delete**: "Right to be Forgotten" compliance with permanent deletion endpoints (`/api/users/:id/permanent`, `/api/students/:id/permanent`) requiring explicit confirmation token 'PERMANENTLY_DELETE'
  - **Privacy-First Design**: Admins cannot edit user accounts (only create/delete) to protect faculty passwords and personal information
  - **Deletion Tracking**: Dedicated `deletion_requests` table for managing and auditing data removal requests
  - **Privacy Consent Management**: Full consent tracking system with `consent_logs` table to record privacy policy acceptance, email notification consent, and data processing agreements with IP/user agent logging
  - **Data Retention Policies**: Automated data lifecycle management with configurable retention periods - 5 years for attendance (academic law), 2 years for audit logs, 1 year for emails, 6 months for login attempts
  - **GDPR Data Export**: Full data portability via `/api/export/student/:id` and `/api/export/parent/:email` endpoints providing JSON export of all student data, attendance records, enrollments, and consent history

### Previous Changes (January 2025)
- **Email Integration**: Migrated from SendGrid to Brevo for email delivery using verified sender address (matt.feria@clsu2.edu.ph).
- **Student Edit Fix**: Resolved edit form validation issues - forms now pre-populate with existing data and allow partial field updates without requiring all fields.
- **Contact Parent Feature**: Successfully implemented real email sending to parent addresses via Brevo API with professional templates.
- **Dual-Mode ESP32 System**: Implemented comprehensive RFID integration with two operating modes:
  - USB Registration Mode: Direct USB connection for typing RFID UIDs into web forms during student registration
  - WiFi Attendance Mode: Wireless real-time attendance monitoring with motion detection and WebSocket communication
- **RFID Registration Helper**: Integrated web component that guides users through ESP32 setup, provides downloadable Python typing script, and automatically detects typed RFID UIDs in forms
- **Hardware Documentation**: Complete setup guide with wiring diagrams, software configuration, and troubleshooting for ESP32 S3 + RC522 RFID + PIR sensor integration
- **ESP32 S3 Migration**: Updated system configuration and documentation from ESP32-WROOM-32 to ESP32 S3 development board for improved performance and features

### Deployment Strategy
- **Development Environment**: Replit-hosted with hot reload, PostgreSQL module auto-provisioning, Replit secrets for environment variables.
- **Production Deployment Options**:
  - **Railway (Recommended)**: Auto-deploy from GitHub with CI/CD, PostgreSQL database, environment variable management, WebSocket support
  - **Replit**: Autoscale target with internal port mapping
- **Build Process**: Frontend (Vite) + Backend (ESBuild) → `dist/` directory
- **Port Configuration**: Uses `process.env.PORT` (Railway-compatible) with fallback to 5000 (Replit)
- **Database Management**: Drizzle Kit for schema migrations
- **CI/CD**: GitHub Actions workflows for automated testing and deployment

## External Dependencies

### Authentication & Infrastructure
- **Replit Auth**: OpenID Connect provider for faculty authentication.
- **Neon Database**: Serverless PostgreSQL hosting.
- **Brevo**: Transactional email service.

### Development & Deployment
- **Replit**: Primary development environment.
- **Railway**: Recommended production hosting platform.
- **GitHub Actions**: CI/CD pipeline for automated deployment.
- **Vite**: Frontend build system.
- **ESBuild**: Server-side TypeScript compilation.
- **VS Code**: Development IDE with optimized configuration.

### UI & Styling
- **Radix UI**: Accessible component primitives.
- **Tailwind CSS**: Utility-first styling framework.
- **Lucide**: Icon library for consistent iconography.