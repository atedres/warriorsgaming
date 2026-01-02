
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { PageHeader } from '@/components/page-header';
import { useCollection, useFirestore } from '@/firebase';
import { useMemoFirebase } from '@/firebase/provider';
import { collection, query, doc } from 'firebase/firestore';
import type { Station } from '@/app/lib/data';
import { StationActions } from './station-actions';
import { Gamepad2, Monitor, Headset, Car } from 'lucide-react';
import { cn } from '@/lib/utils';
import { updateDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { GameManagement } from './game-management';
import { useTranslation } from '@/hooks/use-translation';

function StationStatusSelector({ station }: { station: Station }) {
  const firestore = useFirestore();
  const { toast } = useToast();

  const handleStatusChange = (newStatus: Station['status']) => {
    if (!firestore) return;
    const stationRef = doc(firestore, 'stations', station.id);
    updateDocumentNonBlocking(stationRef, { status: newStatus });
    toast({
      title: 'Status Updated',
      description: `Station ${station.id} is now ${newStatus}.`,
    });
  };
  
  const getStatusColor = (status: Station['status']) => {
    switch(status) {
      case 'available': return 'text-green-400 focus:text-green-400';
      case 'in use': return 'text-orange-400 focus:text-orange-400';
      case 'maintenance': return 'text-red-400 focus:text-red-400';
      default: return '';
    }
  }

  return (
    <Select value={station.status} onValueChange={handleStatusChange}>
      <SelectTrigger className={cn("w-[120px] border-0 focus:ring-0 capitalize", getStatusColor(station.status))}>
        <SelectValue placeholder="Set Status" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="available">Available</SelectItem>
        <SelectItem value="in use">In Use</SelectItem>
        <SelectItem value="maintenance">Maintenance</SelectItem>
      </SelectContent>
    </Select>
  );
}

export default function StationsPage() {
  const firestore = useFirestore();
  const { t } = useTranslation();
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
      case 'VR':
        return <Headset className="h-5 w-5" />;
      case 'Simulator':
        return <Car className="h-5 w-5" />;
      default:
        return null;
    }
  };

  return (
    <>
      <PageHeader
        title={t('stationManagement')}
        description={t('stationManagementDescription')}
        className="px-0"
      >
      </PageHeader>
      
      <div className="grid gap-8 lg:grid-cols-3">
        <div className="lg:col-span-2 order-1">
            <Card>
                <CardHeader>
                <CardTitle className="font-headline">{t('stations')}</CardTitle>
                <CardDescription>
                    A list of all gaming stations in Warriors Gaming.
                </CardDescription>
                </CardHeader>
                <CardContent>
                <Table>
                    <TableHeader>
                    <TableRow>
                        <TableHead>{t('stationId')}</TableHead>
                        <TableHead className="hidden sm:table-cell">{t('type')}</TableHead>
                        <TableHead className="hidden md:table-cell">{t('games')}</TableHead>
                        <TableHead>{t('status')}</TableHead>
                        <TableHead className='text-right'>
                          <StationActions mode="add" />
                        </TableHead>
                    </TableRow>
                    </TableHeader>
                    <TableBody>
                    {isLoading &&
                        Array.from({ length: 5 }).map((_, i) => (
                        <TableRow key={i}>
                            <TableCell colSpan={5}>
                            <div className="h-8 w-full animate-pulse rounded-md bg-muted" />
                            </TableCell>
                        </TableRow>
                        ))}
                    {stations && stations.length > 0 ?
                        stations.map((station) => (
                        <TableRow key={station.id}>
                            <TableCell className="font-medium">{station.id}</TableCell>
                            <TableCell className="hidden sm:table-cell">
                            <div className="flex items-center gap-2">
                                {getIcon(station.type)}
                                {station.type}
                            </div>
                            </TableCell>
                            <TableCell className="hidden md:table-cell">
                            <div className="flex flex-wrap gap-1 max-w-xs">
                                {station.games?.map(game => (
                                <Badge key={game} variant="secondary">{game}</Badge>
                                ))}
                            </div>
                            </TableCell>
                            <TableCell>
                            <StationStatusSelector station={station} />
                            </TableCell>
                            <TableCell className='text-right'>
                            <StationActions mode="actions" station={station} />
                            </TableCell>
                        </TableRow>
                        )) : (
                           <TableRow>
                                <TableCell colSpan={5} className="text-center">
                                    {t('noStationsFound')}
                                </TableCell>
                           </TableRow>
                        )}
                    </TableBody>
                </Table>
                </CardContent>
            </Card>
        </div>
        <div className="lg:col-span-1 order-2 lg:order-last">
            <GameManagement />
        </div>
      </div>
    </>
  );
}
