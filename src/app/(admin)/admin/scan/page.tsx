
"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import jsQR from "jsqr";
import { QrCode, User, CheckCircle, Gift, Clock, LogOut, Gamepad2, VideoOff, Camera } from "lucide-react";
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
import { addDocumentNonBlocking, updateDocumentNonBlocking } from "@/firebase/non-blocking-updates";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useTranslation } from "@/hooks/use-translation";


export default function ScanPage() {
  const { t } = useTranslation();
  const [scannedClient, setScannedClient] = useState<Client | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedStationId, setSelectedStationId] = useState<string>("");
  const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);
  const [videoDevices, setVideoDevices] = useState<MediaDeviceInfo[]>([]);
  const [currentVideoDeviceId, setCurrentVideoDeviceId] = useState<string | undefined>();
  const [isScanning, setIsScanning] = useState(false);
  const [hoursToAdd, setHoursToAdd] = useState<number | string>("");
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationFrameId = useRef<number>();
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
  
  const stopScanning = useCallback(() => {
    if (animationFrameId.current) {
        cancelAnimationFrame(animationFrameId.current);
        animationFrameId.current = undefined;
    }
    // Ne pas mettre setIsScanning(false) ici pour que la caméra reste active
  }, []);

  const handleQrCodeScanned = useCallback((code: string) => {
    stopScanning();
    setIsScanning(false); // Arrêter l'indicateur de scan
    setLoading(true);
    try {
        if (navigator.vibrate) {
          navigator.vibrate(200);
        }
        const parsed = JSON.parse(code);
        if (parsed.clientId) {
            const foundClient = clients?.find(c => c.id === parsed.clientId);
            if (foundClient) {
                setScannedClient(foundClient);
                toast({
                    title: "Client Trouvé",
                    description: `${foundClient.name} a été scanné.`
                });
            } else {
                 toast({
                    variant: "destructive",
                    title: "Erreur de Scan",
                    description: "L'ID client du code QR n'a pas été trouvé.",
                });
            }
        }
    } catch (e) {
        toast({
            variant: "destructive",
            title: "Erreur de Scan",
            description: "Format de code QR invalide.",
        });
    } finally {
        setLoading(false);
    }
  }, [clients, stopScanning, toast]);


  const scanLoop = useCallback(() => {
    if (videoRef.current && videoRef.current.readyState === videoRef.current.HAVE_ENOUGH_DATA && canvasRef.current) {
        const canvas = canvasRef.current;
        const video = videoRef.current;
        const context = canvas.getContext("2d");

        if (context) {
            canvas.height = video.videoHeight;
            canvas.width = video.videoWidth;
            context.drawImage(video, 0, 0, canvas.width, canvas.height);
            const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
            const code = jsQR(imageData.data, imageData.width, imageData.height, {
                inversionAttempts: "dontInvert",
            });

            if (code) {
                handleQrCodeScanned(code.data);
                return; // Arrête la boucle
            }
        }
    }
    if(isScanning) {
        animationFrameId.current = requestAnimationFrame(scanLoop);
    }
  }, [handleQrCodeScanned, isScanning]);

  
  const startScanning = useCallback(() => {
      if (!isScanning) {
          setScannedClient(null);
          setIsScanning(true);
          animationFrameId.current = requestAnimationFrame(scanLoop);
      }
  }, [isScanning, scanLoop]);


  const getCameraPermission = useCallback(async (deviceId?: string) => {
    if (streamRef.current && deviceId !== currentVideoDeviceId) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }

    try {
      const constraints: MediaStreamConstraints = {
        video: deviceId ? { deviceId: { exact: deviceId } } : { facingMode: 'environment' }
      };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;
      setHasCameraPermission(true);

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoInputs = devices.filter(d => d.kind === 'videoinput');
      setVideoDevices(videoInputs);
      
      const currentTrack = stream.getVideoTracks()[0];
      const currentSettings = currentTrack.getSettings();
      setCurrentVideoDeviceId(currentSettings.deviceId);

    } catch (error) {
      console.error('Erreur d\'accès à la caméra:', error);
      setHasCameraPermission(false);
      setIsScanning(false);
      toast({
        variant: 'destructive',
        title: 'Accès Caméra Refusé',
        description: 'Veuillez activer les permissions de la caméra dans les paramètres de votre navigateur pour utiliser cette application.',
      });
    }
  }, [toast, currentVideoDeviceId]);


  useEffect(() => {
    getCameraPermission();
    
    return () => {
        if (animationFrameId.current) {
            cancelAnimationFrame(animationFrameId.current);
        }
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null;
        }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  
  useEffect(() => {
    if (isScanning) {
      scanLoop();
    }
  }, [isScanning, scanLoop])


  const availableStations = stations?.filter(s => s.status === 'available') || [];

  const handleAssignStation = () => {
    if(!firestore || !scannedClient || !selectedStationId) return;

    const stationRef = doc(firestore, "stations", selectedStationId);
    const stationData = stations?.find(s => s.id === selectedStationId);
    const historyRef = collection(firestore, 'clients', scannedClient.id, 'history');
    
    addDocumentNonBlocking(historyRef, {
        timestamp: new Date().toISOString(),
        type: 'check-in',
        description: `Checked in at station ${stationData?.id} (${stationData?.type})`,
    });

    addDocumentNonBlocking(collection(firestore, "usageLogs"), {
        clientId: scannedClient.id,
        stationId: selectedStationId,
        startTime: new Date().toISOString(),
        endTime: null,
    });

    updateDocumentNonBlocking(stationRef, { status: 'in use', currentClientId: scannedClient.id });
    
    const clientRef = doc(firestore, "clients", scannedClient.id);
    updateDocumentNonBlocking(clientRef, { currentStationId: selectedStationId });

    toast({
        title: "Poste Assigné",
        description: `${scannedClient.name} a été assigné au poste ${stationData?.id}.`
    });

    setScannedClient(prev => prev ? { ...prev, currentStationId: selectedStationId } : null);
    setSelectedStationId("");
  }
  
  const handleReleaseStation = () => {
    if(!firestore || !scannedClient || !scannedClient.currentStationId) return;

    const stationRef = doc(firestore, "stations", scannedClient.currentStationId);
    const stationData = stations?.find(s => s.id === scannedClient.currentStationId);
    updateDocumentNonBlocking(stationRef, { status: 'available', currentClientId: null });

    const clientRef = doc(firestore, "clients", scannedClient.id);
    updateDocumentNonBlocking(clientRef, { currentStationId: null });

    const historyRef = collection(firestore, 'clients', scannedClient.id, 'history');
    addDocumentNonBlocking(historyRef, {
        timestamp: new Date().toISOString(),
        type: 'check-out',
        description: `Checked out from station ${stationData?.id} (${stationData?.type})`,
    });

    toast({
        title: "Poste Libéré",
        description: `Le poste ${scannedClient.currentStationId} est maintenant disponible.`
    });

    setScannedClient(prev => prev ? { ...prev, currentStationId: undefined } : null);
  }

  const handleUpdateHours = () => {
    if (!firestore || !scannedClient || !hoursToAdd || +hoursToAdd <= 0) return;
    
    const newHours = (scannedClient.subscriptionHours || 0) + Number(hoursToAdd);
    const clientRef = doc(firestore, "clients", scannedClient.id);
    updateDocumentNonBlocking(clientRef, { subscriptionHours: newHours });

    const historyRef = collection(firestore, 'clients', scannedClient.id, 'history');
    addDocumentNonBlocking(historyRef, {
        timestamp: new Date().toISOString(),
        type: 'recharge',
        description: `Recharged ${hoursToAdd} subscription hour(s).`,
    });

    toast({
        title: "Heures Mises à Jour",
        description: `${hoursToAdd} heure(s) ont été ajoutées à l'abonnement de ${scannedClient.name}.`
    });

    setScannedClient(prev => prev ? { ...prev, subscriptionHours: newHours } : null);
    setHoursToAdd("");
  }


  const handleSwapCamera = () => {
    if (videoDevices.length > 1 && currentVideoDeviceId) {
        const currentIndex = videoDevices.findIndex(d => d.deviceId === currentVideoDeviceId);
        const nextIndex = (currentIndex + 1) % videoDevices.length;
        const nextDeviceId = videoDevices[nextIndex].deviceId;
        getCameraPermission(nextDeviceId);
    }
  }

  const clientCurrentStation = stations?.find(s => s.id === scannedClient?.currentStationId);


  return (
    <>
      <PageHeader
        title={t('qrCodeScanner')}
        description={t('qrCodeScannerDescription')}
        className="px-0"
      />
      <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="font-headline">{t('scanner')}</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center justify-center gap-4 text-center">
             <div className="w-full max-w-[400px] aspect-square bg-muted rounded-lg flex items-center justify-center overflow-hidden relative group">
              <video ref={videoRef} className="w-full h-full object-cover" autoPlay muted playsInline />
               <canvas ref={canvasRef} className="hidden" />
              {hasCameraPermission === false && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-muted-foreground z-10">
                      <VideoOff className="h-16 w-16 mb-4" />
                      <p>Caméra non disponible</p>
                  </div>
              )}
               {isScanning && (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <div className="w-2/3 h-2/3 border-4 border-primary/50 rounded-lg animate-pulse" />
                  </div>
              )}
              <div className="absolute bottom-4 left-4 right-4 flex justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-20">
                <Button onClick={startScanning} disabled={isLoadingClients || !hasCameraPermission || isScanning} className="flex-grow">
                    {isScanning ? "Scanning..." : "Scan"}
                </Button>
                {videoDevices.length > 1 && (
                    <Button onClick={handleSwapCamera} variant="outline" size="icon" disabled={!hasCameraPermission}>
                        <Camera className="h-5 w-5" />
                        <span className="sr-only">Changer de Caméra</span>
                    </Button>
                )}
            </div>
            </div>
            {hasCameraPermission === false && (
                <Alert variant="destructive">
                    <AlertTitle>Accès Caméra Requis</AlertTitle>
                    <AlertDescription>
                        Veuillez autoriser l'accès à la caméra dans les paramètres de votre navigateur pour utiliser cette fonctionnalité.
                    </AlertDescription>
                </Alert>
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="font-headline">Profil du Client</CardTitle>
            <CardDescription>
              Les informations du client apparaîtront ici après un scan réussi.
            </CardDescription>
          </CardHeader>
          <CardContent className="min-h-[300px]">
            {loading && (
              <div className="flex items-center justify-center h-full">
                <div className="flex flex-col items-center gap-2">
                  <QrCode className="h-10 w-10 animate-pulse text-primary" />
                  <p className="text-muted-foreground">Recherche du client...</p>
                </div>
              </div>
            )}
            {!loading && scannedClient && (
              <div className="space-y-6">
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0">
                    <User className="h-12 w-12 text-primary" />
                  </div>
                  <div className="flex-grow">
                    <h3 className="text-xl font-semibold">{scannedClient.name}</h3>
                    <p className="text-muted-foreground">{scannedClient.email}</p>
                    <Badge variant="secondary" className="mt-2">{scannedClient.subscriptionTier}</Badge>
                  </div>
                   <div className="text-right">
                        <p className="text-sm text-muted-foreground">Heures Restantes</p>
                        <p className="text-2xl font-bold">{scannedClient.subscriptionHours || 0}</p>
                    </div>
                </div>
                
                <Separator />
                
                <div className="grid gap-4">
                  <h4 className="font-semibold">Gestion des Postes</h4>
                  {clientCurrentStation ? (
                     <div className="flex items-center gap-4 p-4 bg-muted/50 rounded-lg">
                        <Gamepad2 className="h-8 w-8 text-primary"/>
                        <div className="flex-grow">
                            <p className="font-medium">Joue actuellement sur :</p>
                            <p className="text-lg font-bold">{clientCurrentStation.id} ({clientCurrentStation.type})</p>
                        </div>
                        <Button variant="destructive" size="sm" onClick={handleReleaseStation}>
                            <LogOut className="mr-2 h-4 w-4"/> Libérer
                        </Button>
                     </div>
                  ) : (
                    <div className="flex flex-col sm:flex-row gap-2 items-end">
                      <div className="grid gap-1.5 w-full sm:w-auto flex-grow">
                        <Label htmlFor="station">Assigner un Poste</Label>
                        <Select value={selectedStationId} onValueChange={setSelectedStationId}>
                            <SelectTrigger id="station">
                                <SelectValue placeholder="Sélectionner un poste" />
                            </SelectTrigger>
                            <SelectContent>
                                {isLoadingStations ? <SelectItem value="loading" disabled>Chargement...</SelectItem> : 
                                 availableStations.length > 0 ? (
                                    availableStations.map(station => (
                                        <SelectItem key={station.id} value={station.id}>{station.id} ({station.type})</SelectItem>
                                    ))
                                 ) : (
                                    <SelectItem value="none" disabled>Aucun poste disponible</SelectItem>
                                 )
                                }
                            </SelectContent>
                        </Select>
                      </div>
                      <Button onClick={handleAssignStation} disabled={!selectedStationId}>
                        <CheckCircle className="mr-2 h-4 w-4" /> Assigner
                      </Button>
                    </div>
                  )}
                </div>

                <Separator />
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="hours" className="flex items-center">
                        <Clock className="mr-2 h-4 w-4 text-muted-foreground"/>
                        Gérer les Heures d'Abonnement
                    </Label>
                    <div className="flex gap-2">
                        <Input 
                            id="hours" 
                            type="number" 
                            placeholder="ex: 5" 
                            value={hoursToAdd}
                            onChange={(e) => setHoursToAdd(e.target.value)}
                        />
                        <Button variant="outline" onClick={handleUpdateHours}>Mettre à jour</Button>
                    </div>
                  </div>
                   <div className="space-y-2">
                     <Label className="flex items-center">
                        <Gift className="mr-2 h-4 w-4 text-muted-foreground"/>
                        Actions Bonus
                    </Label>
                    <Button variant="secondary" className="w-full">
                      Ajouter un Bonus
                    </Button>
                  </div>
                </div>
              </div>
            )}
            {!loading && !scannedClient && (
              <div className="flex items-center justify-center h-full text-center">
                <div className="flex flex-col items-center gap-2">
                    <User className="h-10 w-10 text-muted-foreground"/>
                    <p className="text-muted-foreground">En attente d'un scan...</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
