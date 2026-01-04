
'use client';

import { useCollection, useFirestore } from '@/firebase';
import { useMemoFirebase } from '@/firebase/provider';
import { collection, query, orderBy } from 'firebase/firestore';
import type { Price } from '@/app/lib/data';
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
import { PageHeader } from '@/components/page-header';
import { formatCurrency } from '@/lib/utils';
import { useTranslation } from '@/hooks/use-translation';
import { PriceActions } from './price-actions';

export default function PricingPage() {
  const firestore = useFirestore();
  const { t } = useTranslation();
  const pricesQuery = useMemoFirebase(
    () => (firestore ? query(collection(firestore, 'prices'), orderBy('startHour', 'asc')) : null),
    [firestore]
  );
  const { data: prices, isLoading } = useCollection<Price>(pricesQuery);

  return (
    <>
       <PageHeader
        title={t('pricingManagement')}
        description={t('pricingManagementDescription')}
        className="px-0"
      />
      <Card>
        <CardHeader>
          <CardTitle>Grille Tarifaire</CardTitle>
          <CardDescription>
            Définissez les tarifs par créneau horaire. Ils seront utilisés pour calculer le coût des sessions.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Type de Poste</TableHead>
                <TableHead>Créneau Horaire</TableHead>
                <TableHead>Prix (Semaine)</TableHead>
                <TableHead>Prix (Week-end)</TableHead>
                <TableHead>
                  <div className="text-right">
                      <PriceActions mode="add" />
                  </div>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && Array.from({ length: 4 }).map((_, i) => (
                  <TableRow key={i}>
                      <TableCell colSpan={5}><div className="h-10 w-full animate-pulse rounded-md bg-muted" /></TableCell>
                  </TableRow>
              ))}
              {prices?.map((price) => (
                <TableRow key={price.id}>
                  <TableCell className="font-medium">{price.stationType}</TableCell>
                  <TableCell>{`${String(price.startHour).padStart(2, '0')}:00 - ${String(price.endHour).padStart(2, '0')}:00`}</TableCell>
                  <TableCell>{formatCurrency(price.pricePerHourWeekday)} / h</TableCell>
                  <TableCell>{formatCurrency(price.pricePerHourWeekend)} / h</TableCell>
                  <TableCell className="text-right">
                    <PriceActions mode="actions" item={price} />
                  </TableCell>
                </TableRow>
              ))}
              {!isLoading && prices?.length === 0 && (
                  <TableRow>
                      <TableCell colSpan={5} className="text-center">Aucun tarif trouvé.</TableCell>
                  </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </>
  );
}

    