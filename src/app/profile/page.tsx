'use client';

import { useUser, useFirestore, useDoc, useCollection } from '@/firebase';
import type { Client, Reservation } from '@/app/lib/data';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Clock, Hourglass, Mail, Phone, QrCode, Ticket, User as UserIcon } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { useMemoFirebase } from '@/firebase/provider';
import { doc, collection, query, where, orderBy } from 'firebase/firestore';
import Image from 'next/image';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { format } from 'date-fns';
import { useTranslation } from '@/hooks/use-translation';
import ClientHeader from '@/components/client/header';

function ProfileSkeleton() {
    return (
        <div className="grid gap-8 md:grid-cols-3">
            <div className="md:col-span-1">
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
            </div>
            <div className="md:col-span-2 space-y-8">
                <Card>
                    <CardHeader>
                        <CardTitle>QR Code</CardTitle>
                    </CardHeader>
                    <CardContent className="flex items-center justify-center">
                        <Skeleton className="h-48 w-48" />
                    </CardContent>
                </Card>
                 <Card>
                    <CardHeader>
                        <CardTitle>Mes Réservations</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <Skeleton className="h-32 w-full" />
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}

export default function ProfilePage() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const { t } = useTranslation();

  const clientRef = useMemoFirebase(
    () => (user ? doc(firestore!, 'clients', user.uid) : null),
    [user, firestore]
  );
  const { data: client, isLoading: isLoadingClient } = useDoc<Client>(clientRef);

  const reservationsQuery = useMemoFirebase(
      () => (firestore && user ? query(collection(firestore, 'reservations'), where('clientId', '==', user.uid), orderBy('startTime', 'desc')) : null),
      [user, firestore]
  );
  const { data: reservations, isLoading: isLoadingReservations } = useCollection<Reservation>(reservationsQuery);

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

  return (
    <>
        <ClientHeader />
        <main className='container py-8'>
            <PageHeader title="Mon Profil" description="Consultez vos informations, votre QR code et vos réservations." />
            <div className="grid gap-8 md:grid-cols-3">
                {/* Client Info Card */}
                <div className="md:col-span-1">
                    <Card>
                        <CardHeader className="items-center text-center">
                            <Avatar className='h-24 w-24 text-4xl'>
                                <AvatarImage src={`https://api.dicebear.com/8.x/bottts/svg?seed=${client.id}`} alt={client.name} />
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
                                <span>Heures bonus: <span className='font-bold'>{client.bonusHours?.toFixed(2) || 0}h</span></span>
                            </div>
                            <div className='flex items-center gap-3 p-2 rounded-md bg-muted/50'>
                                <UserIcon className='h-5 w-5 text-primary' />
                                <span>Membre depuis: <span className='font-bold'>{format(new Date(client.memberSince), 'dd/MM/yyyy')}</span></span>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* QR Code and Reservations */}
                <div className="md:col-span-2 space-y-8">
                    <Card>
                        <CardHeader>
                            <CardTitle className='flex items-center gap-2'><QrCode/> Mon QR Code</CardTitle>
                            <CardDescription>Présentez ce code à la réception pour le check-in.</CardDescription>
                        </CardHeader>
                        <CardContent className="flex items-center justify-center p-4">
                            {qrCodeUrl && <Image src={qrCodeUrl} width={200} height={200} alt={`QR Code for ${client.name}`} className="rounded-lg border p-2"/>}
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle className='flex items-center gap-2'><Ticket/> Mes Réservations</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Poste</TableHead>
                                        <TableHead>Date</TableHead>
                                        <TableHead>Heure de début</TableHead>
                                        <TableHead>Heure de fin</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {isLoadingReservations && <TableRow><TableCell colSpan={4} className='text-center'>Chargement...</TableCell></TableRow>}
                                    {!isLoadingReservations && reservations?.length === 0 && (
                                        <TableRow>
                                            <TableCell colSpan={4} className="text-center h-24">
                                                Vous n'avez aucune réservation.
                                            </TableCell>
                                        </TableRow>
                                    )}
                                    {reservations?.map(res => (
                                        <TableRow key={res.id}>
                                            <TableCell className='font-medium'>{res.stationId}</TableCell>
                                            <TableCell>{format(new Date(res.startTime), 'd MMM yyyy')}</TableCell>
                                            <TableCell>{format(new Date(res.startTime), 'HH:mm')}</TableCell>
                                            <TableCell>{format(new Date(res.endTime), 'HH:mm')}</TableCell>
                                        </TableRow>
                                    ))}
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
