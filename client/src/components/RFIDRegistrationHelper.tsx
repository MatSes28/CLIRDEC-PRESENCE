import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Usb, Wifi, CreditCard, RefreshCw, CheckCircle, AlertCircle } from 'lucide-react';

interface RFIDRegistrationHelperProps {
  onRFIDScanned?: (uid: string) => void;
  isOpen: boolean;
}

export function RFIDRegistrationHelper({ onRFIDScanned, isOpen }: RFIDRegistrationHelperProps) {
  const [connectionStatus, setConnectionStatus] = useState<'disconnected' | 'connecting' | 'connected'>('disconnected');
  const [lastScannedUID, setLastScannedUID] = useState<string>('');
  const [scanCount, setScanCount] = useState(0);
  const [isUSBMode, setIsUSBMode] = useState(true);

  useEffect(() => {
    if (!isOpen) return;

    // Listen for keyboard input that looks like RFID UIDs
    const handleKeyPress = (event: KeyboardEvent) => {
      // Only process if we're in a form input
      const target = event.target as HTMLElement;
      if (target.tagName === 'INPUT' && target.getAttribute('type') === 'text') {
        // Check if the input value looks like an RFID UID (hex string, 6-20 chars)
        const inputElement = target as HTMLInputElement;
        setTimeout(() => {
          const value = inputElement.value.trim().toUpperCase();
          if (value.length >= 6 && value.length <= 20 && /^[0-9A-F]+$/.test(value)) {
            setLastScannedUID(value);
            setScanCount(prev => prev + 1);
            onRFIDScanned?.(value);
          }
        }, 100);
      }
    };

    document.addEventListener('input', handleKeyPress as any);
    return () => document.removeEventListener('input', handleKeyPress as any);
  }, [isOpen, onRFIDScanned]);

  const connectToDevice = async () => {
    setConnectionStatus('connecting');
    
    // Simulate connection attempt
    setTimeout(() => {
      setConnectionStatus('connected');
    }, 2000);
  };

  const switchMode = () => {
    setIsUSBMode(!isUSBMode);
    setConnectionStatus('disconnected');
    setLastScannedUID('');
    setScanCount(0);
  };

  if (!isOpen) return null;

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CreditCard className="h-5 w-5" />
          RFID Registration Helper
        </CardTitle>
        <CardDescription>
          Scan RFID cards to automatically fill in student information
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Mode Selection */}
        <div className="flex items-center justify-between p-3 border rounded-lg">
          <div className="flex items-center gap-2">
            {isUSBMode ? <Usb className="h-4 w-4" /> : <Wifi className="h-4 w-4" />}
            <span className="font-medium">
              {isUSBMode ? 'USB Registration Mode' : 'WiFi Attendance Mode'}
            </span>
          </div>
          <Button variant="outline" size="sm" onClick={switchMode}>
            Switch
          </Button>
        </div>

        {/* Connection Status */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Connection Status:</span>
            <Badge variant={
              connectionStatus === 'connected' ? 'default' : 
              connectionStatus === 'connecting' ? 'secondary' : 'outline'
            }>
              {connectionStatus === 'connected' && <CheckCircle className="h-3 w-3 mr-1" />}
              {connectionStatus === 'connecting' && <RefreshCw className="h-3 w-3 mr-1 animate-spin" />}
              {connectionStatus === 'disconnected' && <AlertCircle className="h-3 w-3 mr-1" />}
              {connectionStatus.charAt(0).toUpperCase() + connectionStatus.slice(1)}
            </Badge>
          </div>

          {connectionStatus === 'disconnected' && (
            <Button onClick={connectToDevice} className="w-full" size="sm">
              <Usb className="h-4 w-4 mr-2" />
              Connect ESP32 Device
            </Button>
          )}
        </div>

        {/* Instructions */}
        {isUSBMode ? (
          <Alert>
            <Usb className="h-4 w-4" />
            <AlertDescription>
              <strong>USB Mode Instructions:</strong>
              <ol className="list-decimal list-inside mt-2 space-y-1 text-sm">
                <li>Connect ESP32 via USB cable</li>
                <li>Hold BOOT button for 3 seconds to enter USB mode</li>
                <li>Run the Python typing script on your computer</li>
                <li>Click in the RFID Card ID field below</li>
                <li>Tap RFID cards - UIDs will auto-type</li>
              </ol>
            </AlertDescription>
          </Alert>
        ) : (
          <Alert>
            <Wifi className="h-4 w-4" />
            <AlertDescription>
              <strong>WiFi Mode Instructions:</strong>
              <ol className="list-decimal list-inside mt-2 space-y-1 text-sm">
                <li>ESP32 connects to WiFi automatically</li>
                <li>Real-time attendance monitoring active</li>
                <li>RFID scans sent wirelessly to server</li>
                <li>Motion detection enabled</li>
              </ol>
            </AlertDescription>
          </Alert>
        )}

        {/* Scan Status */}
        {connectionStatus === 'connected' && (
          <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-center gap-2 text-green-800">
              <CheckCircle className="h-4 w-4" />
              <span className="font-medium">Ready to Scan</span>
            </div>
            {scanCount > 0 && (
              <div className="mt-2 text-sm text-green-700">
                Cards scanned: {scanCount}
                {lastScannedUID && (
                  <div className="font-mono text-xs mt-1">
                    Last: {lastScannedUID}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Python Script Download */}
        {isUSBMode && (
          <div className="p-3 border-2 border-dashed border-gray-300 rounded-lg text-center">
            <p className="text-sm text-gray-600 mb-2">
              Need the Python typing script?
            </p>
            <Button variant="outline" size="sm" onClick={() => {
              // Create and download the Python script
              const script = `# Download and save as type_uid.py
# Run: python type_uid.py
# Make sure to install: pip install pyserial keyboard

import serial
import keyboard

PORT = "COM3"  # Adjust for your system
BAUD = 9600

ser = serial.Serial(PORT, BAUD, timeout=1)
print(f"Listening on {PORT}... Tap RFID card.")

while True:
    uid = ser.readline().decode(errors="ignore").strip()
    if uid and len(uid) >= 6 and all(c in '0123456789ABCDEFabcdef' for c in uid):
        print(f"Card: {uid}")
        keyboard.write(uid.upper())
        # keyboard.press_and_release("enter")  # Uncomment to auto-press Enter
`;
              const blob = new Blob([script], { type: 'text/plain' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = 'type_uid.py';
              a.click();
              URL.revokeObjectURL(url);
            }}>
              Download type_uid.py
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}