'use client';

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
import { ClientActions } from './client-actions';
import { PageHeader } from '@/components/page-header';
import { useCollection, useFirestore } from '@/firebase';
import { useMemoFirebase } from '@/firebase/provider';
import { collection, query } from 'firebase/firestore';
import type { Client } from '@/app/lib/data';

export default function ClientsPage() {
  const firestore = useFirestore();
  const clientsQuery = useMemoFirebase(
    () => (firestore ? query(collection(firestore, 'clients')) : null),
    [firestore]
  );
  const { data: clients, isLoading } = useCollection<Client>(clientsQuery);

  return (
    <>
      <PageHeader
        title="Client Management"
        description="View, create, and manage client profiles and subscriptions."
        className="px-0"
      >
        <ClientActions mode="add" />
      </PageHeader>
      <Card>
        <CardHeader>
          <CardTitle className="font-headline">Clients</CardTitle>
          <CardDescription>
            A list of all registered clients in CyberHub.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Subscription</TableHead>
                <TableHead className="hidden md:table-cell">
                  Member Since
                </TableHead>
                <TableHead>
                  <span className="sr-only">Actions</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading &&
                Array.from({ length: 4 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell colSpan={4}>
                      <div className="h-8 w-full animate-pulse rounded-md bg-muted" />
                    </TableCell>
                  </TableRow>
                ))}
              {clients &&
                clients.map((client) => (
                  <TableRow key={client.id}>
                    <TableCell className="font-medium">
                      <div className="font-medium">{client.name}</div>
                      <div className="hidden text-sm text-muted-foreground md:inline">
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
                    <TableCell className="hidden md:table-cell">
                      {client.memberSince}
                    </TableCell>
                    <TableCell>
                      <ClientActions mode="actions" client={client} />
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
