
'use client';
import Image from 'next/image';
import { Gamepad2, Headset, Monitor, Instagram, MapPin, Phone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import ClientHeader from '@/components/client/header';
import { useCollection, useDoc, useFirestore, useUser } from '@/firebase';
import { collection, query, doc, addDoc, where } from 'firebase/firestore';
import { useMemoFirebase } from '@/firebase/provider';
import type { Station, Client, Reservation } from '@/app/lib/data';
import { cn } from '@/lib/utils';
import { useState, useMemo } from 'react';
import Link from 'next/link';
import { useTranslation } from '@/hooks/use-translation';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { addHours, format, setHours, setMinutes, startOfToday, getHours } from 'date-fns';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

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
    const [selectedHour, setSelectedHour] = useState<string>('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const firestore = useFirestore();
    const { toast } = useToast();

    const availableHours = useMemo(() => {
        const hours = [];
        const now = new Date();
        const openingHour = 11;
        const closingHour = 23; // Last booking can start at 23:00

        let startHour = getHours(now) + 1;
        if (startHour < openingHour) {
            startHour = openingHour;
        }

        for (let i = startHour; i <= closingHour; i++) {
            hours.push(i);
        }
        return hours;
    }, []);

    const handleReservation = async () => {
        if (!firestore || !user || !user.uid) {
            toast({ 
                variant: 'destructive', 
                title: "Erreur", 
                description: "Session non valide. Veuillez vous reconnecter pour réserver." 
            });
            return;
        }

        // --- Single Reservation Logic ---
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
        // --- End of Logic ---

        if (!selectedHour) {
            toast({
                variant: 'destructive',
                title: 'Heure non sélectionnée',
                description: "Veuillez choisir une heure de début."
            });
            return;
        }

        const start = setMinutes(setHours(startOfToday(), parseInt(selectedHour)), 0);
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
    
    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                <Button 
                    variant="outline" 
                    className="mt-4" 
                    disabled={station.status !== 'available' || !user}
                    title={!user ? "Connectez-vous pour réserver" : ""}
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
                    <div className="grid gap-2">
                        <Label htmlFor="start-time">Heure de début</Label>
                        <Select value={selectedHour} onValueChange={setSelectedHour}>
                            <SelectTrigger id="start-time">
                                <SelectValue placeholder="Choisissez une heure" />
                            </SelectTrigger>
                            <SelectContent>
                                {availableHours.map(hour => (
                                    <SelectItem key={hour} value={String(hour)}>
                                        {`${hour}:00`}
                                    </SelectItem>
                                ))}
                                {availableHours.length === 0 && (
                                    <div className="p-4 text-center text-sm text-muted-foreground">
                                        Aucun créneau disponible pour aujourd'hui.
                                    </div>
                                )}
                            </SelectContent>
                        </Select>
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => setIsOpen(false)}>Annuler</Button>
                    <Button onClick={handleReservation} disabled={isSubmitting}>
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
  const firestore = useFirestore();
  const stationsQuery = useMemoFirebase(
    () => (firestore ? query(collection(firestore, 'stations')) : null),
    [firestore]
  );
  const { data: stations, isLoading } = useCollection<Station>(stationsQuery);

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
      case 'VR Simulator':
        return <Headset className="h-6 w-6" />;
      default:
        return null;
    }
  };

  const stationTypes = [
    'All',
    'PC',
    'PS5',
    'PS5 VIP',
    'VR Simulator',
  ];

  const filteredStations =
    stations?.filter(
      (station) => filter === 'All' || station.type === filter
    ) || [];

  return (
    <div className="flex min-h-screen w-full flex-col">
      <ClientHeader />
      <main className="flex-1">
        <section className="relative w-full py-12 md:py-24 lg:py-32 xl:py-48">
          <Image
            src="https://picsum.photos/seed/cyberhub-hero/1920/1080"
            data-ai-hint="gaming setup neon"
            alt="Hero background"
            fill
            className="object-cover -z-10"
          />
          <div className="absolute inset-0 bg-background/80 -z-10" />
          <div className="container px-4 md:px-6">
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
          <div className="container px-4 md:px-6">
            <div className="flex flex-col items-center justify-center space-y-4 text-center">
              <div className="space-y-2">
                <h2 className="font-headline text-3xl font-bold tracking-tighter sm:text-5xl">
                  {t('stationStatus')}
                </h2>
                <p className="max-w-[900px] text-foreground/80 md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed">
                  {t('stationStatusDescription')}
                </p>
              </div>
              <div className="flex flex-wrap items-center justify-center gap-2 pt-6">
                {stationTypes.map((type) => (
                  <Button
                    key={type}
                    variant={filter === type ? 'default' : 'outline'}
                    onClick={() => setFilter(type)}
                  >
                    {type}
                  </Button>
                ))}
              </div>
            </div>
            <div className="mx-auto grid max-w-5xl grid-cols-1 gap-6 py-12 sm:grid-cols-2 lg:grid-cols-3">
              {isLoading &&
                Array.from({ length: 6 }).map((_, i) => (
                  <Card key={i} className="flex flex-col">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                      <div className="h-6 w-3/4 animate-pulse rounded-md bg-muted" />
                    </CardHeader>
                    <CardContent className="flex-1 flex flex-col justify-between">
                      <div className="h-4 w-1/2 animate-pulse rounded-md bg-muted" />
                      <div className="mt-4 h-10 w-full animate-pulse rounded-md bg-muted" />
                      <div className="mt-4 h-10 w-full animate-pulse rounded-md bg-muted" />
                    </CardContent>
                  </Card>
                ))}
              {filteredStations.map((station) => (
                <Card key={station.id} className="flex flex-col">
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
                          'mt-4 text-white w-full justify-center py-2 text-sm',
                          {
                            'bg-green-500 hover:bg-green-500/80':
                              station.status === 'available',
                            'bg-red-500 hover:bg-red-500/80':
                              station.status === 'in use' ||
                              station.status === 'maintenance',
                          }
                        )}
                      >
                        {station.status}
                      </Badge>
                    </div>
                    <ReservationDialog station={station} user={user} client={client} clientReservations={reservations} />
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>
        
        <section id="location" className="relative w-full h-[600px] bg-muted">
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
          &copy; 2024 Warriors Gaming. {t('allRightsReserved')}.
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
