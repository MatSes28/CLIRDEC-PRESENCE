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
- **WebSocket**: Real-time notifications via WebSocket server (port 5000 for web clients, dedicated /iot for ESP32 devices)
- **Error Handling**: Comprehensive global error handlers.
- **Memory Optimization**: Aggressive garbage collection and cleanup to maintain low memory usage (targeting ~42MB optimal performance).

### Data Storage Solutions
- **Primary Database**: PostgreSQL with Drizzle ORM
- **Session Storage**: In-memory session management (for development).

### Key Components
- **Core Entities**: Users/Professors, Students, Classrooms, Subjects, Schedules, Class Sessions, Attendance Records, Computers.
- **RFID Integration**: RFID card-based student identification with proximity sensor validation for dual validation. Includes real-time tap simulation for development.
- **Email Notification System**: Automated parent notifications for absences/tardiness, daily attendance summaries via SendGrid.
- **Automation Features**: Auto-start class sessions, intelligent late arrival detection, automated session ending, computer assignment workflows.
- **IoT Device Integration**: ESP32 Arduino firmware (RFID RC522 + PIR sensor) for real-time device management via WebSocket. Includes automatic device discovery, registration, and health monitoring.
- **Role-Based Access Control**: Separate permissions for administrators (system-wide management) and faculty (class-specific actions, attendance tracking, basic reporting).

### Data Flow
- **Authentication Flow**: Faculty login → Replit Auth → Session creation → Dashboard access.
- **Attendance Flow**: RFID tap → Student identification → Attendance record creation → Real-time updates.
- **Notification Flow**: Attendance event → Rule evaluation → Email queue → SendGrid delivery.
- **Reporting Flow**: Data aggregation → Export generation (PDF/CSV).

### Deployment Strategy
- **Development Environment**: Replit-hosted with hot reload, PostgreSQL module auto-provisioning, Replit secrets for environment variables.
- **Production Deployment**: Replit autoscale target, frontend (Vite) + backend (ESBuild) build process, internal port 5000 mapped to external 80.
- **Database Management**: Drizzle Kit for schema migrations.

## External Dependencies

### Authentication & Infrastructure
- **Replit Auth**: OpenID Connect provider for faculty authentication.
- **Neon Database**: Serverless PostgreSQL hosting.
- **SendGrid**: Transactional email service.

### Development & Deployment
- **Replit**: Primary hosting and development environment.
- **Vite**: Frontend build system.
- **ESBuild**: Server-side TypeScript compilation.

### UI & Styling
- **Radix UI**: Accessible component primitives.
- **Tailwind CSS**: Utility-first styling framework.
- **Lucide**: Icon library for consistent iconography.