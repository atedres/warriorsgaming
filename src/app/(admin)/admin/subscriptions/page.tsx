
'use client';

import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useCollection, useFirestore } from '@/firebase';
import { useMemoFirebase } from '@/firebase/provider';
import type { SubscriptionCard, Client } from '@/app/lib/data';
import { formatCurrency } from '@/lib/utils';
import { collection, query } from 'firebase/firestore';
import { SubscriptionCardActions } from './subscription-actions';
import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { updateDocumentNonBlocking, addDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { PlusCircle } from 'lucide-react';


function AssignCardDialog({ cards, clients }: { cards: SubscriptionCard[] | null, clients: Client[] | null }) {
    const [isOpen, setIsOpen] = useState(false);
    const [selectedClientId, setSelectedClientId] = useState<string | undefined>();
    const [selectedCardId, setSelectedCardId] = useState<string | undefined>();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const firestore = useFirestore();
    const { toast } = useToast();

    const handleAssign = async () => {
        if (!firestore || !selectedClientId || !selectedCardId) {
            toast({ variant: 'destructive', title: 'Sélection manquante', description: 'Veuillez sélectionner un client et une carte.' });
            return;
        }
        setIsSubmitting(true);

        const client = clients?.find(c => c.id === selectedClientId);
        const card = cards?.find(c => c.id === selectedCardId);

        if (!client || !card) {
            toast({ variant: 'destructive', title: 'Erreur', description: 'Client ou carte introuvable.' });
            setIsSubmitting(false);
            return;
        }

        try {
            const newSubscriptionHours = (client.subscriptionHours || 0) + card.hoursGranted;
            const newBonusHours = (client.bonusHours || 0) + card.bonusHoursGranted;

            const clientRef = collection(firestore, 'clients');
            await updateDocumentNonBlocking(doc(clientRef, client.id), {
                subscriptionHours: newSubscriptionHours,
                bonusHours: newBonusHours
            });

            const historyRef = collection(firestore, 'clients', client.id, 'history');
            await addDocumentNonBlocking(historyRef, {
                timestamp: new Date().toISOString(),
                type: 'recharge',
                description: {
                    key: 'history_recharge',
                    metadata: {
                        cardName: card.name,
                        hoursAdded: card.hoursGranted,
                        bonusAdded: card.bonusHoursGranted,
                        price: formatCurrency(card.price)
                    }
                },
            });

            toast({ title: 'Abonnement assigné !', description: `${card.name} a été ajouté au compte de ${client.name}.` });
            setIsOpen(false);
            setSelectedCardId(undefined);
            setSelectedClientId(undefined);

        } catch (error) {
            console.error("Error assigning card:", error);
            toast({ variant: 'destructive', title: 'Erreur', description: 'Une erreur est survenue.' });
        } finally {
            setIsSubmitting(false);
        }

    }

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                <Button>Assigner une carte</Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Assigner une Carte d'Abonnement</DialogTitle>
                    <DialogDescription>
                        Sélectionnez un client et la carte à lui attribuer. Les heures seront ajoutées à son compte.
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <Select value={selectedClientId} onValueChange={setSelectedClientId}>
                        <SelectTrigger><SelectValue placeholder="Sélectionner un client..." /></SelectTrigger>
                        <SelectContent>
                            {clients?.map(client => (
                                <SelectItem key={client.id} value={client.id}>{client.name}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <Select value={selectedCardId} onValueChange={setSelectedCardId}>
                        <SelectTrigger><SelectValue placeholder="Sélectionner une carte..." /></SelectTrigger>
                        <SelectContent>
                            {cards?.map(card => (
                                <SelectItem key={card.id} value={card.id}>{card.name} - {formatCurrency(card.price)}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => setIsOpen(false)}>Annuler</Button>
                    <Button onClick={handleAssign} disabled={isSubmitting || !selectedCardId || !selectedClientId}>
                        {isSubmitting ? 'Assignation...' : 'Confirmer et assigner'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}

export default function SubscriptionsPage() {
  const firestore = useFirestore();

  const cardsQuery = useMemoFirebase(
    () => (firestore ? query(collection(firestore, 'subscriptionCards')) : null),
    [firestore]
  );
  const { data: cards, isLoading: isLoadingCards } = useCollection<SubscriptionCard>(cardsQuery);
  
  const clientsQuery = useMemoFirebase(
    () => (firestore ? query(collection(firestore, 'clients')) : null),
    [firestore]
  );
  const { data: clients, isLoading: isLoadingClients } = useCollection<Client>(clientsQuery);

  const isLoading = isLoadingCards || isLoadingClients;

  return (
    <>
      <PageHeader
        title="Gestion des Abonnements"
        description="Créez et gérez les cartes d'abonnement, puis assignez-les aux clients."
      >
        <AssignCardDialog cards={cards} clients={clients} />
      </PageHeader>
      <Card>
        <CardHeader>
          <CardTitle>Cartes d'Abonnement Disponibles</CardTitle>
          <CardDescription>
            Voici toutes les cartes d'abonnement que vous pouvez vendre aux clients.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nom</TableHead>
                <TableHead>Prix</TableHead>
                <TableHead>Heures</TableHead>
                <TableHead>Bonus</TableHead>
                <TableHead>
                  <div className="text-right">
                    <SubscriptionCardActions mode="add" />
                  </div>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && Array.from({ length: 3 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell colSpan={5}><div className="h-10 animate-pulse bg-muted rounded-md" /></TableCell>
                </TableRow>
              ))}
              {cards?.map((card) => (
                <TableRow key={card.id}>
                  <TableCell>
                    <div className="font-medium">{card.name}</div>
                    <div className="text-sm text-muted-foreground">{card.description}</div>
                  </TableCell>
                  <TableCell>{formatCurrency(card.price)}</TableCell>
                  <TableCell>{card.hoursGranted}h</TableCell>
                  <TableCell>{card.bonusHoursGranted}h</TableCell>
                  <TableCell className="text-right">
                    <SubscriptionCardActions mode="actions" item={card} />
                  </TableCell>
                </TableRow>
              ))}
              {!isLoading && cards?.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center">
                    Aucune carte d'abonnement créée pour le moment.
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
