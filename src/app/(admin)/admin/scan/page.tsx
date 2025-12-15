
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
import { updateDocumentNonBlocking } from "@/firebase/non-blocking-updates";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";


export default function ScanPage() {
  const [scannedClient, setScannedClient] = useState<Client | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedStationId, setSelectedStationId] = useState<string>("");
  const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);
  const [videoDevices, setVideoDevices] = useState<MediaDeviceInfo[]>([]);
  const [currentVideoDeviceId, setCurrentVideoDeviceId] = useState<string | undefined>();
  const [isScanning, setIsScanning] = useState(false);
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
    setIsScanning(false);
  }, []);

  const handleQrCodeScanned = useCallback((code: string) => {
    stopScanning();
    setLoading(true);
    try {
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
    animationFrameId.current = requestAnimationFrame(scanLoop);
  }, [handleQrCodeScanned]);

  
  const startScanning = useCallback(() => {
      if (!isScanning) {
          setScannedClient(null);
          setIsScanning(true);
          // S'assure qu'une seule boucle de scan est active
          if (animationFrameId.current) {
            cancelAnimationFrame(animationFrameId.current);
          }
          animationFrameId.current = requestAnimationFrame(scanLoop);
      }
  }, [isScanning, scanLoop]);


  const getCameraPermission = useCallback(async (deviceId?: string) => {
    stopScanning();
    if (streamRef.current && !deviceId) { // Si on a déjà un stream et qu'on ne change pas de caméra
      if (videoRef.current) {
        videoRef.current.srcObject = streamRef.current;
        startScanning();
      }
      return;
    }

    if (streamRef.current) {
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
        videoRef.current.onloadedmetadata = () => {
            // Ne démarre le scan que si ce n'est pas déjà fait
            if (!isScanning) {
              startScanning();
            }
        }
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
      toast({
        variant: 'destructive',
        title: 'Accès Caméra Refusé',
        description: 'Veuillez activer les permissions de la caméra dans les paramètres de votre navigateur pour utiliser cette application.',
      });
    }
  }, [toast, startScanning, stopScanning, isScanning]);


  useEffect(() => {
    getCameraPermission();
    
    return () => {
        stopScanning();
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null;
        }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);


  const availableStations = stations?.filter(s => s.status === 'available') || [];

  const handleAssignStation = () => {
    if(!firestore || !scannedClient || !selectedStationId) return;

    const stationRef = doc(firestore, "stations", selectedStationId);
    updateDocumentNonBlocking(stationRef, { status: 'in use', currentClientId: scannedClient.id });
    
    const clientRef = doc(firestore, "clients", scannedClient.id);
    updateDocumentNonBlocking(clientRef, { currentStationId: selectedStationId });

    toast({
        title: "Poste Assigné",
        description: `${scannedClient.name} a été assigné au poste ${stations?.find(s => s.id === selectedStationId)?.id}.`
    });

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
        title: "Poste Libéré",
        description: `Le poste ${scannedClient.currentStationId} est maintenant disponible.`
    });

    setScannedClient(prev => prev ? { ...prev, currentStationId: undefined } : null);
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
        title="Scanneur de Code QR"
        description="Scannez le code QR d'un client pour l'enregistrer ou gérer son compte."
        className="px-0"
      />
      <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="font-headline">Scanner</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center justify-center gap-6 text-center h-full min-h-[300px]">
            <div className="w-full max-w-sm h-auto aspect-square bg-muted rounded-lg flex items-center justify-center overflow-hidden relative">
              <video ref={videoRef} className="w-full h-full object-cover" autoPlay muted playsInline />
               <canvas ref={canvasRef} className="hidden" />
              {hasCameraPermission === false && (
                  <div className="absolute flex flex-col items-center text-muted-foreground">
                      <VideoOff className="h-16 w-16 mb-4" />
                      <p>Caméra non disponible</p>
                  </div>
              )}
               {isScanning && (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <div className="w-2/3 h-2/3 border-4 border-primary/50 rounded-lg animate-pulse" />
                  </div>
              )}
            </div>
            {hasCameraPermission === false && (
                <Alert variant="destructive">
                    <AlertTitle>Accès Caméra Requis</AlertTitle>
                    <AlertDescription>
                        Veuillez autoriser l'accès à la caméra dans les paramètres de votre navigateur pour utiliser cette fonctionnalité.
                    </AlertDescription>
                </Alert>
            )}
            <div className="flex gap-2 w-full max-w-xs">
                <Button onClick={startScanning} disabled={isLoadingClients || !hasCameraPermission}>
                {isScanning ? "Scanning..." : "Scan"}
                </Button>
                {videoDevices.length > 1 && (
                    <Button onClick={handleSwapCamera} variant="outline" size="icon">
                        <Camera className="h-5 w-5" />
                        <span className="sr-only">Changer de Caméra</span>
                    </Button>
                )}
            </div>
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
                  <div>
                    <h3 className="text-xl font-semibold">{scannedClient.name}</h3>
                    <p className="text-muted-foreground">{scannedClient.email}</p>
                    <Badge variant="secondary" className="mt-2">{scannedClient.subscriptionTier}</Badge>
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
                            <p className="text-lg font-bold">{clientCurrentStation.id}</p>
                            <p className="text-sm text-muted-foreground">{clientCurrentStation.type}</p>
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
                
                <div className="grid gap-4">
                  <h4 className="font-semibold">Actions</h4>
                  <div className="flex flex-wrap gap-2">
                    <Button variant="secondary">
                      <Gift className="mr-2 h-4 w-4" /> Ajouter un Bonus
                    </Button>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="hours" className="flex items-center">
                        <Clock className="mr-2 h-4 w-4 text-muted-foreground"/>
                        Gérer les Heures d'Abonnement
                    </Label>
                    <div className="flex gap-2">
                        <Input id="hours" type="number" placeholder={`${scannedClient.subscriptionHours} heures`} />
                        <Button variant="outline">Mettre à jour</Button>
                    </div>
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
