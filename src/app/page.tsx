
'use client';
import Image from 'next/image';
import { Gamepad2, Headset, Monitor, Instagram, MapPin, Phone, LogIn, Car, Tag, Star, Tv, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import ClientHeader from '@/components/client/header';
import { useCollection, useDoc, useFirestore, useUser } from '@/firebase';
import { collection, query, doc, addDoc, where, orderBy } from 'firebase/firestore';
import { useMemoFirebase } from '@/firebase/provider';
import type { Station, Client, Reservation, Promotion, Price } from '@/app/lib/data';
import { cn, formatCurrency } from '@/lib/utils';
import { useState, useMemo, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useTranslation } from '@/hooks/use-translation';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { addHours, format, setHours, setMinutes, startOfToday, getHours, getMinutes } from 'date-fns';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious, type CarouselApi } from '@/components/ui/carousel';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Alert, AlertDescription } from '@/components/ui/alert';

function ReservationDialog({ 
    station, 
    user,
    client,
    clientReservations
}: { 
    station: Station, 
    user: any,
    client: Client | null,
    clientReservations: Reservation[] | null 
}) {
    const { t } = useTranslation();
    const [isOpen, setIsOpen] = useState(false);
    const [isLoginAlertOpen, setIsLoginAlertOpen] = useState(false);
    const [selectedHour, setSelectedHour] = useState<string>('');
    const [selectedMinute, setSelectedMinute] = useState<string>('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const firestore = useFirestore();
    const { toast } = useToast();

    const timeSlots = useMemo(() => {
        const now = new Date();
        const openingHour = 11;
        const closingHour = 23;
        
        let startHour = getHours(now);
        let startMinute = Math.ceil(getMinutes(now) / 5) * 5; // Round up to next 5 mins

        if (startMinute >= 60) {
            startHour += 1;
            startMinute = 0;
        }

        if (startHour < openingHour) {
            startHour = openingHour;
            startMinute = 0;
        }
        
        const hours = [];
        for (let i = startHour; i <= closingHour; i++) {
            hours.push(i);
        }

        const minutes = [];
        for (let i = 0; i < 60; i += 5) {
            minutes.push(i);
        }

        return { hours, minutes, startHour, startMinute };
    }, []);

    const availableMinutes = useMemo(() => {
        if (!selectedHour || parseInt(selectedHour) > timeSlots.startHour) {
            return timeSlots.minutes;
        }
        return timeSlots.minutes.filter(m => m >= timeSlots.startMinute);
    }, [selectedHour, timeSlots]);


    const handleReservation = async () => {
        if (!firestore || !user || !user.uid) {
            toast({ 
                variant: 'destructive', 
                title: "Erreur", 
                description: "Session non valide. Veuillez vous reconnecter pour réserver." 
            });
            return;
        }

        if (client?.currentStationId) {
            toast({
                variant: "destructive",
                title: "Réservation impossible",
                description: `Vous avez déjà une session en cours sur le poste ${client.currentStationId}.`,
            });
            return;
        }

        const hasActiveReservation = clientReservations?.some(res => res.status === 'pending' || res.status === 'confirmed');
        if (hasActiveReservation) {
            toast({
                variant: "destructive",
                title: "Réservation impossible",
                description: "Vous avez déjà une réservation en attente ou confirmée. Vous ne pouvez en avoir qu'une à la fois.",
            });
            return;
        }

        if (!selectedHour || !selectedMinute) {
            toast({
                variant: 'destructive',
                title: 'Heure non sélectionnée',
                description: "Veuillez choisir une heure et des minutes."
            });
            return;
        }

        const start = setMinutes(setHours(startOfToday(), parseInt(selectedHour)), parseInt(selectedMinute));
        const end = addHours(start, 1);

        setIsSubmitting(true);
        try {
            const reservationsRef = collection(firestore, 'clients', user.uid, 'reservations');
            await addDoc(reservationsRef, {
                clientId: user.uid,
                stationId: station.id,
                startTime: start.toISOString(),
                endTime: end.toISOString(),
                status: 'pending'
            });

            toast({
                title: "Réservation confirmée !",
                description: `Votre réservation pour ${station.id} de ${format(start, 'HH:mm')} à ${format(end, 'HH:mm')} est enregistrée.`,
            });
            setIsOpen(false);
            setSelectedHour('');
            setSelectedMinute('');
        } catch (error) {
            console.error("Error creating reservation: ", error);
            toast({ 
                variant: 'destructive', 
                title: "Erreur de Réservation", 
                description: "Une erreur est survenue lors de la création de votre réservation. Veuillez réessayer."
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!user) {
        return (
            <AlertDialog open={isLoginAlertOpen} onOpenChange={setIsLoginAlertOpen}>
                <AlertDialogTrigger asChild>
                    <Button 
                        variant="outline" 
                        className="mt-4 w-full"
                    >
                        {t('bookNow')}
                    </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Connexion requise</AlertDialogTitle>
                        <AlertDialogDescription>
                            Vous devez être connecté pour pouvoir réserver un poste. Veuillez vous connecter ou créer un compte.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Annuler</AlertDialogCancel>
                        <AlertDialogAction asChild>
                            <Link href="/login-client">
                                <LogIn className="mr-2 h-4 w-4" />
                                Se connecter
                            </Link>
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        )
    }
    
    return (
        <Dialog open={isOpen} onOpenChange={(open) => {
            setIsOpen(open);
            if (!open) {
                setSelectedHour('');
                setSelectedMinute('');
            }
        }}>
            <DialogTrigger asChild>
                <Button 
                    variant="outline" 
                    className="mt-4 w-full" 
                    disabled={station.status !== 'available'}
                >
                  {t('bookNow')}
                </Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Réserver le poste {station.id}</DialogTitle>
                    <DialogDescription>
                        Choisissez une heure de début pour aujourd'hui. La réservation dure 1 heure.
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="grid gap-2">
                            <Label htmlFor="start-hour">Heure</Label>
                            <Select value={selectedHour} onValueChange={(value) => {
                                setSelectedHour(value);
                                // Reset minute if the new hour doesn't support the old minute
                                if (parseInt(value) === timeSlots.startHour && parseInt(selectedMinute) < timeSlots.startMinute) {
                                    setSelectedMinute('');
                                }
                            }}>
                                <SelectTrigger id="start-hour">
                                    <SelectValue placeholder="Heure" />
                                </SelectTrigger>
                                <SelectContent>
                                    {timeSlots.hours.map(hour => (
                                        <SelectItem key={hour} value={String(hour)}>
                                            {String(hour).padStart(2, '0')}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                         <div className="grid gap-2">
                            <Label htmlFor="start-minute">Minute</Label>
                            <Select value={selectedMinute} onValueChange={setSelectedMinute} disabled={!selectedHour}>
                                <SelectTrigger id="start-minute">
                                    <SelectValue placeholder="Min" />
                                </SelectTrigger>
                                <SelectContent>
                                    {availableMinutes.map(minute => (
                                        <SelectItem key={minute} value={String(minute)}>
                                            {String(minute).padStart(2, '0')}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                     {timeSlots.hours.length === 0 && (
                        <div className="p-4 text-center text-sm text-muted-foreground col-span-2">
                            Aucun créneau disponible pour aujourd'hui.
                        </div>
                    )}
                    <Alert>
                        <AlertTriangle className="h-4 w-4" />
                        <AlertDescription className="text-xs">
                            Veuillez vous présenter au moins 5 minutes avant votre heure de réservation. En cas de retard, votre réservation pourra être annulée.
                        </AlertDescription>
                    </Alert>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => setIsOpen(false)}>Annuler</Button>
                    <Button onClick={handleReservation} disabled={isSubmitting || !selectedHour || !selectedMinute}>
                        {isSubmitting ? "Réservation..." : "Confirmer"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}


export default function Home() {
  const { t } = useTranslation();
  const { user } = useUser();
  const [filter, setFilter] = useState('All');
  const [showOnlyAvailable, setShowOnlyAvailable] = useState(false);
  const firestore = useFirestore();
  const [api, setApi] = useState<CarouselApi>()
  const [current, setCurrent] = useState(0)
  const [count, setCount] = useState(0)

  const stationsQuery = useMemoFirebase(
    () => (firestore ? query(collection(firestore, 'stations')) : null),
    [firestore]
  );
  const { data: stations, isLoading: isLoadingStations } = useCollection<Station>(stationsQuery);

  const promotionsQuery = useMemoFirebase(
    () => (firestore ? query(collection(firestore, 'promotions')) : null),
    [firestore]
  );
  const { data: promotions, isLoading: isLoadingPromotions } = useCollection<Promotion>(promotionsQuery);
  
  const pricesQuery = useMemoFirebase(
    () => (firestore ? query(collection(firestore, 'prices'), orderBy('startHour', 'asc')) : null),
    [firestore]
  );
  const { data: prices, isLoading: isLoadingPrices } = useCollection<Price>(pricesQuery);

  const clientRef = useMemoFirebase(
    () => (user ? doc(firestore!, 'clients', user.uid) : null),
    [user, firestore]
  );
  const { data: client } = useDoc<Client>(clientRef);

  const reservationsQuery = useMemoFirebase(
      () => user && firestore ? query(
          collection(firestore, 'clients', user.uid, 'reservations'),
          where('status', 'in', ['pending', 'confirmed'])
      ) : null,
      [user, firestore]
  );
  const { data: reservations } = useCollection<Reservation>(reservationsQuery);


  const getIcon = (type: string) => {
    switch (type) {
      case 'PC':
        return <Monitor className="h-6 w-6" />;
      case 'PS5':
        return <Gamepad2 className="h-6 w-6" />;
      case 'PS5 VIP':
        return <Gamepad2 className="h-6 w-6 text-primary" />;
      case 'VR':
        return <Tv className="h-6 w-6" />;
      case 'Simulator':
        return <Car className="h-6 w-6" />;
      default:
        return null;
    }
  };

  const stationTypes = [
    'All',
    'PC',
    'PS5',
    'PS5 VIP',
    'VR',
    'Simulator',
  ];

  const filteredStations = useMemo(() => {
    let typeFiltered = stations?.filter(
        (station) => filter === 'All' || station.type === filter
    ) || [];

    if (showOnlyAvailable) {
        return typeFiltered.filter(station => station.status === 'available');
    }

    return typeFiltered;
  }, [stations, filter, showOnlyAvailable]);

    useEffect(() => {
        if (!api) {
          return
        }
    
        setCount(api.scrollSnapList().length)
        setCurrent(api.selectedScrollSnap() + 1)
    
        api.on("select", () => {
          setCurrent(api.selectedScrollSnap() + 1)
        })
      }, [api, filteredStations]); // Re-run when filteredStations changes

  const getStatusKey = (status: Station['status']) => {
    switch(status) {
        case 'available': return 'statusAvailable';
        case 'in use': return 'statusInUse';
        case 'maintenance': return 'statusMaintenance';
    }
  }

  const pricesByStationType = useMemo(() => {
    if (!prices) return {};
    return prices.reduce((acc, price) => {
      if (!acc[price.stationType]) {
        acc[price.stationType] = [];
      }
      acc[price.stationType].push(price);
      return acc;
    }, {} as Record<string, Price[]>);
  }, [prices]);


  return (
    <div className="flex min-h-screen w-full flex-col">
      <ClientHeader />
      <main className="flex-1">
        <section className="relative w-full py-20 md:py-32 lg:py-40">
          <Image
            src="https://picsum.photos/seed/neons/1920/1080"
            data-ai-hint="neon gaming"
            alt="Hero background"
            fill
            className="object-cover -z-10"
          />
          <div className="absolute inset-0 bg-background/80 -z-10" />
          <div className="container mx-auto px-4 md:px-6">
            <div className="flex flex-col items-center space-y-4 text-center">
              <h1 className="font-headline text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl lg:text-6xl/none text-shadow-lg">
                {t('welcome')}
              </h1>
              <p className="mx-auto max-w-[700px] text-foreground/80 md:text-xl">
                {t('subtitle')}
              </p>
            </div>
          </div>
        </section>

        <section id="stations" className="w-full py-12 md:py-24 lg:py-32">
          <div className="container mx-auto px-4 md:px-6">
            <div className="flex flex-col items-center justify-center space-y-4 text-center">
              <div className="space-y-2">
                <h2 className="font-headline text-3xl font-bold tracking-tighter sm:text-5xl">
                  {t('stationStatus')}
                </h2>
                <p className="max-w-[900px] text-foreground/80 md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed">
                  {t('stationStatusDescription')}
                </p>
              </div>
              <div className="flex flex-wrap items-center justify-center gap-4 pt-6">
                {stationTypes.map((type) => (
                  <Button
                    key={type}
                    variant={filter === type ? 'default' : 'outline'}
                    onClick={() => setFilter(type)}
                  >
                    {type}
                  </Button>
                ))}
                <div className="flex items-center space-x-2 border rounded-md p-2">
                    <Switch 
                        id="available-only" 
                        checked={showOnlyAvailable}
                        onCheckedChange={setShowOnlyAvailable}
                    />
                    <Label htmlFor="available-only">{t('availableOnly')}</Label>
                </div>
              </div>
            </div>
            <div className="mx-auto max-w-5xl py-12 px-4 sm:px-6 lg:px-8">
              <Carousel setApi={setApi} className="w-full">
                <CarouselContent>
                  {isLoadingStations &&
                    Array.from({ length: 3 }).map((_, i) => (
                      <CarouselItem key={i} className="md:basis-1/2 lg:basis-1/3">
                        <div className="p-1">
                          <Card className="flex flex-col h-full">
                              <CardHeader className="flex flex-row items-center justify-between pb-2">
                                <div className="h-6 w-3/4 animate-pulse rounded-md bg-muted" />
                              </CardHeader>
                              <CardContent className="flex-1 flex flex-col justify-between p-6 pt-0">
                                <div className="space-y-4">
                                    <div className="h-4 w-1/2 animate-pulse rounded-md bg-muted" />
                                    <div className="mt-4 h-10 w-full animate-pulse rounded-md bg-muted" />
                                </div>
                                <div className="mt-4 h-10 w-full animate-pulse rounded-md bg-muted" />
                              </CardContent>
                          </Card>
                        </div>
                      </CarouselItem>
                  ))}
                  {!isLoadingStations && filteredStations.length > 0 ? filteredStations.map((station) => (
                    <CarouselItem key={station.id} className="md:basis-1/2 lg:basis-1/3">
                      <div className="p-1 h-full">
                        <Card className="flex flex-col h-full">
                          <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle className="font-headline text-lg font-medium">
                              {station.id}
                            </CardTitle>
                            {getIcon(station.type)}
                          </CardHeader>
                          <CardContent className="flex-1 flex flex-col justify-between">
                            <div className="space-y-2">
                              <p className="text-sm text-muted-foreground">
                                {station.type}
                              </p>
                              <div className="mt-2">
                                <h4 className="text-xs font-semibold text-muted-foreground">
                                  {t('availableGames')}
                                </h4>
                                <p className="text-sm">
                                  {station.games?.join(', ') || 'N/A'}
                                </p>
                              </div>
                              <Badge
                                className={cn(
                                  'mt-4 text-white w-full justify-center py-2 text-sm capitalize',
                                  {
                                    'bg-green-500 hover:bg-green-500/80':
                                      station.status === 'available',
                                    'bg-orange-500 hover:bg-orange-500/80':
                                      station.status === 'in use',
                                    'bg-red-500 hover:bg-red-500/80':
                                      station.status === 'maintenance',
                                  }
                                )}
                              >
                                {t(getStatusKey(station.status))}
                              </Badge>
                            </div>
                            <ReservationDialog station={station} user={user} client={client} clientReservations={reservations} />
                          </CardContent>
                        </Card>
                      </div>
                    </CarouselItem>
                  )) : (
                     <CarouselItem>
                        <div className="text-center py-12 text-muted-foreground">
                            {t('noStationsFound')}
                        </div>
                     </CarouselItem>
                  )}
                  </CarouselContent>
                  <CarouselPrevious className="hidden sm:flex" />
                  <CarouselNext className="hidden sm:flex" />
                </Carousel>
                <div className="py-2 flex justify-center gap-2">
                    {Array.from({ length: count }).map((_, i) => (
                        <button key={i} onClick={() => api?.scrollTo(i)} className={cn(
                            "h-2 w-2 rounded-full transition-colors",
                            i === current - 1 ? "bg-primary" : "bg-muted-foreground/30"
                        )} />
                    ))}
                </div>
            </div>
          </div>
        </section>
        
        <section id="promos" className="w-full py-12 md:py-24 lg:py-32 bg-muted">
          <div className="container mx-auto px-4 md:px-6">
            <div className="flex flex-col items-center justify-center space-y-4 text-center">
              <div className="space-y-2">
                <h2 className="font-headline text-3xl font-bold tracking-tighter sm:text-5xl">
                  Promotions Actuelles
                </h2>
                <p className="max-w-[900px] text-muted-foreground md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed">
                  Profitez de nos dernières offres et tournois !
                </p>
              </div>
            </div>
            <div className="mx-auto grid max-w-5xl items-start gap-8 py-12 sm:grid-cols-2 md:grid-cols-3">
              {isLoadingPromotions && Array.from({length: 3}).map((_, i) => (
                 <Card key={i} className="overflow-hidden">
                    <div className="h-40 w-full animate-pulse rounded-md bg-background" />
                    <CardHeader>
                      <div className="h-6 w-3/4 animate-pulse rounded-md bg-background" />
                    </CardHeader>
                    <CardContent>
                      <div className="h-4 w-full animate-pulse rounded-md bg-background" />
                       <div className="mt-2 h-4 w-5/6 animate-pulse rounded-md bg-background" />
                    </CardContent>
                  </Card>
              ))}
              {!isLoadingPromotions && promotions?.map(promo => (
                <Card key={promo.id} className="overflow-hidden shadow-lg transition-transform hover:scale-105">
                  <Image src={promo.image} alt={promo.title} width={600} height={400} data-ai-hint={promo.imageHint} className="aspect-[3/2] w-full object-cover"/>
                  <CardHeader>
                    <CardTitle className='font-headline'>{promo.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">{promo.description}</p>
                  </CardContent>
                </Card>
              ))}
               {!isLoadingPromotions && promotions?.length === 0 && (
                <p className="col-span-full text-center text-muted-foreground">Aucune promotion pour le moment.</p>
               )}
            </div>
          </div>
        </section>

        <section id="prices" className="w-full py-12 md:py-24 lg:py-32">
            <div className="container mx-auto px-4 md:px-6">
                <div className="flex flex-col items-center justify-center space-y-4 text-center">
                    <div className="space-y-2">
                        <h2 className="font-headline text-3xl font-bold tracking-tighter sm:text-5xl">Nos Tarifs</h2>
                        <p className="max-w-[900px] text-muted-foreground md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed">
                            Des prix pour tous les gamers. Découvrez nos tarifs par heure et par créneau.
                        </p>
                    </div>
                </div>
                <div className="mx-auto grid max-w-7xl gap-8 py-12 sm:grid-cols-2 lg:grid-cols-3">
                   {isLoadingPrices ? (
                    Array.from({length: 3}).map((_, i) => <div key={i} className="h-64 w-full animate-pulse rounded-md bg-muted" />)
                   ) : (
                    Object.entries(pricesByStationType).map(([type, typePrices]) => (
                        <Card key={type}>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2 font-headline">
                                    {getIcon(type)}
                                    {type}
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Créneau</TableHead>
                                            <TableHead>Semaine</TableHead>
                                            <TableHead className="text-right">Week-end</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {typePrices.map(price => (
                                            <TableRow key={price.id}>
                                                <TableCell className="font-medium text-muted-foreground">{`${String(price.startHour).padStart(2, '0')}:00 - ${String(price.endHour).padStart(2, '0')}:00`}</TableCell>
                                                <TableCell>{formatCurrency(price.pricePerHourWeekday)}/h</TableCell>
                                                <TableCell className="text-right font-semibold">{formatCurrency(price.pricePerHourWeekend)}/h</TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </CardContent>
                        </Card>
                    ))
                   )}
                   {!isLoadingPrices && Object.keys(pricesByStationType).length === 0 && (
                       <div className="col-span-full text-center py-12 text-muted-foreground">Aucun tarif défini pour le moment.</div>
                   )}
                </div>
            </div>
        </section>

        <section id="location" className="relative w-full h-[400px] md:h-[500px] bg-muted">
            <iframe
                src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3323.708005397453!2d-7.600600025700212!3d33.58694384196167!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0xda7cdfcb5b2f5f1%3A0xcedf993af7b0b3e9!2sWarriors%20Gaming!5e0!3m2!1sen!2sma!4v1716304899532!5m2!1sen!2sma"
                width="100%"
                height="100%"
                className="absolute inset-0 w-full h-full border-0"
                allowFullScreen={true}
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
            ></iframe>
            <div className="relative z-10 flex flex-col items-center justify-center h-full text-center text-white bg-black/50 p-4">
                <div className="space-y-4">
                    <h2 className="font-headline text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl text-shadow-lg">{t('findUs')}</h2>
                    <p className="mx-auto max-w-[700px] text-lg md:text-xl">
                        20, 22 Rue Rahal Ben Ahmed, Casablanca 20250
                    </p>
                    <Button asChild size="lg">
                        <Link href="https://www.google.com/maps?geocode=FYKdAAIdhx6M_w%3D%3D;FbWUAAIdLSuM_ynx9bK1_M2nDTHps7D3Opnfzg%3D%3D&daddr=20,+22+Rue+Rahal+Ben+Ahmed,+Casablanca+20250&saddr=33.5947536,-7.5943625&dirflg=dht&ftid=0xda7cdfcb5b2f5f1:0xcedf993af7b0b3e9&lucs=,94297695,94275415,94284460,94231188,94280568,47071704,94218641,94282134,94286869&g_ep=CAISEjI1LjQ5LjkuODM4ODk5MTgzMBgAILq3CypRLDk0Mjk3Njk1LDk0Mjc1NDE1LDk0Mjg0NDYwLDk0MjMxMTg4LDk0MjgwNTY4LDQ3MDcxNzA0LDk0MjE4NjQxLDk0MjgyMTM0LDk0Mjg2ODY5QgJNQQ%3D%3D&skid=5f37960f-5403-45c7-9ee0-8e4a082492c1&g_st=ic" target="_blank" rel="noopener noreferrer">
                            {t('getDirections')}
                        </Link>
                    </Button>
                </div>
            </div>
        </section>

      </main>
      <footer className="flex flex-col gap-4 sm:flex-row py-6 w-full shrink-0 items-center px-4 md:px-6 border-t">
        <p className="text-xs text-muted-foreground">
          &copy; 2026 Warriors Gaming. {t('allRightsReserved')}.
        </p>
        <div className="sm:ml-auto flex items-center gap-4 sm:gap-6">
            <Link href="https://www.instagram.com/warriorsgaming.ma?igsh=MTZ0bmE2b3JuN25wbQ==" target="_blank" rel="noopener noreferrer" className="text-xs hover:underline underline-offset-4">
                <Instagram className="h-5 w-5" />
            </Link>
             <Link href="tel:0661962634" className="text-xs hover:underline underline-offset-4 flex items-center gap-1">
                <Phone className="h-4 w-4" />
                06 61 96 26 34
            </Link>
        </div>
      </footer>
    </div>
  );
}
