# CLIRDEC: PRESENCE - Attendance Monitoring System

## Overview

CLIRDEC: PRESENCE is a comprehensive attendance monitoring system designed for Central Luzon State University's Information Technology department. The system combines RFID technology with web-based management tools to provide real-time attendance tracking, automated notifications, and comprehensive reporting for faculty and administrators.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript using Vite for build tooling
- **UI Framework**: Shadcn/ui components built on Radix UI primitives
- **Styling**: Tailwind CSS with custom design system
- **State Management**: TanStack Query for server state and caching
- **Routing**: Wouter for lightweight client-side routing
- **Authentication**: Session-based authentication with Replit Auth integration

### Backend Architecture
- **Runtime**: Node.js with Express.js framework
- **Language**: TypeScript with ES modules
- **Database**: PostgreSQL with Drizzle ORM for type-safe database operations
- **Authentication**: Replit Auth with OpenID Connect (OIDC)
- **Session Management**: PostgreSQL-backed sessions with connect-pg-simple

### Data Storage Solutions
- **Primary Database**: PostgreSQL via Neon serverless for production scalability
- **ORM**: Drizzle ORM with schema-first approach for type safety
- **Session Storage**: PostgreSQL table-based session storage
- **Migration System**: Drizzle Kit for database schema management

## Key Components

### Core Entities
1. **Users/Professors**: Faculty authentication and profile management
2. **Students**: Student registration with RFID card association
3. **Classrooms**: Physical lab spaces with computer inventory
4. **Subjects**: Course management and scheduling
5. **Schedules**: Automated class session management
6. **Class Sessions**: Active attendance monitoring periods
7. **Attendance Records**: Real-time check-in/check-out tracking
8. **Computers**: Lab computer assignment and monitoring

### RFID Integration
- RFID card-based student identification
- Proximity sensor validation for enhanced security
- Dual validation system (RFID + proximity)
- Real-time tap simulation for development and testing

### Email Notification System
- SendGrid integration for reliable email delivery
- Automated parent notifications for absences and tardiness
- Daily attendance summaries
- Configurable notification thresholds and templates

### Automation Features
- Auto-start class sessions based on schedule
- Intelligent late arrival detection
- Automated session ending
- Computer assignment workflows

## Data Flow

1. **Authentication Flow**: Faculty login → Replit Auth → Session creation → Dashboard access
2. **Attendance Flow**: RFID tap → Student identification → Attendance record creation → Real-time updates
3. **Notification Flow**: Attendance event → Rule evaluation → Email queue → SendGrid delivery
4. **Reporting Flow**: Data aggregation → Export generation → PDF/CSV download

## External Dependencies

### Authentication & Infrastructure
- **Replit Auth**: OpenID Connect provider for faculty authentication
- **Neon Database**: Serverless PostgreSQL hosting
- **SendGrid**: Transactional email service

### Development & Deployment
- **Replit**: Primary hosting and development environment
- **Vite**: Frontend build system with hot module replacement
- **ESBuild**: Server-side TypeScript compilation

### UI & Styling
- **Radix UI**: Accessible component primitives
- **Tailwind CSS**: Utility-first styling framework
- **Lucide**: Icon library for consistent iconography

## Deployment Strategy

### Development Environment
- Replit-hosted development with hot reload
- PostgreSQL module auto-provisioning
- Environment variable management through Replit secrets

### Production Deployment
- Replit autoscale deployment target
- Build process: Frontend (Vite) + Backend (ESBuild)
- Port configuration: Internal 5000 → External 80
- Asset serving through Express static middleware

### Database Management
- Drizzle Kit for schema migrations
- Environment-based connection string configuration
- Session table auto-creation and management

## Changelog
- June 27, 2025. Initial setup
- January 25, 2025. Complete design system overhaul with modern UI/UX

## User Preferences

Preferred communication style: Simple, everyday language.
Color theme: #2596be (rgb(37, 150, 190)) - consistent blue theme throughout system
Login design: Modern split-screen layout with enhanced branding, features showcase, and professional form design
UI Style: Modern glass effects, gradient backgrounds, professional typography, and smooth animations

## Recent Changes
- Implemented comprehensive design system with custom CSS variables and utility classes
- Redesigned sidebar with wider layout (320px) and enhanced navigation with descriptions
- Created modern dashboard with stats cards, activity feed, and quick actions
- Updated login page with features showcase and professional authentication form
- Added glass effects, gradients, and smooth animations throughout the system
- Fixed database session table issues for proper authentication
- Enhanced typography with proper font weights and spacing
- Implemented status indicators and modern button designs