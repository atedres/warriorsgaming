
"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import jsQR from "jsqr";
import { QrCode, User, CheckCircle, Gift, Clock, LogOut, Gamepad2, VideoOff, Camera, MonitorPlay, Tv, Users } from "lucide-react";
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
import { cn } from "@/lib/utils";
import { formatDistanceToNowStrict } from 'date-fns';

function StationCard({ station, client, onRelease }: { station: Station, client?: Client, onRelease: (station: Station) => void }) {
    const [timer, setTimer] = useState("0m");
    const { t } = useTranslation();

    useEffect(() => {
        if (station.status === 'in use' && station.sessionStartTime) {
            const updateTimer = () => {
                const startTime = new Date(station.sessionStartTime!);
                setTimer(formatDistanceToNowStrict(startTime));
            };
            updateTimer();
            const intervalId = setInterval(updateTimer, 1000); // Mettre à jour chaque seconde
            return () => clearInterval(intervalId);
        }
    }, [station.status, station.sessionStartTime]);


    const getIcon = (type: string) => {
        switch (type) {
          case 'PC':
            return <Gamepad2 className="h-5 w-5" />;
          case 'PS5':
            return <Gamepad2 className="h-5 w-5" />;
          case 'PS5 VIP':
            return <Gamepad2 className="h-5 w-5 text-primary" />;
          case 'VR Simulator':
            return <Tv className="h-5 w-5" />;
          default:
            return null;
        }
      };


    return (
        <Card className={cn(
            "flex flex-col transition-all duration-300",
            station.status === 'in use' && "bg-orange-400/10 border-orange-400/50",
            station.status === 'maintenance' && "bg-red-400/10 border-red-400/50 opacity-60",
        )}>
             <CardHeader className="flex flex-row items-start justify-between pb-2">
                <CardTitle className="font-headline text-lg font-medium flex items-center gap-2">
                    {getIcon(station.type)}
                    <span className="break-all">{station.id}</span>
                </CardTitle>
                <Badge variant={station.status === 'available' ? 'secondary' : 'default'} className={cn(
                    "flex-shrink-0",
                    station.status === 'available' && "bg-green-500/20 text-green-700 border-green-500/50",
                    station.status === 'in use' && "bg-orange-500/20 text-orange-700 border-orange-500/50",
                    station.status === 'maintenance' && "bg-red-500/20 text-red-700 border-red-500/50",
                )}>{station.status}</Badge>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col justify-center items-center text-center p-4">
                {station.status === 'in use' ? (
                    <div className="space-y-2">
                        <User className="h-8 w-8 mx-auto text-muted-foreground" />
                        <p className="font-semibold">{client?.name || t('loading')}</p>
                        <p className="text-2xl font-mono font-bold text-primary">{timer}</p>
                        <Button variant="destructive" size="sm" onClick={() => onRelease(station)} className="mt-2 w-full">
                            <LogOut className="mr-2 h-4 w-4"/> {t('releaseStation')}
                        </Button>
                    </div>
                ) : station.status === 'available' ? (
                    <div className="text-muted-foreground">
                        <MonitorPlay className="h-10 w-10 mx-auto"/>
                        <p className="mt-2">Disponible</p>
                    </div>
                ) : (
                     <div className="text-muted-foreground">
                        <VideoOff className="h-10 w-10 mx-auto"/>
                        <p className="mt-2">Maintenance</p>
                    </div>
                )}
            </CardContent>
        </Card>
    )
}


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
  }, []);

  const handleQrCodeScanned = useCallback((code: string) => {
    stopScanning();
    setIsScanning(false); 
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
                return;
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
          // ensure the scan loop starts
          if (animationFrameId.current) {
            cancelAnimationFrame(animationFrameId.current);
          }
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
    if (isScanning && hasCameraPermission) {
      animationFrameId.current = requestAnimationFrame(scanLoop);
    } else {
      if (animationFrameId.current) {
        cancelAnimationFrame(animationFrameId.current);
      }
    }
    return () => {
        if(animationFrameId.current) {
            cancelAnimationFrame(animationFrameId.current)
        }
    }
  }, [isScanning, hasCameraPermission, scanLoop])


  const availableStations = stations?.filter(s => s.status === 'available') || [];

  const handleAssignStation = () => {
    if(!firestore || !scannedClient || !selectedStationId) return;
    const startTime = new Date().toISOString();

    const stationRef = doc(firestore, "stations", selectedStationId);
    const stationData = stations?.find(s => s.id === selectedStationId);
    
    updateDocumentNonBlocking(stationRef, { 
        status: 'in use', 
        currentClientId: scannedClient.id,
        sessionStartTime: startTime 
    });
    
    const clientRef = doc(firestore, "clients", scannedClient.id);
    updateDocumentNonBlocking(clientRef, { currentStationId: selectedStationId });

    const historyRef = collection(firestore, 'clients', scannedClient.id, 'history');
    addDocumentNonBlocking(historyRef, {
        timestamp: startTime,
        type: 'check-in',
        description: `Checked in at station ${stationData?.id} (${stationData?.type})`,
    });

    addDocumentNonBlocking(collection(firestore, "usageLogs"), {
        clientId: scannedClient.id,
        stationId: selectedStationId,
        startTime: startTime,
        endTime: null,
    });

    toast({
        title: "Poste Assigné",
        description: `${scannedClient.name} a été assigné au poste ${stationData?.id}.`
    });
    setScannedClient(null);
    setSelectedStationId("");
  }
  
  const handleReleaseStation = (stationToRelease: Station) => {
    if(!firestore || !stationToRelease.currentClientId) return;

    const stationRef = doc(firestore, "stations", stationToRelease.id);
    updateDocumentNonBlocking(stationRef, { status: 'available', currentClientId: null, sessionStartTime: null });

    const clientRef = doc(firestore, "clients", stationToRelease.currentClientId);
    updateDocumentNonBlocking(clientRef, { currentStationId: null });

    const historyRef = collection(firestore, 'clients', stationToRelease.currentClientId, 'history');
    addDocumentNonBlocking(historyRef, {
        timestamp: new Date().toISOString(),
        type: 'check-out',
        description: `Checked out from station ${stationToRelease.id} (${stationToRelease.type})`,
    });

    toast({
        title: "Poste Libéré",
        description: `Le poste ${stationToRelease.id} est maintenant disponible.`
    });
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

  const stationsWithClients = stations?.map(station => {
      const client = clients?.find(c => c.id === station.currentClientId);
      return { station, client };
  })


  return (
    <>
      <PageHeader
        title={t('qrCodeScanner')}
        description={t('qrCodeScannerDescription')}
        className="px-0"
      />
      <div className="grid gap-8 lg:grid-cols-3">
        <div className="lg:col-span-1 space-y-8">
            <Card>
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

            {loading && (
              <div className="flex items-center justify-center h-full">
                <div className="flex flex-col items-center gap-2">
                  <QrCode className="h-10 w-10 animate-pulse text-primary" />
                  <p className="text-muted-foreground">Recherche du client...</p>
                </div>
              </div>
            )}
            {!loading && scannedClient && (
            <Card>
                <CardHeader>
                    <CardTitle className="font-headline">Profil du Client</CardTitle>
                    <CardDescription>
                    Assigner un poste ou gérer le compte.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
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
                     {scannedClient.currentStationId ? (
                         <Alert>
                            <Users className="h-4 w-4"/>
                            <AlertTitle>Client déjà en session</AlertTitle>
                            <AlertDescription>
                                {scannedClient.name} joue actuellement sur le poste {scannedClient.currentStationId}.
                            </AlertDescription>
                         </Alert>
                     ): (
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
                </CardContent>
            </Card>
            )}
        </div>

        <div className="lg:col-span-2">
            <Card>
                <CardHeader>
                    <CardTitle className="font-headline">Vue d'ensemble des Postes</CardTitle>
                    <CardDescription>Suivi en temps réel de l'état de toutes les stations.</CardDescription>
                </CardHeader>
                <CardContent className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {isLoadingStations && Array.from({length: 6}).map((_, i) => (
                        <Card key={i}>
                            <CardHeader><div className="h-5 w-3/4 bg-muted animate-pulse rounded-md"></div></CardHeader>
                            <CardContent className="flex items-center justify-center h-24">
                                <div className="h-8 w-1/2 bg-muted animate-pulse rounded-md"></div>
                            </CardContent>
                        </Card>
                    ))}
                    {stationsWithClients?.map(({station, client}) => (
                        <StationCard key={station.id} station={station} client={client} onRelease={handleReleaseStation} />
                    ))}
                </CardContent>
            </Card>
        </div>
      </div>
    </>
  );
}


