import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Wifi, IdCard, Radio } from "lucide-react";

interface RFIDSimulatorProps {
  onRFIDTap: (rfidCardId: string) => void;
}

export default function RFIDSimulator({ onRFIDTap }: RFIDSimulatorProps) {
  const [selectedCard, setSelectedCard] = useState("");
  const [customCard, setCustomCard] = useState("");
  const [isScanning, setIsScanning] = useState(false);

  // Mock RFID cards for testing
  const mockCards = [
    { id: "RF001234", student: "Maria Santos" },
    { id: "RF001235", student: "Juan Dela Cruz" },
    { id: "RF001236", student: "Anna Rodriguez" },
    { id: "RF001237", student: "Carlos Mendez" },
    { id: "RF001238", student: "Diana Lopez" },
    { id: "RF001239", student: "Miguel Santos" },
  ];

  const handleCardTap = (cardId?: string) => {
    const cardToUse = cardId || selectedCard || customCard;
    
    if (!cardToUse) {
      return;
    }

    setIsScanning(true);
    
    // Simulate scanning delay
    setTimeout(() => {
      onRFIDTap(cardToUse);
      setIsScanning(false);
    }, 1000);
  };

  const simulateRandomTap = () => {
    const randomCard = mockCards[Math.floor(Math.random() * mockCards.length)];
    handleCardTap(randomCard.id);
  };

  return (
    <div className="bg-muted/30 rounded-lg p-6">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-6">
          <div className={`w-32 h-32 rounded-full mx-auto mb-4 flex items-center justify-center transition-all duration-300 ${
            isScanning 
              ? 'bg-primary/20 animate-pulse scale-110' 
              : 'bg-primary/10 hover:bg-primary/15'
          }`}>
            <Radio className={`text-primary transition-all duration-300 ${
              isScanning ? 'h-12 w-12 animate-spin' : 'h-10 w-10'
            }`} />
          </div>
          <h4 className="text-xl font-semibold mb-2">
            {isScanning ? 'Scanning RFID Card...' : 'RFID Scanner Ready'}
          </h4>
          <p className="text-muted-foreground mb-6">
            {isScanning 
              ? 'Processing card data and validating presence...' 
              : 'Students can tap their cards to check in/out'
            }
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Predefined Cards */}
          <div className="space-y-4">
            <Label className="text-base font-medium">Select Student Card</Label>
            <Select value={selectedCard} onValueChange={setSelectedCard}>
              <SelectTrigger>
                <SelectValue placeholder="Choose a student card" />
              </SelectTrigger>
              <SelectContent>
                {mockCards.map((card) => (
                  <SelectItem key={card.id} value={card.id}>
                    {card.student} - {card.id}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button 
              onClick={() => handleCardTap()}
              disabled={!selectedCard || isScanning}
              className="w-full"
              variant="outline"
            >
              <IdCard className="mr-2 h-4 w-4" />
              Simulate Card Tap
            </Button>
          </div>

          {/* Custom Card ID */}
          <div className="space-y-4">
            <Label htmlFor="customCard" className="text-base font-medium">
              Custom RFID Card ID
            </Label>
            <Input
              id="customCard"
              placeholder="Enter RFID card ID (e.g., RF001240)"
              value={customCard}
              onChange={(e) => setCustomCard(e.target.value)}
              className="font-mono"
            />
            <Button 
              onClick={() => handleCardTap()}
              disabled={!customCard || isScanning}
              className="w-full"
              variant="outline"
            >
              <IdCard className="mr-2 h-4 w-4" />
              Test Custom Card
            </Button>
          </div>
        </div>

        <div className="mt-6 text-center">
          <Button 
            onClick={simulateRandomTap}
            disabled={isScanning}
            size="lg"
            className="bg-secondary hover:bg-secondary/90"
          >
            <Wifi className="mr-2 h-5 w-5" />
            Simulate Random Student Tap
          </Button>
        </div>

        {/* Scanner Status */}
        <div className="mt-6 p-4 bg-background/50 rounded-lg">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-secondary rounded-full animate-pulse"></div>
              <span className="font-medium">Scanner Status:</span>
            </div>
            <span className="text-secondary font-medium">
              {isScanning ? 'Scanning...' : 'Ready for Input'}
            </span>
          </div>
          <div className="flex items-center justify-between text-sm mt-2">
            <span className="text-muted-foreground">Proximity Sensors:</span>
            <span className="text-secondary font-medium">Active (3/3)</span>
          </div>
          <div className="flex items-center justify-between text-sm mt-2">
            <span className="text-muted-foreground">Connection:</span>
            <span className="text-secondary font-medium">Stable</span>
          </div>
        </div>

        <div className="mt-4 text-center">
          <p className="text-xs text-muted-foreground">
            This simulator mimics real RFID hardware for testing purposes.
            In production, actual RFID readers and proximity sensors would be used.
          </p>
        </div>
      </div>
    </div>
  );
}
