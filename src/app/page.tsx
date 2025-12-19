'use client';
import Image from 'next/image';
import { Gamepad2, Headset, Monitor, Instagram, MapPin, Phone, Clock, Calendar, Ticket, User as UserIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import ClientHeader from '@/components/client/header';
import { useCollection, useFirestore, useUser } from '@/firebase';
import { collection, query, doc, addDoc } from 'firebase/firestore';
import { useMemoFirebase } from '@/firebase/provider';
import type { Station } from '@/app/lib/data';
import { cn } from '@/lib/utils';
import { useState } from 'react';
import Link from 'next/link';
import { useTranslation } from '@/hooks/use-translation';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { addHours, format } from 'date-fns';

function ReservationDialog({ station, user }: { station: Station, user: any }) {
    const { t } = useTranslation();
    const [isOpen, setIsOpen] = useState(false);
    const [startTime, setStartTime] = useState(format(new Date(), "yyyy-MM-dd'T'HH:mm"));
    const [endTime, setEndTime] = useState(format(addHours(new Date(), 1), "yyyy-MM-dd'T'HH:mm"));
    const [isSubmitting, setIsSubmitting] = useState(false);
    const firestore = useFirestore();
    const { toast } = useToast();

    const handleReservation = async () => {
        if (!firestore || !user || !user.uid) {
            toast({ 
                variant: 'destructive', 
                title: "Erreur", 
                description: "Session non valide. Veuillez vous reconnecter pour réserver." 
            });
            return;
        }
        
        if (new Date(startTime) >= new Date(endTime)) {
            toast({
                variant: 'destructive',
                title: 'Date invalide',
                description: "L'heure de fin doit être après l'heure de début."
            });
            return;
        }

        setIsSubmitting(true);
        try {
            // Write to the user's subcollection for reservations
            const reservationsRef = collection(firestore, 'clients', user.uid, 'reservations');
            await addDoc(reservationsRef, {
                clientId: user.uid, // Still useful to have for reference
                stationId: station.id,
                startTime: new Date(startTime).toISOString(),
                endTime: new Date(endTime).toISOString(),
            });

            toast({
                title: "Réservation confirmée !",
                description: `Votre réservation pour le poste ${station.id} a bien été enregistrée.`,
            });
            setIsOpen(false);
        } catch (error) {
            console.error("Error creating reservation: ", error);
            toast({ 
                variant: 'destructive', 
                title: "Erreur de Réservation", 
                description: "Une erreur est survenue. Il est possible que les règles de sécurité aient refusé l'action."
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
                        Sélectionnez la date et l'heure pour votre session de jeu.
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                        <Label htmlFor="start-time">Heure de début</Label>
                        <Input
                            id="start-time"
                            type="datetime-local"
                            value={startTime}
                            onChange={(e) => setStartTime(e.target.value)}
                        />
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="end-time">Heure de fin</Label>
                        <Input
                            id="end-time"
                            type="datetime-local"
                            value={endTime}
                            onChange={(e) => setEndTime(e.target.value)}
                        />
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
                    <ReservationDialog station={station} user={user} />
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
