
'use client';

import { useState } from 'react';
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
import { Badge } from '@/components/ui/badge';
import { ClientActions, QrCodeDialog, ClientHistoryDialog } from './client-actions';
import { PageHeader } from '@/components/page-header';
import { useCollection, useFirestore } from '@/firebase';
import { useMemoFirebase } from '@/firebase/provider';
import { collection, query } from 'firebase/firestore';
import type { Client } from '@/app/lib/data';
import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';
import { useTranslation } from '@/hooks/use-translation';
import { Button } from '@/components/ui/button';

export default function ClientsPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const { t } = useTranslation();
  const firestore = useFirestore();
  const clientsQuery = useMemoFirebase(
    () => (firestore ? query(collection(firestore, 'clients')) : null),
    [firestore]
  );
  const { data: clients, isLoading } = useCollection<Client>(clientsQuery);

  const filteredClients =
    clients?.filter((client) =>
      client.name.toLowerCase().includes(searchTerm.toLowerCase())
    ) || [];

  return (
    <>
      <PageHeader
        title={t('clientManagement')}
        description={t('clientManagementDescription')}
        className="px-0"
      >
      </PageHeader>
      <Card>
        <CardHeader>
          <CardTitle className="font-headline">{t('clients')}</CardTitle>
          <CardDescription>
            A list of all registered clients in Warriors Gaming.
          </CardDescription>
          <div className="relative pt-4">
            <div className="relative flex items-center">
              <Search className="absolute left-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={t('searchByName')}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8 w-full md:w-1/2 lg:w-1/3"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Desktop Table View */}
          <div className="hidden md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('clientName')}</TableHead>
                  <TableHead>{t('subscription')}</TableHead>
                  <TableHead className="hidden lg:table-cell">{t('subscriptionHours')}</TableHead>
                  <TableHead className="hidden md:table-cell">
                    {t('memberSince')}
                  </TableHead>
                  <TableHead>
                    <span className="sr-only">{t('actions')}</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading &&
                  Array.from({ length: 4 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell colSpan={5}>
                        <div className="h-8 w-full animate-pulse rounded-md bg-muted" />
                      </TableCell>
                    </TableRow>
                  ))}
                {filteredClients.length === 0 && !isLoading ? (
                  <TableRow>
                      <TableCell colSpan={5} className="text-center">
                          {t('noClientsFound')}
                      </TableCell>
                  </TableRow>
                ) : filteredClients.map((client) => (
                    <TableRow key={client.id}>
                      <TableCell>
                        <div className="font-medium">{client.name}</div>
                        <div className="text-sm text-muted-foreground">
                          {client.email}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            client.subscriptionTier === 'VIP'
                              ? 'default'
                              : 'secondary'
                          }
                          className={
                            client.subscriptionTier === 'VIP'
                              ? `bg-accent text-accent-foreground`
                              : `bg-primary/80 text-primary-foreground`
                          }
                        >
                          {client.subscriptionTier}
                        </Badge>
                      </TableCell>
                      <TableCell className="hidden lg:table-cell">{client.subscriptionHours ?? 0}</TableCell>
                      <TableCell className="hidden md:table-cell">
                        {client.memberSince}
                      </TableCell>
                      <TableCell className='text-right'>
                        <div className="flex items-center justify-end gap-2">
                          <QrCodeDialog client={client} />
                          <ClientHistoryDialog client={client} />
                          <ClientActions mode="edit" client={client} />
                          <ClientActions mode="delete" client={client} />
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          </div>

          {/* Mobile Card View */}
          <div className="grid gap-4 md:hidden">
             {isLoading &&
                Array.from({ length: 4 }).map((_, i) => (
                    <Card key={i} className="p-4">
                        <div className="h-24 w-full animate-pulse rounded-md bg-muted" />
                    </Card>
            ))}
             {filteredClients.length === 0 && !isLoading ? (
                <div className="text-center text-muted-foreground py-8">
                    {t('noClientsFound')}
                </div>
              ) : filteredClients.map((client) => (
                  <Card key={client.id} className="p-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <div className="font-medium">{client.name}</div>
                            <div className="text-sm text-muted-foreground">{client.email}</div>
                        </div>
                        <ClientActions mode="delete" client={client} />
                    </div>
                    <div className="mt-4 flex items-center justify-between text-sm">
                        <Badge
                            variant={client.subscriptionTier === 'VIP' ? 'default' : 'secondary'}
                             className={
                                client.subscriptionTier === 'VIP'
                                ? `bg-accent text-accent-foreground`
                                : `bg-primary/80 text-primary-foreground`
                            }
                        >
                            {client.subscriptionTier}
                        </Badge>
                        <div className="text-muted-foreground">
                            Membre depuis: {client.memberSince}
                        </div>
                    </div>
                     <div className="mt-4 pt-4 border-t flex items-center justify-end gap-2">
                        <QrCodeDialog client={client} />
                        <ClientHistoryDialog client={client} />
                        <ClientActions mode="edit" client={client} />
                      </div>
                  </Card>
            ))}
          </div>

        </CardContent>
      </Card>
    </>
  );
}
