
'use client';

import { useState, useMemo, useEffect } from 'react';
import { collection, query, orderBy, getDocs, QuerySnapshot, DocumentData } from 'firebase/firestore';
import { useCollection, useFirestore } from '@/firebase';
import { useMemoFirebase } from '@/firebase/provider';
import type { Client, ClientHistoryLog } from '@/app/lib/data';
import { PageHeader } from '@/components/page-header';
import { useTranslation } from '@/hooks/use-translation';
import { formatHistoryDescription } from '@/lib/translations';
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

type CombinedHistoryLog = ClientHistoryLog & { clientName: string, clientId: string };

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

  useEffect(() => {
    const fetchAllHistory = async () => {
      if (!firestore || isLoadingClients) {
        return;
      }
      if (!clients) {
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
    };

    fetchAllHistory();
  }, [firestore, clients, isLoadingClients]);

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
