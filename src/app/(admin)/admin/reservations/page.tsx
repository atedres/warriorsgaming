'use client';

import { useState, useMemo, useEffect }s from 'react';
import { collection, collectionGroup, getDocs, query, orderBy, doc, updateDoc, deleteDoc, where } from 'firebase/firestore';
import { useCollection, useFirestore } from '@/firebase';
import type { Client } from '@/app/lib/data';
import { PageHeader } from '@/components/page-header';
import { useTranslation } from '@/hooks/use-translation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { Check, Trash2, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Reservation as ReservationType } from '@/app/lib/data';

type EnrichedReservation = ReservationType & {
  clientName?: string;
  clientDocId?: string; // a.k.a the UID
  reservationId: string;
};

export default function ReservationsPage() {
  const { t } = useTranslation();
  const firestore = useFirestore();
  const [reservations, setReservations] = useState<EnrichedReservation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  const { data: clients, isLoading: isLoadingClients } = useCollection<Client>(
    useMemo(() => (firestore ? query(collection(firestore, 'clients')) : null), [firestore])
  );

  useEffect(() => {
    const fetchAllReservations = async () => {
      if (!firestore) return;
      setIsLoading(true);

      const reservationsQuery = query(
        collectionGroup(firestore, 'reservations'),
        orderBy('startTime', 'desc')
      );

      try {
        const querySnapshot = await getDocs(reservationsQuery);
        const allReservations: EnrichedReservation[] = querySnapshot.docs.map(doc => {
          const data = doc.data() as ReservationType;
          const client = clients?.find(c => c.id === data.clientId);
          return {
            ...data,
            reservationId: doc.id,
            clientDocId: client?.id,
            clientName: client?.name || 'Unknown Client',
          };
        });
        setReservations(allReservations);
      } catch (error) {
        console.error("Error fetching reservations: ", error);
        toast({
          variant: "destructive",
          title: "Error",
          description: "Could not fetch reservations. Check security rules.",
        });
      } finally {
        setIsLoading(false);
      }
    };

    if (!isLoadingClients) {
        fetchAllReservations();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [firestore, clients, isLoadingClients]);
  
  const handleUpdateStatus = async (reservation: EnrichedReservation, status: 'confirmed' | 'cancelled') => {
      if (!firestore || !reservation.clientDocId) return;

      const reservationRef = doc(firestore, 'clients', reservation.clientDocId, 'reservations', reservation.reservationId);
      
      try {
          if (status === 'cancelled') {
              await deleteDoc(reservationRef);
              setReservations(prev => prev.filter(r => r.reservationId !== reservation.reservationId));
              toast({ title: "Reservation Cancelled", description: "The reservation has been removed." });
          } else {
              await updateDoc(reservationRef, { status });
              setReservations(prev => prev.map(r => r.reservationId === reservation.reservationId ? {...r, status} : r));
              toast({ title: "Reservation Confirmed", description: "The reservation has been confirmed." });
          }
      } catch (error) {
           console.error("Error updating reservation: ", error);
           toast({ variant: "destructive", title: "Update Failed" });
      }
  }

  const getStatusBadge = (status: ReservationType['status']) => {
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


  return (
    <>
      <PageHeader
        title={t('reservationManagement')}
        description={t('reservationManagementDescription')}
        className="px-0"
      />
      <Card>
        <CardHeader>
          <CardTitle className="font-headline">Toutes les réservations</CardTitle>
          <CardDescription>Gérez les réservations à venir et passées.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Client</TableHead>
                <TableHead>Poste</TableHead>
                <TableHead>Date et Heure</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading || isLoadingClients ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell colSpan={5}>
                      <div className="h-8 w-full animate-pulse rounded-md bg-muted" />
                    </TableCell>
                  </TableRow>
                ))
              ) : reservations.length > 0 ? (
                reservations.map((reservation) => (
                  <TableRow key={reservation.reservationId}>
                    <TableCell className="font-medium">{reservation.clientName}</TableCell>
                    <TableCell>{reservation.stationId}</TableCell>
                    <TableCell>
                        <div className="flex flex-col">
                            <span>{format(new Date(reservation.startTime), "d MMM yyyy, HH:mm")}</span>
                            <span className="text-xs text-muted-foreground">à {format(new Date(reservation.endTime), "HH:mm")}</span>
                        </div>
                    </TableCell>
                     <TableCell>
                      <Badge className={cn("capitalize", getStatusBadge(reservation.status))}>
                        {reservation.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                        {reservation.status === 'pending' && (
                             <Button variant="outline" size="sm" onClick={() => handleUpdateStatus(reservation, 'confirmed')}>
                                <Check className="mr-2 h-4 w-4" /> Confirmer
                            </Button>
                        )}
                        <Button variant="ghost" size="sm" className="ml-2 text-red-500 hover:text-red-600" onClick={() => handleUpdateStatus(reservation, 'cancelled')}>
                            <Trash2 className="h-4 w-4" />
                        </Button>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={5} className="text-center h-24">
                    {t('noReservationsFound')}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </>
  );
}