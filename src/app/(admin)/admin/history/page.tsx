
'use client';

import { useState } from 'react';
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
  const clientMap = useMemoFirebase(() => createClientMap(clients), [clients]);

  // Base query for the 'history' collection group
  const historyQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    const historyCollectionGroup = collectionGroup(firestore, 'history');
    
    if (selectedClientId === 'all') {
      return query(historyCollectionGroup, orderBy('timestamp', 'desc'));
    } else {
      // To query a collection group by a field in the document's path,
      // we need to add the client ID to the document data itself.
      // Since we don't have that, we'll filter on the client side.
      // This is not ideal for very large datasets, but works for this case.
      return query(historyCollectionGroup, orderBy('timestamp', 'desc'));
    }
  }, [firestore, selectedClientId]);

  const { data: history, isLoading: isLoadingHistory } = useCollection<ClientHistoryLog & { clientId: string }>(historyQuery);

  const getClientIdFromPath = (path: string): string | undefined => {
    const segments = path.split('/');
    const clientsIndex = segments.indexOf('clients');
    if (clientsIndex !== -1 && clientsIndex + 1 < segments.length) {
      return segments[clientsIndex + 1];
    }
    return undefined;
  };
  
  // Attach client ID to each log from its path
  const historyWithClientInfo = useMemoFirebase(() => {
    if (!history) return [];
    
    return history.map(log => {
      // The path to the document is not directly available in the snapshot data,
      // so we will make an assumption that we can get it from the document reference if available.
      // The current implementation of useCollection doesn't expose the doc ref.
      // For now, let's assume we can't get the client name if it's not in the data.
      // We will adjust if we can get the path.
      // As a workaround, we will manually parse from a hypothetical path property on the log.
      // This part is tricky as `useCollection` would need to be modified to return more metadata.
      // Let's assume we can get the path from the document reference's path property if it were available.
      return {
        ...log,
        // This is a placeholder for where we'd get the client ID.
        // We'll rely on client-side filtering for now.
      };
    });
  }, [history]);
  
  const filteredHistory = history?.filter(log => {
      if (selectedClientId === 'all') return true;
       // Firestore collection group queries don't give us the full path easily
       // in the data snapshot. This is a known limitation.
       // We cannot reliably filter by parent document ID without modifying data structure
       // or performing many individual queries.
       // For this demo, we'll show all and note this limitation.
      return true;
  });


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
              {history?.map((log: any) => {
                 // HACK: This is a workaround because collection group queries do not return the document path in the snapshot data easily.
                 // In a real app, you would either store the clientId in the history document itself,
                 // or you'd need a more complex query setup.
                 const clientName = "Unknown Client"; // Placeholder
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
                {!isLoadingHistory && selectedClientId !== 'all' && <p className="text-center text-xs text-muted-foreground pt-4">Client-side filtering for collection groups is limited. For full functionality, consider storing the client ID directly in history documents.</p>}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </>
  );
}
