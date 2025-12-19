
'use client';

import { useUser, useFirestore, useDoc } from '@/firebase';
import type { Client } from '@/app/lib/data';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Clock, Hourglass, QrCode, User as UserIcon } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { useMemoFirebase } from '@/firebase/provider';
import { doc } from 'firebase/firestore';
import Image from 'next/image';
import { format } from 'date-fns';
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
            <div className="md:col-span-2">
                <Card>
                    <CardHeader>
                        <CardTitle>QR Code</CardTitle>
                    </CardHeader>
                    <CardContent className="flex items-center justify-center">
                        <Skeleton className="h-48 w-48" />
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}

export default function ProfilePage() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();

  const clientRef = useMemoFirebase(
    () => (user ? doc(firestore!, 'clients', user.uid) : null),
    [user, firestore]
  );
  const { data: client, isLoading: isLoadingClient } = useDoc<Client>(clientRef);

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
            <PageHeader title="Mon Profil" description="Consultez vos informations et votre QR code." />
            <div className="grid gap-8 md:grid-cols-2">
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

                {/* QR Code */}
                <div className="md:col-span-1">
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
            </div>
        </main>
    </>
  );
}
