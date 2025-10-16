# CLIRDEC: PRESENCE - Attendance Monitoring System

## Overview
CLIRDEC: PRESENCE is a comprehensive attendance monitoring system for Central Luzon State University's Information Technology department. It leverages RFID technology and web-based management tools for real-time attendance tracking, automated notifications, and extensive reporting for faculty and administrators. The project aims to provide an efficient and reliable solution for managing attendance, enhancing security, and streamlining administrative tasks.

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
- **Design Elements**: Clean UI with gender-based avatars for a professional, minimalist design.

### Backend Architecture
- **Runtime**: Node.js with Express.js
- **Language**: TypeScript with Drizzle ORM
- **Database**: PostgreSQL with connection pooling
- **Authentication**: Session-based authentication with Replit Auth integration
- **WebSocket**: Real-time notifications via WebSocket server with strict CORS origin validation, dedicated endpoint for ESP32 devices.
- **Security**: Production-hardened WebSocket CORS with exact-match origin whitelist.
- **Error Handling**: Comprehensive global error handlers.
- **Memory Optimization**: Aggressive garbage collection for low memory usage.

### Key Features & Components
- **Core Entities**: Users/Professors, Students, Classrooms, Subjects, Schedules, Class Sessions, Attendance Records, Computers.
- **RFID Integration**: RFID card-based student identification with proximity sensor validation for dual validation, including real-time tap simulation.
- **Email Notification System**: Automated parent notifications for absences/tardiness and daily attendance summaries via Brevo.
- **Automation Features**: Auto-start class sessions, intelligent late arrival detection, automated session ending, computer assignment workflows.
- **IoT Device Integration**: ESP32 S3 Arduino firmware (RFID RC522 + PIR sensor) for real-time device management, auto-discovery, registration, and health monitoring.
- **Role-Based Access Control**: Separate permissions for administrators and faculty.
- **Data Integrity**: Comprehensive validation (Zod schemas), duplicate prevention, input sanitization, foreign key validation, and partial updates for all CRUD operations.
- **Security & Privacy (ISO 27001/27701 Compliance)**:
    - **Audit Logging**: Comprehensive activity tracking.
    - **Rate Limiting**: Brute force protection for logins.
    - **Password Policy**: Strong password enforcement.
    - **GDPR Compliance**: "Right to be Forgotten" with permanent deletion endpoints, privacy consent management, and data export features.
    - **Data Retention Policies**: Automated lifecycle management for various data types.
- **User Experience**: Session timeout with warnings, logout confirmations, real-time password strength indicators, show/hide password toggles, contextual help tooltips, and enhanced validation messages.
- **SEO & Internationalization**: Comprehensive SEO optimization (meta tags, structured data, robots.txt, sitemap.xml) and geo-targeting for global visibility.

### Data Flow
- **Authentication**: Faculty login via Replit Auth, session creation, dashboard access.
- **Attendance**: RFID tap, student identification, attendance record creation, real-time updates.
- **Notification**: Attendance event, rule evaluation, email queue, delivery.
- **Reporting**: Data aggregation, export generation (PDF/CSV).
- **Student Management**: Edit form pre-population, partial data updates.

### Deployment Strategy
- **Development Environment**: Replit-hosted with hot reload, PostgreSQL, Replit secrets.
- **Production Deployment**: Railway (recommended) or Replit with CI/CD via GitHub Actions.
- **Build Process**: Frontend (Vite) + Backend (ESBuild).
- **Database Management**: Drizzle Kit for schema migrations.

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

### UI & Styling
- **Radix UI**: Accessible component primitives.
- **Tailwind CSS**: Utility-first styling framework.
- **Lucide**: Icon library.