
"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import jsQR from "jsqr";
import { QrCode, User, CheckCircle, Gift, Clock, LogOut, Gamepad2, VideoOff, Camera, MonitorPlay, Tv, Users, ScanLine, Wallet } from "lucide-react";
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
import { collection, query, doc } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";
import { addDocumentNonBlocking, updateDocumentNonBlocking } from "@/firebase/non-blocking-updates";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { useTranslation } from "@/hooks/use-translation";
import { cn, formatCurrency } from "@/lib/utils";
import { formatDistanceToNowStrict, differenceInMinutes } from 'date-fns';

function QrScanner({ onScan, onPermissionChange, onDevices, onCameraChange, currentDeviceId }: {
    onScan: (data: string) => void;
    onPermissionChange: (hasPermission: boolean) => void;
    onDevices: (devices: MediaDeviceInfo[]) => void;
    onCameraChange: (deviceId?: string) => void;
    currentDeviceId?: string;
}) {
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const animationFrameId = useRef<number>();
    const { toast } = useToast();

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
                    if (navigator.vibrate) {
                        navigator.vibrate(200);
                    }
                    onScan(code.data);
                    return; // Stop the loop once a code is found
                }
            }
        }
        animationFrameId.current = requestAnimationFrame(scanLoop);
    }, [onScan]);

    const startScan = useCallback(() => {
        if (videoRef.current && videoRef.current.srcObject) {
            animationFrameId.current = requestAnimationFrame(scanLoop);
        }
    }, [scanLoop]);

    const getCameraPermission = useCallback(async (deviceId?: string) => {
        if (streamRef.current && deviceId !== currentDeviceId) {
            streamRef.current.getTracks().forEach(track => track.stop());
        }

        try {
            const constraints: MediaStreamConstraints = {
                video: deviceId ? { deviceId: { exact: deviceId } } : { facingMode: 'environment' }
            };
            const stream = await navigator.mediaDevices.getUserMedia(constraints);
            streamRef.current = stream;
            onPermissionChange(true);

            if (videoRef.current) {
                videoRef.current.srcObject = stream;
                videoRef.current.play().then(() => {
                    startScan();
                }).catch(e => console.error("Video play failed", e));
            }
            
            const devices = await navigator.mediaDevices.enumerateDevices();
            const videoInputs = devices.filter(d => d.kind === 'videoinput');
            onDevices(videoInputs);
            
            const currentTrack = stream.getVideoTracks()[0];
            const currentSettings = currentTrack.getSettings();
            onCameraChange(currentSettings.deviceId);

        } catch (error) {
            console.error('Erreur d\'accès à la caméra:', error);
            onPermissionChange(false);
            toast({
                variant: 'destructive',
                title: 'Accès Caméra Refusé',
                description: 'Veuillez activer les permissions de la caméra dans les paramètres de votre navigateur.',
            });
        }
    }, [onPermissionChange, onDevices, onCameraChange, startScan, toast, currentDeviceId]);

    useEffect(() => {
        getCameraPermission(currentDeviceId);

        return () => {
            if (animationFrameId.current) {
                cancelAnimationFrame(animationFrameId.current);
            }
            if (streamRef.current) {
                streamRef.current.getTracks().forEach(track => track.stop());
                streamRef.current = null;
            }
        };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [currentDeviceId]);


    return (
        <div className="w-full max-w-[400px] aspect-square bg-muted rounded-lg flex items-center justify-center overflow-hidden relative group mx-auto">
            <video ref={videoRef} className="w-full h-full object-cover" autoPlay muted playsInline />
            <canvas ref={canvasRef} className="hidden" />
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="w-2/3 h-2/3 border-4 border-primary/50 rounded-lg animate-pulse" />
            </div>
        </div>
    );
}


function AssignClientDialog({ station, clients }: { station: Station; clients: Client[] | null }) {
    const [isOpen, setIsOpen] = useState(false);
    const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);
    const firestore = useFirestore();
    const { toast } = useToast();

    const handleAssignStation = (scannedClient: Client) => {
        if (!firestore) return;
        const startTime = new Date().toISOString();

        const stationRef = doc(firestore, "stations", station.id);
        updateDocumentNonBlocking(stationRef, {
            status: 'in use',
            currentClientId: scannedClient.id,
            sessionStartTime: startTime
        });

        const clientRef = doc(firestore, "clients", scannedClient.id);
        updateDocumentNonBlocking(clientRef, { currentStationId: station.id });

        const historyRef = collection(firestore, 'clients', scannedClient.id, 'history');
        addDocumentNonBlocking(historyRef, {
            timestamp: startTime,
            type: 'check-in',
            description: `Checked in at station ${station.id} (${station.type})`,
        });

        addDocumentNonBlocking(collection(firestore, "usageLogs"), {
            clientId: scannedClient.id,
            stationId: station.id,
            startTime: startTime,
            endTime: null,
        });

        toast({
            title: "Poste Assigné",
            description: `${scannedClient.name} a été assigné au poste ${station.id}.`
        });
        setIsOpen(false);
    }

    const onScan = (data: string) => {
        try {
            const parsed = JSON.parse(data);
            if (parsed.clientId) {
                const foundClient = clients?.find(c => c.id === parsed.clientId);
                if (foundClient) {
                    if (foundClient.currentStationId) {
                         toast({
                            variant: "destructive",
                            title: "Client déjà en session",
                            description: `${foundClient.name} joue actuellement sur le poste ${foundClient.currentStationId}.`,
                        });
                        setIsOpen(false);
                    } else {
                        handleAssignStation(foundClient);
                    }
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
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="w-full">
                    <QrCode className="mr-2 h-4 w-4" /> Assigner un client
                </Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Assigner un client à {station.id}</DialogTitle>
                    <DialogDescription>
                        Scannez le code QR du client pour commencer sa session sur ce poste.
                    </DialogDescription>
                </DialogHeader>
                {isOpen && (
                    <QrScanner 
                        onScan={onScan} 
                        onPermissionChange={setHasCameraPermission}
                        onDevices={()=>{}}
                        onCameraChange={()=>{}}
                    />
                )}
                {hasCameraPermission === false && (
                    <Alert variant="destructive">
                        <AlertTitle>Accès Caméra Requis</AlertTitle>
                        <AlertDescription>
                            Veuillez autoriser l'accès à la caméra pour utiliser cette fonctionnalité.
                        </AlertDescription>
                    </Alert>
                )}
            </DialogContent>
        </Dialog>
    )
}

function BonusPointsDialog({ clients, trigger }: { clients: Client[] | null, trigger: React.ReactNode }) {
    const [isOpen, setIsOpen] = useState(false);
    const [scannedClient, setScannedClient] = useState<Client | null>(null);
    const [hoursToAdd, setHoursToAdd] = useState<number | string>("");
    const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);
    const firestore = useFirestore();
    const { toast } = useToast();

    const onScan = (data: string) => {
        try {
            const parsed = JSON.parse(data);
            if (parsed.clientId) {
                const foundClient = clients?.find(c => c.id === parsed.clientId);
                if (foundClient) {
                    setScannedClient(foundClient);
                } else {
                     toast({
                        variant: "destructive",
                        title: "Client non trouvé",
                        description: "Aucun client ne correspond à ce code QR.",
                    });
                }
            }
        } catch(e) {
            toast({
                variant: "destructive",
                title: "Erreur de Scan",
                description: "Format de code QR invalide.",
            });
        }
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

        setScannedClient(null);
        setHoursToAdd("");
        setIsOpen(false);
    }
    
    useEffect(() => {
        if(!isOpen) {
            setScannedClient(null);
            setHoursToAdd("");
        }
    }, [isOpen])

    return (
         <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                {trigger}
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Attribuer des Heures Bonus</DialogTitle>
                    <DialogDescription>
                        Scannez le QR code du client pour recharger son compte en heures.
                    </DialogDescription>
                </DialogHeader>
                {!scannedClient ? (
                     <>
                        {isOpen && <QrScanner 
                            onScan={onScan} 
                            onPermissionChange={setHasCameraPermission}
                            onDevices={()=>{}}
                            onCameraChange={()=>{}}
                        />}
                        {hasCameraPermission === false && (
                            <Alert variant="destructive">
                                <AlertTitle>Accès Caméra Requis</AlertTitle>
                                <AlertDescription>Veuillez autoriser l'accès à la caméra.</AlertDescription>
                            </Alert>
                        )}
                    </>
                ) : (
                    <div className="space-y-4 pt-4">
                        <div className="flex items-center gap-4 p-4 rounded-lg bg-muted">
                            <User className="h-10 w-10 text-muted-foreground" />
                            <div>
                                <p className="font-semibold">{scannedClient.name}</p>
                                <p className="text-sm text-muted-foreground">Heures actuelles : {scannedClient.subscriptionHours || 0}</p>
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="hours">Heures à ajouter</Label>
                            <Input 
                                id="hours" 
                                type="number" 
                                placeholder="ex: 5" 
                                value={hoursToAdd}
                                onChange={(e) => setHoursToAdd(e.target.value)}
                            />
                        </div>
                        <Button onClick={handleUpdateHours} className="w-full">
                            <CheckCircle className="mr-2 h-4 w-4" /> Confirmer
                        </Button>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    )
}

function calculatePrice(stationType: Station['type'], durationInMinutes: number, startTime: Date): number {
    const startHour = startTime.getHours();
    const isEvening = startHour >= 20;

    let price = 0;
    const hours = durationInMinutes / 60;

    switch(stationType) {
        case 'PC':
            price = hours * 20;
            break;
        case 'PS5':
            if (isEvening) {
                // 30 DH/h or 50 DH/2h (i.e. 25 DH/h)
                if (durationInMinutes <= 30) price = 20;
                else if (durationInMinutes <= 60) price = 30;
                else if (durationInMinutes <= 120) price = 50;
                else price = Math.ceil(hours) * 25; // Pro-rata on the 2h price
            } else {
                price = hours * 20;
            }
            break;
        case 'PS5 VIP':
        case 'VR Simulator':
             // 45 DH/h or 75 DH/2h (i.e. 37.5 DH/h)
            if (durationInMinutes <= 60) price = 45;
            else if (durationInMinutes <= 120) price = 75;
            else price = Math.ceil(hours) * 37.5;
            break;
    }

    return Math.ceil(price); // Round up to nearest Dirham
}


function ReleaseStationDialog({ station, client, allClients }: { station: Station, client?: Client, allClients: Client[] | null }) {
    const [isOpen, setIsOpen] = useState(false);
    const firestore = useFirestore();
    const { toast } = useToast();

    if (!station.sessionStartTime || !client) {
        return (
             <Button variant="destructive" size="sm" className="mt-2 w-full" disabled>
                <LogOut className="mr-2 h-4 w-4"/> Libérer
            </Button>
        )
    }

    const startTime = new Date(station.sessionStartTime);
    const durationInMinutes = differenceInMinutes(new Date(), startTime);
    const hours = Math.floor(durationInMinutes / 60);
    const minutes = durationInMinutes % 60;
    const durationString = `${hours}h ${minutes}m`;
    const cost = calculatePrice(station.type, durationInMinutes, startTime);

    const handleConfirmRelease = () => {
        if(!firestore) return;

        const stationRef = doc(firestore, "stations", station.id);
        updateDocumentNonBlocking(stationRef, { status: 'available', currentClientId: null, sessionStartTime: null });

        if(station.currentClientId) {
            const clientRef = doc(firestore, "clients", station.currentClientId);
            updateDocumentNonBlocking(clientRef, { currentStationId: null });

            const historyRef = collection(firestore, 'clients', station.currentClientId, 'history');
            addDocumentNonBlocking(historyRef, {
                timestamp: new Date().toISOString(),
                type: 'check-out',
                description: `Checked out from station ${station.id} (${station.type}). Session: ${durationString}, Cost: ${formatCurrency(cost, 'MAD')}`,
            });
        }

        toast({
            title: "Poste Libéré",
            description: `Le poste ${station.id} est maintenant disponible.`
        });
        setIsOpen(false);
    }
    
    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                 <Button variant="destructive" size="sm" className="mt-2 w-full">
                    <LogOut className="mr-2 h-4 w-4"/> Libérer
                </Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Finaliser la session de {client.name}</DialogTitle>
                    <DialogDescription>
                        Poste: {station.id} ({station.type})
                    </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                    <div className="flex justify-around text-center">
                        <div>
                            <p className="text-sm text-muted-foreground">Durée de la session</p>
                            <p className="text-2xl font-bold">{durationString}</p>
                        </div>
                        <div>
                            <p className="text-sm text-muted-foreground">Montant à payer</p>
                            <p className="text-2xl font-bold text-primary">{formatCurrency(cost, 'MAD')}</p>
                        </div>
                    </div>
                    <Separator />
                     <div className="flex flex-col gap-2">
                        <BonusPointsDialog
                            clients={allClients}
                            trigger={<Button variant="outline" className="w-full"><Gift className="mr-2 h-4 w-4"/> Attribuer un bonus</Button>}
                        />
                         <Button onClick={handleConfirmRelease} className="w-full">
                            <CheckCircle className="mr-2 h-4 w-4"/> Confirmer et Libérer
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    )
}


function StationCard({ station, client, isLoadingClients, allClients }: { 
    station: Station, 
    client?: Client, 
    isLoadingClients: boolean,
    allClients: Client[] | null
}) {
    const [timer, setTimer] = useState("0m");

    useEffect(() => {
        if (station.status === 'in use' && station.sessionStartTime) {
            const updateTimer = () => {
                const startTime = new Date(station.sessionStartTime!);
                setTimer(formatDistanceToNowStrict(startTime, { roundingMethod: 'floor' }));
            };
            updateTimer();
            const intervalId = setInterval(updateTimer, 10000); // update every 10s is enough
            return () => clearInterval(intervalId);
        }
    }, [station.status, station.sessionStartTime]);


    const getIcon = (type: Station['type']) => {
        switch (type) {
          case 'PC':
            return <Monitor className="h-5 w-5" />;
          case 'PS5':
            return <Gamepad2 className="h-5 w-5" />;
          case 'PS5 VIP':
            return <Gamepad2 className="h-5 w-5 text-primary" />;
          case 'VR Simulator':
            return <Tv className="h-5 w-5" />;
          default:
            return <Gamepad2 className="h-5 w-5" />;
        }
      };

    const clientName = isLoadingClients ? "Chargement..." : (client?.name || "Client inconnu");
    
    return (
        <Card className="flex flex-col transition-all duration-300">
             <CardHeader className="flex flex-row items-start justify-between pb-2">
                <CardTitle className="font-headline text-lg font-medium flex items-center gap-2">
                    {getIcon(station.type)}
                    <span className="break-all">{station.id}</span>
                </CardTitle>
                <Badge variant='outline' className={cn(
                    "flex-shrink-0 capitalize border-none text-white",
                    station.status === 'available' && "bg-green-500",
                    station.status === 'in use' && "bg-orange-500",
                    station.status === 'maintenance' && "bg-red-500",
                )}>{station.status}</Badge>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col justify-center items-center text-center p-4 space-y-3">
                {station.status === 'in use' ? (
                    <>
                        <User className="h-8 w-8 mx-auto text-muted-foreground" />
                        <p className="font-semibold">{clientName}</p>
                        <p className="text-2xl font-mono font-bold text-primary">{timer}</p>
                        <ReleaseStationDialog station={station} client={client} allClients={allClients}/>
                    </>
                ) : station.status === 'available' ? (
                    <>
                        <MonitorPlay className="h-10 w-10 mx-auto text-muted-foreground"/>
                        <p className="mt-2 text-muted-foreground">Disponible</p>
                        <AssignClientDialog station={station} clients={allClients} />
                    </>
                ) : (
                     <>
                        <VideoOff className="h-10 w-10 mx-auto text-muted-foreground"/>
                        <p className="mt-2 text-muted-foreground">Maintenance</p>
                     </>
                )}
            </CardContent>
        </Card>
    )
}


export default function ScanPage() {
  const { t } = useTranslation();
  
  const firestore = useFirestore();

  const clientsQuery = useMemoFirebase(
    () => (firestore ? query(collection(firestore, 'clients')) : null),
    [firestore]
  );
  const { data: clients, isLoading: isLoadingClients } = useCollection<Client>(clientsQuery);
  
  const stationsQuery = useMemoFirebase(
    () => (firestore ? query(collection(firestore, 'stations').withConverter({
        fromFirestore: (snapshot) => {
            const data = snapshot.data();
            return { id: snapshot.id, ...data } as Station;
        },
        toFirestore: (model) => model,
    }
    )) : null),
    [firestore]
  );
  const { data: stations, isLoading: isLoadingStations } = useCollection<Station>(stationsQuery);

  
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
      >
        <BonusPointsDialog
            clients={clients}
            trigger={
                <Button size="sm" className="h-8 gap-1">
                    <Gift className="h-3.5 w-3.5" />
                    <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">
                        Attribuer un bonus
                    </span>
                </Button>
            }
        />
      </PageHeader>
      
      <Card>
          <CardHeader>
              <CardTitle className="font-headline">Vue d'ensemble des Postes</CardTitle>
              <CardDescription>Suivi en temps réel de l'état de toutes les stations.</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {isLoadingStations && Array.from({length: 8}).map((_, i) => (
                  <Card key={i}>
                      <CardHeader><div className="h-5 w-3/4 bg-muted animate-pulse rounded-md"></div></CardHeader>
                      <CardContent className="flex items-center justify-center h-32">
                          <div className="h-8 w-1/2 bg-muted animate-pulse rounded-md"></div>
                      </CardContent>
                  </Card>
              ))}
              {stationsWithClients?.map(({station, client}) => (
                  <StationCard 
                    key={station.id} 
                    station={station} 
                    client={client} 
                    isLoadingClients={isLoadingClients}
                    allClients={clients}
                  />
              ))}
          </CardContent>
      </Card>
    </>
  );
}
