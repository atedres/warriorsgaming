'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import { collection, query, orderBy, getDocs, QuerySnapshot, DocumentData, writeBatch } from 'firebase/firestore';
import { useCollection, useFirestore } from '@/firebase';
import { useMemoFirebase } from '@/firebase/provider';
import type { Client, ClientHistoryLog } from '@/app/lib/data';
import { PageHeader } from '@/components/page-header';
import { useTranslation } from '@/hooks/use-translation';
import { formatHistoryDescription } from '@/lib/translations';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Clock, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';

type CombinedHistoryLog = ClientHistoryLog & { clientName: string, clientId: string };

const SECRET_CODE = "SUPERADMIN";

function DeleteHistoryDialog({ clients, onHistoryDeleted }: { clients: Client[] | null, onHistoryDeleted: () => void }) {
    const [isAlertOpen, setIsAlertOpen] = useState(false);
    const [secretCode, setSecretCode] = useState('');
    const [isDeleting, setIsDeleting] = useState(false);
    const firestore = useFirestore();
    const { toast } = useToast();
    const { t } = useTranslation();

    const handleDeleteAllHistory = async () => {
        if (!firestore || !clients) {
            toast({ variant: "destructive", title: "Erreur", description: "Impossible d'accéder à la base de données."});
            return;
        }

        setIsDeleting(true);
        try {
            // Firestore allows a maximum of 500 operations in a single batch.
            // We'll process clients' histories in chunks to stay within this limit.
            const historyRefs: DocumentData[] = [];
            for (const client of clients) {
                const historySnapshot = await getDocs(query(collection(firestore, 'clients', client.id, 'history')));
                historySnapshot.forEach(doc => historyRefs.push(doc.ref));
            }

            if(historyRefs.length === 0) {
                 toast({ title: "Information", description: "L'historique est déjà vide." });
                 setIsAlertOpen(false);
                 setIsDeleting(false);
                 return;
            }

            const BATCH_SIZE = 500;
            for (let i = 0; i < historyRefs.length; i += BATCH_SIZE) {
                const batch = writeBatch(firestore);
                const chunk = historyRefs.slice(i, i + BATCH_SIZE);
                chunk.forEach(ref => batch.delete(ref));
                await batch.commit();
            }

            toast({ title: "Succès", description: `L'historique complet (${historyRefs.length} entrées) a été supprimé.` });
            onHistoryDeleted(); // Callback to refresh the UI
        } catch (error) {
            console.error("Error deleting history:", error);
            toast({ variant: "destructive", title: "Erreur de suppression", description: "Une erreur est survenue." });
        } finally {
            setIsDeleting(false);
            setIsAlertOpen(false);
            setSecretCode('');
        }
    };

    return (
      <AlertDialog open={isAlertOpen} onOpenChange={setIsAlertOpen}>
        <AlertDialogTrigger asChild>
            <Button variant="destructive" size="sm">
                <Trash2 className="mr-2 h-4 w-4" />
                Supprimer l'historique
            </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Êtes-vous absolument sûr ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action est irréversible. Elle supprimera définitivement tout l'historique de tous les clients. Pour confirmer, veuillez saisir le code secret.
            </AlertDialogDescription>
          </AlertDialogHeader>
           <div className="py-2 space-y-2">
            <Label htmlFor="secret-code">Code Secret</Label>
            <Input 
                id="secret-code"
                type="password"
                value={secretCode}
                onChange={(e) => setSecretCode(e.target.value)}
                placeholder="Entrez le code pour confirmer"
            />
           </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteAllHistory}
              disabled={secretCode !== SECRET_CODE || isDeleting}
              className="bg-destructive hover:bg-destructive/90"
            >
              {isDeleting ? "Suppression en cours..." : "Supprimer tout l'historique"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    )
}


export default function HistoryPage() {
  const { t } = useTranslation();
  const firestore = useFirestore();
  const [selectedClientId, setSelectedClientId] = useState<string>('all');
  const [allHistory, setAllHistory] = useState<CombinedHistoryLog[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);

  const clientsQuery = useMemoFirebase(
    () => (firestore ? query(collection(firestore, 'clients')) : null),
    [firestore]
  );
  const { data: clients, isLoading: isLoadingClients } = useCollection<Client>(clientsQuery);

  const fetchAllHistory = useCallback(async () => {
    if (!firestore || isLoadingClients || !clients) {
        setIsLoadingHistory(false);
        return;
    }
  
    setIsLoadingHistory(true);
    const historyPromises: Promise<CombinedHistoryLog[]>[] = [];
      
    for (const client of clients) {
      const historyRef = collection(firestore, 'clients', client.id, 'history');
      const historyQuery = query(historyRef, orderBy('timestamp', 'desc'));
        
      historyPromises.push(
        getDocs(historyQuery).then(snapshot => 
          snapshot.docs.map(doc => ({
            ...(doc.data() as ClientHistoryLog),
            id: doc.id,
            clientName: client.name,
            clientId: client.id
          }))
        )
      );
    }

    try {
      const results = await Promise.all(historyPromises);
      const combinedHistory = results.flat().sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      setAllHistory(combinedHistory);
    } catch (error) {
      console.error("Error fetching history:", error);
    } finally {
      setIsLoadingHistory(false);
    }
  }, [firestore, clients, isLoadingClients]);


  useEffect(() => {
    fetchAllHistory();
  }, [fetchAllHistory]);

  const filteredHistory = useMemo(() => {
    if (selectedClientId === 'all') {
      return allHistory;
    }
    return allHistory.filter(log => log.clientId === selectedClientId);
  }, [allHistory, selectedClientId]);

  return (
    <>
      <PageHeader
        title={t('history')}
        description={t('historyDescription')}
        className="px-0"
      >
        <div className="flex items-center gap-2">
            <Select value={selectedClientId} onValueChange={setSelectedClientId} disabled={isLoadingClients}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder={t('filterByClient')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('allClients')}</SelectItem>
                {clients?.map(client => (
                  <SelectItem key={client.id} value={client.id}>{client.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <DeleteHistoryDialog clients={clients} onHistoryDeleted={fetchAllHistory} />
        </div>
      </PageHeader>
      <Card>
        <CardHeader>
          <CardTitle className="font-headline">{t('activityLog')}</CardTitle>
          <CardDescription>{t('activityLogDescription')}</CardDescription>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[60vh]">
            <div className="p-4 space-y-4">
              {(isLoadingHistory || isLoadingClients) && <p>{t('loading')}...</p>}
              {!isLoadingHistory && allHistory.length === 0 && (
                <p className="text-muted-foreground text-center">{t('noHistoryFound')}</p>
              )}
              {filteredHistory?.map((log) => (
                <div key={log.id + log.timestamp} className="flex items-start gap-4">
                  <div className="bg-muted p-2 rounded-full">
                    <Clock className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium">{formatHistoryDescription(t, log)}</p>
                    <div className="text-sm text-muted-foreground flex items-center gap-2">
                        <span>{log.clientName}</span>
                        <span>&bull;</span>
                        <span>
                            {format(new Date(log.timestamp), "d MMM yyyy 'at' HH:mm")}
                        </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </>
  );
}
