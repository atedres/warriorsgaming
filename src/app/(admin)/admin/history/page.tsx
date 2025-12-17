
'use client';

import { useState, useMemo, useEffect } from 'react';
import { collection, query, orderBy, getDocs, QuerySnapshot, DocumentData } from 'firebase/firestore';
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

type CombinedHistoryLog = ClientHistoryLog & { clientName: string };

export default function HistoryPage() {
  const { t } = useTranslation();
  const firestore = useFirestore();
  const [selectedClientId, setSelectedClientId] = useState<string>('all');
  const [allHistory, setAllHistory] = useState<CombinedHistoryLog[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);

  // Fetch all clients to map IDs to names and to iterate over for history fetching
  const clientsQuery = useMemoFirebase(
    () => (firestore ? query(collection(firestore, 'clients')) : null),
    [firestore]
  );
  const { data: clients, isLoading: isLoadingClients } = useCollection<Client>(clientsQuery);

  useEffect(() => {
    const fetchAllHistory = async () => {
      if (!firestore || !clients) {
        setIsLoadingHistory(clients === null); // Only keep loading if clients are not yet loaded
        return;
      }

      setIsLoadingHistory(true);
      const historyPromises: Promise<CombinedHistoryLog[]>[] = [];
      const clientMap = new Map<string, string>();
      for (const client of clients) {
        clientMap.set(client.id, client.name);
        const historyRef = collection(firestore, 'clients', client.id, 'history');
        const historyQuery = query(historyRef, orderBy('timestamp', 'desc'));
        
        historyPromises.push(
          getDocs(historyQuery).then(snapshot => 
            snapshot.docs.map(doc => ({
              ...(doc.data() as ClientHistoryLog),
              id: doc.id,
              clientName: client.name
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
    };

    fetchAllHistory();
  }, [firestore, clients]);

  const filteredHistory = useMemo(() => {
    if (selectedClientId === 'all') {
      return allHistory;
    }
    return allHistory.filter(log => {
      // We need to find the client id from the log. Since it is not in the log data,
      // we match by clientName. This is not ideal but works with current data structure.
      const client = clients?.find(c => c.name === log.clientName);
      return client?.id === selectedClientId;
    });
  }, [allHistory, selectedClientId, clients]);

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
              {!isLoadingHistory && allHistory.length === 0 && (
                <p className="text-muted-foreground text-center">{t('noHistoryFound')}</p>
              )}
              {filteredHistory?.map((log) => (
                <div key={log.id + log.timestamp} className="flex items-start gap-4">
                  <div className="bg-muted p-2 rounded-full">
                    <Clock className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium">{log.description}</p>
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
