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
import { PageHeader } from '@/components/page-header';
import { useCollection, useFirestore } from '@/firebase';
import { useMemoFirebase } from '@/firebase/provider';
import { collection, query } from 'firebase/firestore';
import type { Station } from '@/app/lib/data';
import { StationActions } from './station-actions';
import { Gamepad2, Monitor, Headset } from 'lucide-react';

export default function StationsPage() {
  const firestore = useFirestore();
  const stationsQuery = useMemoFirebase(
    () => (firestore ? query(collection(firestore, 'stations')) : null),
    [firestore]
  );
  const { data: stations, isLoading } = useCollection<Station>(stationsQuery);

  const getIcon = (type: string) => {
    switch (type) {
      case 'PC':
        return <Monitor className="h-5 w-5" />;
      case 'PS5':
        return <Gamepad2 className="h-5 w-5" />;
      case 'PS5 VIP':
        return <Gamepad2 className="h-5 w-5 text-primary" />;
      case 'VR Simulator':
        return <Headset className="h-5 w-5" />;
      default:
        return null;
    }
  };

  return (
    <>
      <PageHeader
        title="Station Management"
        description="View, create, and manage gaming stations."
      >
        <StationActions mode="add" />
      </PageHeader>
      <Card>
        <CardHeader>
          <CardTitle className="font-headline">Stations</CardTitle>
          <CardDescription>
            A list of all gaming stations in CyberHub.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Station ID</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>
                  <span className="sr-only">Actions</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading &&
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell colSpan={4}>
                      <div className="h-8 w-full animate-pulse rounded-md bg-muted" />
                    </TableCell>
                  </TableRow>
                ))}
              {stations &&
                stations.map((station) => (
                  <TableRow key={station.id}>
                    <TableCell className="font-medium">{station.id}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {getIcon(station.type)}
                        {station.type}
                      </div>
                    </TableCell>
                    <TableCell>
                       <Badge
                        variant={
                          station.status === 'available'
                            ? 'secondary'
                            : 'destructive'
                        }
                        className={`capitalize ${
                          station.status === 'available'
                            ? 'bg-green-500/20 text-green-400 border-green-500/20'
                            : station.status === 'in use' ? 'bg-orange-500/20 text-orange-400 border-orange-500/20' : 'bg-red-500/20 text-red-400 border-red-500/20'
                        }`}
                      >
                        {station.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <StationActions mode="actions" station={station} />
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
