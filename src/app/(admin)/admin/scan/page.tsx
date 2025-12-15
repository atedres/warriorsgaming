
"use client";

import { useState, useEffect, useRef } from "react";
import { QrCode, User, CheckCircle, Gift, Clock, LogOut, Gamepad2, VideoOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { Client, Station } from "@/app/lib/data";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { PageHeader } from "@/components/page-header";
import { useCollection, useFirestore } from "@/firebase";
import { useMemoFirebase } from "@/firebase/provider";
import { collection, query, doc, where } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";
import { updateDocumentNonBlocking } from "@/firebase/non-blocking-updates";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";


export default function ScanPage() {
  const [scannedClient, setScannedClient] = useState<Client | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedStationId, setSelectedStationId] = useState<string>("");
  const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const { toast } = useToast();

  const firestore = useFirestore();

  const clientsQuery = useMemoFirebase(
    () => (firestore ? query(collection(firestore, 'clients')) : null),
    [firestore]
  );
  const { data: clients, isLoading: isLoadingClients } = useCollection<Client>(clientsQuery);
  
  const stationsQuery = useMemoFirebase(
    () => (firestore ? query(collection(firestore, 'stations')) : null),
    [firestore]
  );
  const { data: stations, isLoading: isLoadingStations } = useCollection<Station>(stationsQuery);

  useEffect(() => {
    const getCameraPermission = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        setHasCameraPermission(true);

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (error) {
        console.error('Error accessing camera:', error);
        setHasCameraPermission(false);
        toast({
          variant: 'destructive',
          title: 'Camera Access Denied',
          description: 'Please enable camera permissions in your browser settings to use this app.',
        });
      }
    };

    getCameraPermission();
    
    // Cleanup function to stop the video stream when the component unmounts
    return () => {
        if (videoRef.current && videoRef.current.srcObject) {
            const stream = videoRef.current.srcObject as MediaStream;
            stream.getTracks().forEach(track => track.stop());
        }
    }
  }, [toast]);


  const availableStations = stations?.filter(s => s.status === 'available') || [];

  const handleScan = () => {
    setLoading(true);
    setScannedClient(null);
    setSelectedStationId("");
    // Simulate scanning a QR code by using a webcam
    // For now, we'll just simulate a scan with a timeout
    setTimeout(() => {
      // Simulate scanning a random client
      if(clients && clients.length > 0){
        const randomClient = clients[Math.floor(Math.random() * clients.length)];
        setScannedClient(randomClient);
      }
      setLoading(false);
    }, 1500);
  };

  const handleAssignStation = () => {
    if(!firestore || !scannedClient || !selectedStationId) return;

    const stationRef = doc(firestore, "stations", selectedStationId);
    updateDocumentNonBlocking(stationRef, { status: 'in use', currentClientId: scannedClient.id });
    
    const clientRef = doc(firestore, "clients", scannedClient.id);
    updateDocumentNonBlocking(clientRef, { currentStationId: selectedStationId });

    toast({
        title: "Station Assigned",
        description: `${scannedClient.name} has been assigned to station ${stations?.find(s => s.id === selectedStationId)?.id}.`
    });

    // Refresh local state to reflect the change
    setScannedClient(prev => prev ? { ...prev, currentStationId: selectedStationId } : null);
    setSelectedStationId("");
  }
  
  const handleReleaseStation = () => {
    if(!firestore || !scannedClient || !scannedClient.currentStationId) return;

    const stationRef = doc(firestore, "stations", scannedClient.currentStationId);
    updateDocumentNonBlocking(stationRef, { status: 'available', currentClientId: null });

    const clientRef = doc(firestore, "clients", scannedClient.id);
    updateDocumentNonBlocking(clientRef, { currentStationId: null });

    toast({
        title: "Station Released",
        description: `Station ${scannedClient.currentStationId} is now available.`
    });

    // Refresh local state to reflect the change
    setScannedClient(prev => prev ? { ...prev, currentStationId: undefined } : null);
  }

  const clientCurrentStation = stations?.find(s => s.id === scannedClient?.currentStationId);


  return (
    <>
      <PageHeader
        title="QR Code Scanner"
        description="Scan a client's QR code to check them in or manage their account."
      />
      <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="font-headline">Scanner</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center justify-center gap-6 text-center h-full min-h-[300px]">
            <div className="w-full max-w-sm h-auto aspect-video bg-muted rounded-lg flex items-center justify-center overflow-hidden">
              <video ref={videoRef} className="w-full h-full object-cover" autoPlay muted playsInline />
              {hasCameraPermission === false && (
                  <div className="absolute flex flex-col items-center text-muted-foreground">
                      <VideoOff className="h-16 w-16 mb-4" />
                      <p>Camera not available</p>
                  </div>
              )}
            </div>
            {hasCameraPermission === false && (
                <Alert variant="destructive">
                    <AlertTitle>Camera Access Required</AlertTitle>
                    <AlertDescription>
                        Please allow camera access in your browser settings to use this feature.
                    </AlertDescription>
                </Alert>
            )}
            <Button onClick={handleScan} disabled={loading || isLoadingClients || !hasCameraPermission} className="w-full max-w-xs">
              {loading ? "Scanning..." : "Simulate Scan"}
            </Button>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="font-headline">Client Profile</CardTitle>
            <CardDescription>
              Client information will appear here after a successful scan.
            </CardDescription>
          </CardHeader>
          <CardContent className="min-h-[300px]">
            {loading && (
              <div className="flex items-center justify-center h-full">
                <div className="flex flex-col items-center gap-2">
                  <QrCode className="h-10 w-10 animate-pulse text-primary" />
                  <p className="text-muted-foreground">Searching for client...</p>
                </div>
              </div>
            )}
            {!loading && scannedClient && (
              <div className="space-y-6">
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0">
                    <User className="h-12 w-12 text-primary" />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold">{scannedClient.name}</h3>
                    <p className="text-muted-foreground">{scannedClient.email}</p>
                    <Badge variant="secondary" className="mt-2">{scannedClient.subscriptionTier}</Badge>
                  </div>
                </div>
                
                <Separator />
                
                <div className="grid gap-4">
                  <h4 className="font-semibold">Station Management</h4>
                  {clientCurrentStation ? (
                     <div className="flex items-center gap-4 p-4 bg-muted/50 rounded-lg">
                        <Gamepad2 className="h-8 w-8 text-primary"/>
                        <div className="flex-grow">
                            <p className="font-medium">Currently playing on:</p>
                            <p className="text-lg font-bold">{clientCurrentStation.id}</p>
                            <p className="text-sm text-muted-foreground">{clientCurrentStation.type}</p>
                        </div>
                        <Button variant="destructive" size="sm" onClick={handleReleaseStation}>
                            <LogOut className="mr-2 h-4 w-4"/> Release
                        </Button>
                     </div>
                  ) : (
                    <div className="flex flex-col sm:flex-row gap-2 items-end">
                      <div className="grid gap-1.5 w-full sm:w-auto flex-grow">
                        <Label htmlFor="station">Assign Station</Label>
                        <Select value={selectedStationId} onValueChange={setSelectedStationId}>
                            <SelectTrigger id="station">
                                <SelectValue placeholder="Select a station" />
                            </SelectTrigger>
                            <SelectContent>
                                {isLoadingStations ? <SelectItem value="loading" disabled>Loading...</SelectItem> : 
                                 availableStations.length > 0 ? (
                                    availableStations.map(station => (
                                        <SelectItem key={station.id} value={station.id}>{station.id} ({station.type})</SelectItem>
                                    ))
                                 ) : (
                                    <SelectItem value="none" disabled>No available stations</SelectItem>
                                 )
                                }
                            </SelectContent>
                        </Select>
                      </div>
                      <Button onClick={handleAssignStation} disabled={!selectedStationId}>
                        <CheckCircle className="mr-2 h-4 w-4" /> Assign
                      </Button>
                    </div>
                  )}
                </div>

                <Separator />
                
                <div className="grid gap-4">
                  <h4 className="font-semibold">Actions</h4>
                  <div className="flex flex-wrap gap-2">
                    <Button variant="secondary">
                      <Gift className="mr-2 h-4 w-4" /> Add Bonus
                    </Button>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="hours" className="flex items-center">
                        <Clock className="mr-2 h-4 w-4 text-muted-foreground"/>
                        Manage Subscription Hours
                    </Label>
                    <div className="flex gap-2">
                        <Input id="hours" type="number" placeholder={`${scannedClient.subscriptionHours} hours`} />
                        <Button variant="outline">Update</Button>
                    </div>
                  </div>
                </div>


              </div>
            )}
            {!loading && !scannedClient && (
              <div className="flex items-center justify-center h-full text-center">
                <div className="flex flex-col items-center gap-2">
                    <User className="h-10 w-10 text-muted-foreground"/>
                    <p className="text-muted-foreground">Waiting for scan...</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
