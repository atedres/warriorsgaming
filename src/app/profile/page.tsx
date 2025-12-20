
'use client';

import { useUser, useFirestore, useDoc, useCollection } from '@/firebase';
import type { Client, Reservation } from '@/app/lib/data';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Clock, Hourglass, QrCode, User as UserIcon, Calendar, Trash2 } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { useMemoFirebase } from '@/firebase/provider';
import { doc, collection, query, orderBy, deleteDoc } from 'firebase/firestore';
import Image from 'next/image';
import { format } from 'date-fns';
import ClientHeader from '@/components/client/header';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';

function ProfileSkeleton() {
    return (
        <div className="grid gap-8 md:grid-cols-2">
            <div className="space-y-8">
                <Card>
                    <CardHeader className="items-center text-center">
                        <Skeleton className="h-24 w-24 rounded-full" />
                        <div className="space-y-2 mt-4">
                            <Skeleton className="h-6 w-40" />
                            <Skeleton className="h-4 w-52" />
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                         <Skeleton className="h-10 w-full" />
                         <Skeleton className="h-10 w-full" />
                         <Skeleton className="h-10 w-full" />
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader>
                        <CardTitle>QR Code</CardTitle>
                    </CardHeader>
                    <CardContent className="flex items-center justify-center">
                        <Skeleton className="h-48 w-48" />
                    </CardContent>
                </Card>
            </div>
             <div className="md:col-span-1">
                 <Card>
                    <CardHeader>
                        <Skeleton className="h-6 w-48" />
                        <Skeleton className="h-4 w-64 mt-2" />
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                           <Skeleton className="h-12 w-full" />
                           <Skeleton className="h-12 w-full" />
                           <Skeleton className="h-12 w-full" />
                        </div>
                    </CardContent>
                </Card>
             </div>
        </div>
    )
}

export default function ProfilePage() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();

  const clientRef = useMemoFirebase(
    () => (user ? doc(firestore!, 'clients', user.uid) : null),
    [user, firestore]
  );
  const { data: client, isLoading: isLoadingClient } = useDoc<Client>(clientRef);

  const reservationsQuery = useMemoFirebase(
    () =>
      user && firestore
        ? query(
            collection(firestore, 'clients', user.uid, 'reservations'),
            orderBy('startTime', 'desc')
          )
        : null,
    [user, firestore]
  );
  const { data: reservations, isLoading: isLoadingReservations } = useCollection<Reservation & {id: string}>(reservationsQuery);


  const qrCodeUrl = client ? `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(
    JSON.stringify({ clientId: client.id, name: client.name })
  )}` : '';

  if (isUserLoading || isLoadingClient) {
    return (
        <>
            <ClientHeader />
            <main className='container py-8'>
                <ProfileSkeleton />
            </main>
        </>
    );
  }

  if (!client) {
      return (
           <>
            <ClientHeader />
            <main className='container py-8'>
                <Card>
                    <CardHeader>
                        <CardTitle>Profil non trouvé</CardTitle>
                        <CardDescription>Nous n'avons pas pu trouver vos informations de client.</CardDescription>
                    </CardHeader>
                </Card>
            </main>
        </>
      )
  }

  const getStatusBadge = (status: Reservation['status']) => {
    switch (status) {
      case 'confirmed':
        return 'bg-green-500 text-white';
      case 'cancelled':
        return 'bg-red-500 text-white';
      case 'pending':
      default:
        return 'bg-yellow-500 text-white';
    }
  };

  const handleCancelReservation = async (reservationId: string) => {
    if (!firestore || !user) return;
    const reservationRef = doc(firestore, 'clients', user.uid, 'reservations', reservationId);
    try {
      await deleteDoc(reservationRef);
      toast({
        title: "Réservation annulée",
        description: "Votre réservation a été annulée avec succès."
      });
    } catch (error) {
      console.error("Error cancelling reservation: ", error);
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Impossible d'annuler la réservation. Veuillez réessayer."
      });
    }
  };
  
  const bonusHours = client.bonusHours || 0;
  const hours = Math.floor(bonusHours);
  const minutes = Math.round((bonusHours - hours) * 60);

  const avatarSrc = client.avatarUrl || `https://api.dicebear.com/8.x/bottts/svg?seed=${client.id}`;

  return (
    <>
        <ClientHeader />
        <main className='container py-8'>
            <PageHeader title="Mon Profil" description="Consultez vos informations, votre QR code et vos réservations." />
            <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
                {/* Left Column: Info + QR */}
                <div className="lg:col-span-1 space-y-8">
                    <Card>
                        <CardHeader className="items-center text-center">
                            <Avatar className='h-24 w-24 text-4xl'>
                                <AvatarImage src={avatarSrc} alt={client.name} />
                                <AvatarFallback>{client.name.charAt(0)}</AvatarFallback>
                            </Avatar>
                            <CardTitle className="font-headline text-2xl pt-4">{client.name}</CardTitle>
                            <CardDescription>{client.email}</CardDescription>
                            <Badge variant={client.subscriptionTier === 'VIP' ? 'default' : 'secondary'} className="mt-2">{client.subscriptionTier}</Badge>
                        </CardHeader>
                        <CardContent className="space-y-3 text-sm">
                            <div className='flex items-center gap-3 p-2 rounded-md bg-muted/50'>
                                <Hourglass className='h-5 w-5 text-primary' />
                                <span>Heures d'abonnement: <span className='font-bold'>{client.subscriptionHours?.toFixed(2) || 0}h</span></span>
                            </div>
                             <div className='flex items-center gap-3 p-2 rounded-md bg-muted/50'>
                                <Clock className='h-5 w-5 text-primary' />
                                <span>Heures bonus: <span className='font-bold'>{hours}h {minutes}m</span></span>
                            </div>
                            <div className='flex items-center gap-3 p-2 rounded-md bg-muted/50'>
                                <UserIcon className='h-5 w-5 text-primary' />
                                <span>Membre depuis: <span className='font-bold'>{format(new Date(client.memberSince), 'dd/MM/yyyy')}</span></span>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle className='flex items-center gap-2'><QrCode/> Mon QR Code</CardTitle>
                            <CardDescription>Présentez ce code à la réception pour le check-in.</CardDescription>
                        </CardHeader>
                        <CardContent className="flex items-center justify-center p-4">
                            {qrCodeUrl && <Image src={qrCodeUrl} width={200} height={200} alt={`QR Code for ${client.name}`} className="rounded-lg border p-2"/>}
                        </CardContent>
                    </Card>
                </div>

                {/* Right Column: Reservations */}
                <div className="lg:col-span-2">
                    <Card>
                        <CardHeader>
                            <CardTitle className='flex items-center gap-2'><Calendar /> Mes Réservations</CardTitle>
                            <CardDescription>Voici la liste de vos réservations passées et à venir.</CardDescription>
                        </CardHeader>
                        <CardContent>
                             <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Poste</TableHead>
                                        <TableHead>Début</TableHead>
                                        <TableHead>Statut</TableHead>
                                        <TableHead className='text-right'>Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {isLoadingReservations && (
                                        Array.from({length: 3}).map((_, i) => (
                                            <TableRow key={i}>
                                                <TableCell colSpan={4}>
                                                     <Skeleton className="h-8 w-full" />
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                    {!isLoadingReservations && reservations && reservations.length > 0 ? (
                                        reservations.map(reservation => (
                                            <TableRow key={reservation.id}>
                                                <TableCell className="font-medium">{reservation.stationId}</TableCell>
                                                <TableCell>{format(new Date(reservation.startTime), "d MMM, HH:mm")}</TableCell>
                                                <TableCell>
                                                    <Badge className={cn("capitalize", getStatusBadge(reservation.status))}>
                                                        {reservation.status}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    {(reservation.status === 'pending' || reservation.status === 'confirmed') && (
                                                        <Button variant="ghost" size="sm" className='text-red-500 hover:text-red-600' onClick={() => handleCancelReservation(reservation.id)}>
                                                            <Trash2 className="h-4 w-4 mr-2"/>
                                                            Annuler
                                                        </Button>
                                                    )}
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    ) : (
                                        !isLoadingReservations && (
                                            <TableRow>
                                                <TableCell colSpan={4} className="text-center text-muted-foreground">
                                                    Vous n'avez aucune réservation.
                                                </TableCell>
                                            </TableRow>
                                        )
                                    )}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </main>
    </>
  );
}
