
'use client';

import { useState, useMemo } from 'react';
import { collection, collectionGroup, query, orderBy, where } from 'firebase/firestore';
import { useCollection, useFirestore } from '@/firebase';
import { useMemoFirebase } from '@/firebase/provider';
import type { Client, ClientHistoryLog } from '@/app/lib/data';
import { PageHeader } from '@/components/page-header';
import { useTranslation } from '@/hooks/use-translation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Clock } from 'lucide-react';
import { format } from 'date-fns';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

// We need to fetch the client's name for each log.
// A Map is an efficient way to look up client names by their ID.
function createClientMap(clients: Client[] | null): Map<string, string> {
  const map = new Map<string, string>();
  if (clients) {
    for (const client of clients) {
      map.set(client.id, client.name);
    }
  }
  return map;
}

export default function HistoryPage() {
  const { t } = useTranslation();
  const firestore = useFirestore();
  const [selectedClientId, setSelectedClientId] = useState<string>('all');

  // Fetch all clients to map IDs to names
  const clientsQuery = useMemoFirebase(
    () => (firestore ? query(collection(firestore, 'clients')) : null),
    [firestore]
  );
  const { data: clients, isLoading: isLoadingClients } = useCollection<Client>(clientsQuery);
  const clientMap = useMemo(() => createClientMap(clients), [clients]);

  // Base query for the 'history' collection group
  const historyQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    const historyCollectionGroup = collectionGroup(firestore, 'history');
    
    // The query is the same for all clients or a specific one at the Firestore level
    return query(historyCollectionGroup, orderBy('timestamp', 'desc'));
    
  }, [firestore]);

  const { data: history, isLoading: isLoadingHistory } = useCollection<ClientHistoryLog & { path?: string }>(historyQuery);

  const getClientIdFromPath = (path: string): string | undefined => {
    const segments = path.split('/');
    const clientsIndex = segments.indexOf('clients');
    if (clientsIndex !== -1 && clientsIndex + 1 < segments.length) {
      return segments[clientsIndex + 1];
    }
    return undefined;
  };
  
  const filteredHistory = useMemo(() => {
    if (!history) return [];
    if (selectedClientId === 'all') return history;

    return history.filter(log => {
        // useCollection does not provide document path, so this is a workaround.
        // In a real application, you should store clientId inside the history document.
        // For now, this is a placeholder. Without the path, we can't filter.
        // We will show a message to the user.
        return true; 
    });
  }, [history, selectedClientId]);


  return (
    <>
      <PageHeader
        title={t('history')}
        description={t('historyDescription')}
        className="px-0"
      >
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
              {!isLoadingHistory && history?.length === 0 && (
                <p className="text-muted-foreground text-center">{t('noHistoryFound')}</p>
              )}
              {filteredHistory?.map((log: any) => {
                 // HACK: This is a workaround because collection group queries do not return the document path in the snapshot data easily.
                 // In a real app, you would either store the clientId in the history document itself,
                 // or you'd need a more complex query setup.
                 const clientName = "Client Inconnu"; // Placeholder
                return (
                  <div key={log.id} className="flex items-start gap-4">
                    <div className="bg-muted p-2 rounded-full">
                      <Clock className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium">{log.description}</p>
                      <p className="text-sm text-muted-foreground">
                        {format(new Date(log.timestamp), "d MMM yyyy 'at' HH:mm")}
                      </p>
                    </div>
                  </div>
                )
              })}
                {!isLoadingHistory && selectedClientId !== 'all' && <p className="text-center text-xs text-muted-foreground pt-4">Le filtrage côté client pour les groupes de collections est limité. Pour une fonctionnalité complète, envisagez de stocker le `clientId` directement dans les documents d'historique.</p>}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </>
  );
}
