
'use client';

import { useState, useMemo, useEffect } from 'react';
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
import { useCollection, useFirestore } from '@/firebase';
import { useMemoFirebase } from '@/firebase/provider';
import { collection, query, doc, orderBy, getDocs } from 'firebase/firestore';
import type { Client } from '@/app/lib/data';
import { useTranslation } from '@/hooks/use-translation';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { MoreHorizontal, Trash2 } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { deleteDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';

type Reservation = {
  id: string;
  clientId: string;
  stationId: string;
  startTime: string;
  endTime: string;
};

type EnrichedReservation = Reservation & {
  clientName: string;
};

function ReservationActions({ reservation }: { reservation: EnrichedReservation }) {
    const firestore = useFirestore();
    const { toast } = useToast();

    const handleDelete = () => {
        if (!firestore) return;
        const reservationRef = doc(firestore, 'clients', reservation.clientId, 'reservations', reservation.id);
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
  const firestore = useFirestore();

  const [allReservations, setAllReservations] = useState<EnrichedReservation[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const clientsQuery = useMemoFirebase(
    () => (firestore ? query(collection(firestore, 'clients')) : null),
    [firestore]
  );
  const { data: clients, isLoading: isLoadingClients } = useCollection<Client>(clientsQuery);
  
  useEffect(() => {
    const fetchAllReservations = async () => {
      if (!firestore || isLoadingClients) {
        // We need to wait for clients to be loaded before we can fetch their reservations
        return;
      }
      
      setIsLoading(true);
      
      try {
        if (!clients || clients.length === 0) {
            // No clients means no reservations
            setAllReservations([]);
            return;
        }

        const clientMap = new Map(clients.map(c => [c.id, c.name]));

        const reservationsPromises = clients.map(async (client) => {
          const reservationsRef = collection(firestore, 'clients', client.id, 'reservations');
          const reservationsQuery = query(reservationsRef, orderBy('startTime', 'desc'));
          const reservationsSnapshot = await getDocs(reservationsQuery);
          return reservationsSnapshot.docs.map(doc => {
            const data = doc.data() as Omit<Reservation, 'id'>;
            return {
              ...data,
              id: doc.id,
              clientName: clientMap.get(data.clientId) || "Unknown Client",
              clientId: client.id, 
            } as EnrichedReservation;
          });
        });

        const results = await Promise.all(reservationsPromises);
        const allRes = results.flat().sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime());

        setAllReservations(allRes);
      } catch (error) {
        console.error("Error fetching reservations: ", error);
        setAllReservations([]); // Clear reservations on error
      } finally {
        setIsLoading(false);
      }
    };

    fetchAllReservations();

  }, [firestore, clients, isLoadingClients]);


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
              {(isLoading || isLoadingClients) &&
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell colSpan={5}>
                      <Skeleton className="h-8 w-full" />
                    </TableCell>
                  </TableRow>
                ))}
              {!isLoading && !isLoadingClients && allReservations.length === 0 ? (
                <TableRow>
                    <TableCell colSpan={5} className="text-center">
                        {t('noReservationsFound')}
                    </TableCell>
                </TableRow>
              ) : allReservations.map((reservation) => (
                  <TableRow key={reservation.clientId + reservation.id}>
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
