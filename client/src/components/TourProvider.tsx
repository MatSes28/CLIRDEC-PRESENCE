import React, { createContext, useContext, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { HelpCircle, X, RotateCcw } from 'lucide-react';
import { tourService, tours, useFirstTimeUser } from '@/services/tourService';
import { useAuth } from '@/hooks/useAuth';
import { useLocation } from 'wouter';

interface TourContextType {
  startTour: (tourId: string) => void;
  isInTour: boolean;
  showTourButton: boolean;
  resetTours: () => void;
}

const TourContext = createContext<TourContextType | null>(null);

export const useTour = () => {
  const context = useContext(TourContext);
  if (!context) {
    throw new Error('useTour must be used within a TourProvider');
  }
  return context;
};

interface TourProviderProps {
  children: React.ReactNode;
}

export default function TourProvider({ children }: TourProviderProps) {
  const { user, isAuthenticated } = useAuth();
  const [location] = useLocation();
  const { isFirstTime, startFirstTimeTour } = useFirstTimeUser();
  const [isInTour, setIsInTour] = useState(false);
  const [showTourButton, setShowTourButton] = useState(true);
  const [hasShownFirstTimeTour, setHasShownFirstTimeTour] = useState(false);

  // Start first-time tour for new users (with delay for proper rendering)
  useEffect(() => {
    if (isAuthenticated && isFirstTime && !hasShownFirstTimeTour && location === '/') {
      const timer = setTimeout(() => {
        startFirstTimeTour();
        setHasShownFirstTimeTour(true);
        setIsInTour(true);
      }, 1500); // Give time for components to render

      return () => clearTimeout(timer);
    }
  }, [isAuthenticated, isFirstTime, location, hasShownFirstTimeTour, startFirstTimeTour]);

  const startTour = (tourId: string) => {
    const tour = tours[tourId];
    if (tour) {
      tourService.startTour(tour);
      setIsInTour(true);
      
      // Set up tour completion handler
      const checkTourEnd = setInterval(() => {
        if (!tourService['currentTour']) {
          setIsInTour(false);
          clearInterval(checkTourEnd);
        }
      }, 500);
    }
  };

  const resetTours = () => {
    tourService.resetTours();
    setHasShownFirstTimeTour(false);
  };

  const contextValue: TourContextType = {
    startTour,
    isInTour,
    showTourButton,
    resetTours
  };

  return (
    <TourContext.Provider value={contextValue}>
      {children}
      <TourControls />
    </TourContext.Provider>
  );
}

function TourControls() {
  const { startTour, isInTour, resetTours } = useTour();
  const [location] = useLocation();
  const { isFirstTime } = useFirstTimeUser();
  const [showControls, setShowControls] = useState(false);

  // Get current page tour
  const getCurrentPageTour = () => {
    switch (location) {
      case '/':
        return { id: 'firstTimeUser', name: 'Dashboard Tour' };
      case '/students':
        return { id: 'studentsPage', name: 'Students Tour' };
      case '/attendance':
        return { id: 'attendancePage', name: 'Attendance Tour' };
      default:
        return null;
    }
  };

  const currentTour = getCurrentPageTour();

  if (isInTour) {
    return null; // Hide controls during tour
  }

  return (
    <>
      {/* Tour Help Button */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2">
        {showControls && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg border p-3 mb-2 min-w-[200px]">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-medium text-sm">Quick Help</h3>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setShowControls(false)}
                className="h-6 w-6 p-0"
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
            
            <div className="space-y-2">
              {currentTour && (
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => startTour(currentTour.id)}
                  className="w-full justify-start text-xs"
                >
                  <HelpCircle className="h-3 w-3 mr-2" />
                  {currentTour.name}
                </Button>
              )}
              
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => startTour('firstTimeUser')}
                className="w-full justify-start text-xs"
              >
                <HelpCircle className="h-3 w-3 mr-2" />
                System Overview
              </Button>
              
              <Button 
                variant="outline" 
                size="sm" 
                onClick={resetTours}
                className="w-full justify-start text-xs"
              >
                <RotateCcw className="h-3 w-3 mr-2" />
                Reset Tours
              </Button>
            </div>
          </div>
        )}
        
        <Button 
          onClick={() => setShowControls(!showControls)}
          className="bg-blue-600 hover:bg-blue-700 text-white rounded-full w-12 h-12 p-0 shadow-lg relative"
          data-tour="help-button"
        >
          <HelpCircle className="h-5 w-5" />
          {isFirstTime && (
            <Badge className="absolute -top-1 -right-1 bg-red-500 text-white text-xs px-1 min-w-0 h-5">
              !
            </Badge>
          )}
        </Button>
      </div>
    </>
  );
}