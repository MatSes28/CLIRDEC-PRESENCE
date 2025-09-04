import { driver } from 'driver.js';
import 'driver.js/dist/driver.css';

export interface TourStep {
  element: string;
  title: string;
  description: string;
  side?: 'top' | 'bottom' | 'left' | 'right';
  align?: 'start' | 'center' | 'end';
}

export interface Tour {
  id: string;
  name: string;
  steps: TourStep[];
}

class TourService {
  private currentTour: any = null;
  private completedTours: Set<string> = new Set();

  constructor() {
    this.loadCompletedTours();
  }

  private loadCompletedTours() {
    try {
      const completed = localStorage.getItem('clirdec-completed-tours');
      if (completed) {
        this.completedTours = new Set(JSON.parse(completed));
      }
    } catch (error) {
      console.warn('Failed to load completed tours:', error);
    }
  }

  private saveCompletedTours() {
    try {
      localStorage.setItem('clirdec-completed-tours', JSON.stringify(Array.from(this.completedTours)));
    } catch (error) {
      console.warn('Failed to save completed tours:', error);
    }
  }

  public markTourCompleted(tourId: string) {
    this.completedTours.add(tourId);
    this.saveCompletedTours();
  }

  public isTourCompleted(tourId: string): boolean {
    return this.completedTours.has(tourId);
  }

  public resetTours() {
    this.completedTours.clear();
    this.saveCompletedTours();
  }

  public startTour(tour: Tour, options?: { showProgress?: boolean; allowClose?: boolean }) {
    if (this.currentTour) {
      this.currentTour.destroy();
    }

    const driverSteps = tour.steps.map(step => ({
      element: step.element,
      popover: {
        title: step.title,
        description: step.description,
        side: step.side || 'bottom',
        align: step.align || 'start'
      }
    }));

    this.currentTour = driver({
      showProgress: options?.showProgress ?? true,
      allowClose: options?.allowClose ?? true,
      steps: driverSteps,
      onDestroyed: () => {
        this.markTourCompleted(tour.id);
        this.currentTour = null;
      },
      onPopoverRender: (popover: any) => {
        // Add custom styling and CLIRDEC branding
        const popoverElement = popover.wrapper || popover.element;
        if (popoverElement) {
          popoverElement.style.setProperty('--driver-color', '#2596be');
          popoverElement.style.setProperty('--driver-text-color', '#1a1a1a');
          popoverElement.style.border = '2px solid #2596be';
        }
      }
    });

    this.currentTour.drive();
  }

  public stopTour() {
    if (this.currentTour) {
      this.currentTour.destroy();
      this.currentTour = null;
    }
  }
}

// Define all available tours
export const tours: Record<string, Tour> = {
  firstTimeUser: {
    id: 'first-time-user',
    name: 'Welcome to CLIRDEC: PRESENCE',
    steps: [
      {
        element: '[data-tour="welcome"]',
        title: '👋 Welcome to CLIRDEC: PRESENCE!',
        description: 'This is your attendance monitoring system for Central Luzon State University. Let\'s take a quick tour to get you started!'
      },
      {
        element: '[data-tour="navigation"]',
        title: '🧭 Navigation Menu',
        description: 'Use this sidebar to navigate between different sections: Dashboard, Students, Attendance, and Settings.',
        side: 'right'
      },
      {
        element: '[data-tour="dashboard-stats"]',
        title: '📊 Dashboard Overview',
        description: 'Your dashboard shows key statistics: today\'s classes, student attendance rates, and system status.',
        side: 'bottom'
      },
      {
        element: '[data-tour="students-section"]',
        title: '👥 Students Management',
        description: 'Click here to view, add, edit, and contact students. You can also manage RFID cards and parent information.',
        side: 'bottom'
      },
      {
        element: '[data-tour="attendance-section"]',
        title: '📝 Attendance Tracking',
        description: 'Monitor real-time attendance, view reports, and manage class sessions from this section.',
        side: 'bottom'
      },
      {
        element: '[data-tour="user-menu"]',
        title: '⚙️ User Settings',
        description: 'Access your profile, system settings, and logout options from the user menu.',
        side: 'left'
      }
    ]
  },
  studentsPage: {
    id: 'students-page',
    name: 'Students Management Tour',
    steps: [
      {
        element: '[data-tour="add-student"]',
        title: '➕ Add New Student',
        description: 'Click here to register a new student with their personal information, RFID card, and parent details.',
        side: 'bottom'
      },
      {
        element: '[data-tour="search-filters"]',
        title: '🔍 Search & Filter',
        description: 'Use these filters to quickly find students by year, section, or search by name and student ID.',
        side: 'bottom'
      },
      {
        element: '[data-tour="student-list"]',
        title: '📋 Student List',
        description: 'View all students with their information. You can edit details, contact parents, or view attendance records.',
        side: 'top'
      },
      {
        element: '[data-tour="student-actions"]',
        title: '🎯 Student Actions',
        description: 'Use these buttons to edit student information, send messages to parents, or view detailed records.',
        side: 'left'
      }
    ]
  },
  attendancePage: {
    id: 'attendance-page',
    name: 'Attendance Management Tour',
    steps: [
      {
        element: '[data-tour="class-session"]',
        title: '🏫 Class Sessions',
        description: 'Start and manage class sessions here. Sessions automatically track student attendance via RFID.',
        side: 'bottom'
      },
      {
        element: '[data-tour="rfid-status"]',
        title: '📡 RFID Status',
        description: 'Monitor the status of your RFID devices and ensure they\'re connected for automatic attendance.',
        side: 'bottom'
      },
      {
        element: '[data-tour="attendance-overview"]',
        title: '📊 Attendance Overview',
        description: 'View real-time attendance statistics and identify students who may need attention.',
        side: 'top'
      }
    ]
  }
};

// Global tour service instance
export const tourService = new TourService();

// Hook for detecting first-time users
export const useFirstTimeUser = () => {
  const isFirstTime = !tourService.isTourCompleted('first-time-user');
  
  const startFirstTimeTour = () => {
    tourService.startTour(tours.firstTimeUser, {
      showProgress: true,
      allowClose: true
    });
  };

  return { isFirstTime, startFirstTimeTour };
};