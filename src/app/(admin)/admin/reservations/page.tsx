
'use client';

import { useState, useMemo, useEffect } from 'react';
import { collectionGroup, getDocs, query, orderBy, doc, updateDoc, deleteDoc, collection, onSnapshot, Unsubscribe } from 'firebase/firestore';
import { useCollection, useFirestore } from '@/firebase';
import { useMemoFirebase } from '@/firebase/provider';
import type { Client } from '@/app/lib/data';
import { PageHeader } from '@/components/page-header';
import { useTranslation } from '@/hooks/use-translation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { Check, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Reservation as ReservationType } from '@/app/lib/data';

type EnrichedReservation = ReservationType & {
  clientName?: string;
  clientPhone?: string;
  clientDocId: string; // The parent document ID (client UID)
  reservationId: string;
};

export default function ReservationsPage() {
  const { t } = useTranslation();
  const firestore = useFirestore();
  const [reservations, setReservations] = useState<EnrichedReservation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  const clientsQuery = useMemoFirebase(
    () => (firestore ? query(collection(firestore, 'clients')) : null),
    [firestore]
  );
  const { data: clients, isLoading: isLoadingClients } = useCollection<Client>(clientsQuery);


  useEffect(() => {
    if (!firestore) {
      setIsLoading(false);
      return;
    }
    
    // Don't start fetching reservations until clients are loaded.
    // We need the client map to enrich the reservation data.
    if (isLoadingClients) {
        return;
    }

    setIsLoading(true);

    const reservationsQuery = query(
      collectionGroup(firestore, 'reservations'),
      orderBy('startTime', 'desc')
    );
    
    // Set up the real-time listener
    const unsubscribe = onSnapshot(reservationsQuery, (querySnapshot) => {
        const clientsMap = new Map(clients?.map(c => [c.id, c]));

        const allReservations: EnrichedReservation[] = querySnapshot.docs.map(doc => {
            const data = doc.data() as ReservationType;
            const parentClientId = doc.ref.parent.parent!.id; 
            const clientData = clientsMap.get(parentClientId);
            
            return {
              ...data,
              reservationId: doc.id,
              clientDocId: parentClientId,
              clientName: clientData?.name || 'Unknown Client',
              clientPhone: clientData?.phone || 'N/A'
            };
        });
        
        setReservations(allReservations);
        setIsLoading(false);
    }, (error) => {
        console.error("Error fetching reservations in real-time: ", error);
        toast({
          variant: "destructive",
          title: "Error",
          description: "Could not fetch reservations. Check security rules or console for details.",
        });
        setIsLoading(false);
    });

    // Cleanup: Unsubscribe from the listener when the component unmounts
    // or when dependencies change.
    return () => unsubscribe();
      
  }, [firestore, clients, isLoadingClients, toast]);
  
  const handleUpdateStatus = async (reservation: EnrichedReservation, status: 'confirmed' | 'cancelled') => {
      if (!firestore || !reservation.clientDocId) {
          toast({ variant: "destructive", title: "Action Failed", description: "Client ID is missing." });
          return;
      }

      const reservationRef = doc(firestore, 'clients', reservation.clientDocId, 'reservations', reservation.reservationId);
      
      try {
          if (status === 'cancelled') {
              await deleteDoc(reservationRef);
              // No need to update state manually, onSnapshot will do it
              toast({ title: "Reservation Cancelled", description: "The reservation has been removed." });
          } else {
              await updateDoc(reservationRef, { status });
               // No need to update state manually, onSnapshot will do it
              toast({ title: "Reservation Confirmed", description: "The reservation has been confirmed." });
          }
      } catch (error) {
           console.error("Error updating reservation: ", error);
           toast({ variant: "destructive", title: "Update Failed", description: "Could not update the reservation." });
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
              {isLoading ? (
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
                    <TableCell>
                      <div className="font-medium">{reservation.clientName}</div>
                      <div className="text-sm text-muted-foreground">{reservation.clientPhone}</div>
                    </TableCell>
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
