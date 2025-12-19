
'use client';

import { useState, useMemo } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { PageHeader } from '@/components/page-header';
import { useCollection, useFirestore, useUser } from '@/firebase';
import { useMemoFirebase } from '@/firebase/provider';
import { collection, query, doc, orderBy } from 'firebase/firestore';
import type { Client } from '@/app/lib/data';
import { useTranslation } from '@/hooks/use-translation';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { MoreHorizontal, Trash2 } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { deleteDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { useToast } from '@/hooks/use-toast';

// Explicitly type Reservation to include an `id` field
type Reservation = {
  id: string;
  clientId: string;
  stationId: string;
  startTime: string;
  endTime: string;
};

// Combine reservation with client name for easier display
type EnrichedReservation = Reservation & {
  clientName: string;
};

function ReservationActions({ reservation }: { reservation: EnrichedReservation }) {
    const firestore = useFirestore();
    const { toast } = useToast();

    const handleDelete = () => {
        if (!firestore) return;
        const reservationRef = doc(firestore, 'reservations', reservation.id);
        deleteDocumentNonBlocking(reservationRef);
        toast({
            title: "Réservation annulée",
            description: `La réservation pour ${reservation.clientName} a été annulée.`,
            variant: "destructive"
        });
    }

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button aria-haspopup="true" size="icon" variant="ghost">
                    <MoreHorizontal className="h-4 w-4" />
                    <span className="sr-only">Toggle menu</span>
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
                <DropdownMenuItem className="text-red-500" onSelect={handleDelete}>
                    <Trash2 className="mr-2 h-4 w-4" />
                    Supprimer
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    )
}


export default function ReservationsPage() {
  const { t } = useTranslation();
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();

  const reservationsQuery = useMemoFirebase(
    () => (user && firestore ? query(collection(firestore, 'reservations'), orderBy('startTime', 'desc')) : null),
    [user, firestore]
  );
  const { data: reservations, isLoading: isLoadingReservations } = useCollection<Reservation>(reservationsQuery);

  const clientsQuery = useMemoFirebase(
    () => (user && firestore ? query(collection(firestore, 'clients')) : null),
    [user, firestore]
  );
  const { data: clients, isLoading: isLoadingClients } = useCollection<Client>(clientsQuery);

  const clientMap = useMemo(() => {
    if (!clients) return new Map();
    return new Map(clients.map(client => [client.id, client.name]));
  }, [clients]);

  const enrichedReservations = useMemo(() => {
    if (!reservations) return [];
    return reservations.map(res => ({
      ...res,
      clientName: clientMap.get(res.clientId) || 'Client inconnu',
    }));
  }, [reservations, clientMap]);

  const isLoading = isLoadingReservations || isLoadingClients;

  return (
    <>
      <PageHeader
        title={t('reservationManagement')}
        description={t('reservationManagementDescription')}
        className="px-0"
      />
      <Card>
        <CardHeader>
          <CardTitle className="font-headline">{t('reservations')}</CardTitle>
          <CardDescription>
            Liste de toutes les réservations à venir et passées.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('client')}</TableHead>
                <TableHead>{t('station')}</TableHead>
                <TableHead>{t('startTime')}</TableHead>
                <TableHead>{t('endTime')}</TableHead>
                <TableHead>
                  <span className="sr-only">{t('actions')}</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading &&
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell colSpan={5}>
                      <div className="h-8 w-full animate-pulse rounded-md bg-muted" />
                    </TableCell>
                  </TableRow>
                ))}
              {!isLoading && enrichedReservations.length === 0 ? (
                <TableRow>
                    <TableCell colSpan={5} className="text-center">
                        {t('noReservationsFound')}
                    </TableCell>
                </TableRow>
              ) : enrichedReservations.map((reservation) => (
                  <TableRow key={reservation.id}>
                    <TableCell className="font-medium">
                      {reservation.clientName}
                    </TableCell>
                    <TableCell>{reservation.stationId}</TableCell>
                    <TableCell>
                      {format(new Date(reservation.startTime), "d MMM yyyy, HH:mm")}
                    </TableCell>
                    <TableCell>
                      {format(new Date(reservation.endTime), "d MMM yyyy, HH:mm")}
                    </TableCell>
                    <TableCell className="text-right">
                      <ReservationActions reservation={reservation} />
                    </TableCell>
                  </TableRow>
                ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </>
  );
}
