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
- **User Experience Enhancements**:
    - **Password Security**: Real-time password strength validation with visual checklist (8+ chars, uppercase, lowercase, number, special char), show/hide toggle, and password match indicators.
    - **Contextual Help**: HelpTooltip component with "?" icons providing guidance on email formats, role selection, RFID card assignments, and parent contact information.
    - **Empty States**: EmptyState component providing friendly messages, actionable buttons, and helpful guidance when no data exists (e.g., no students, no filtered results).
    - **Loading States**: LoadingState component with spinner animations and descriptive messages for better user feedback during data fetching.
    - **Interactive Onboarding**: Step-by-step guided tour with Driver.js highlighting key features for first-time users (dashboard stats, student management, device setup).
    - **Help Center**: Comprehensive FAQ page with search functionality covering student management, attendance tracking, RFID setup, email notifications, and system settings.
    - **Session Management**: Timeout warnings, logout confirmations, and enhanced validation messages throughout the system.
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
- **Driver.js**: Interactive onboarding tour library.

## Recent Updates

### Project Cleanup (October 17, 2025)
Removed all unnecessary files and folders to optimize project size:
- Removed entire `python_backend/` directory (unused - using Node.js/Express instead)
- Removed `attached_assets/` folder (50+ temporary development files)
- Removed 40+ duplicate Arduino .ino files from root (kept organized `arduino/` folder)
- Removed 30+ documentation .md files (deployment guides, setup instructions, troubleshooting)
- Removed all test and debug files (.py, .js, .bat)
- Removed unused configuration files (pyproject.toml, uv.lock, cookies.txt)
- Removed unused React pages (Dashboard.tsx, Landing.tsx)

**Result**: Clean, production-ready codebase with only essential files

## Recent Enhancements (October 17, 2025)

### Secure Password Reset System (ISO 27001 Compliant)
The password reset flow has been redesigned for better security and user experience:

**Old Design**: IT support received password reset requests via email and manually reset passwords
**New Design**: Secure token-based self-service password reset with direct user emails

1. **Token-Based Security**:
   - Cryptographically secure 32-byte random tokens
   - 1-hour expiration for security compliance
   - Single-use tokens that expire after password reset
   - Stored in dedicated `passwordResetTokens` table

2. **User Experience**:
   - Faculty receive password reset link directly via email (no IT support needed)
   - Dedicated reset password page (`/reset-password`) with real-time validation
   - Clear success/error messaging with automatic redirect to login
   - Password strength validation matching system security policy

3. **Email Communications**:
   - Professional branded email template with reset link
   - Clear 1-hour expiration notice
   - Security guidance for unauthorized requests
   - Sent to user's registered email address

4. **Compliance & Audit**:
   - ISO 27001 compliant with comprehensive audit logging
   - Password reset requests and completions tracked in audit logs
   - Strong password policy enforced (8+ chars, uppercase, lowercase, number, special char)
   - Token validation prevents replay attacks

### User-Friendly System Improvements (October 16, 2025)
The system has been enhanced to be accessible to non-technical faculty members with the following additions:

1. **Reusable UX Components**:
   - `PasswordInput`: Component with real-time validation checklist, show/hide toggle, and strength indicators
   - `HelpTooltip`: Contextual help component with "?" icons for inline guidance
   - `EmptyState`: Friendly empty state displays with actionable buttons and helpful messages
   - `LoadingState`: Professional loading indicators with descriptive messages

2. **Help & Onboarding**:
   - Interactive onboarding tour for first-time users (appears on first dashboard visit)
   - Comprehensive Help Center page with searchable FAQs covering all major features
   - Contextual tooltips throughout the system explaining technical fields in simple terms

3. **Enhanced User Flows**:
   - Students page with empty states for "no students" and "no filtered results" scenarios
   - Clear call-to-action buttons guiding users on next steps
   - Improved loading states across all pages with descriptive messages
   - Better error messages and validation feedback using everyday language

4. **Compliance Dashboard** (Admin-only):
   - Real-time compliance metrics and audit log viewer
   - GDPR compliance checklist with data retention policy details
   - ISO 27001/27701 compliance overview

These improvements ensure that faculty members of all technical skill levels can effectively use the system without confusion or frustration.