'use client';

import Image from 'next/image';
import { useCollection, useFirestore } from '@/firebase';
import { useMemoFirebase } from '@/firebase/provider';
import { collection, query } from 'firebase/firestore';
import type { Consumable } from '@/app/lib/data';
import { formatCurrency } from '@/lib/utils';
import { useTranslation } from '@/hooks/use-translation';
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
import { ConsumptionActions } from './consumption-actions';

export function ConsumablesTable() {
  const { t } = useTranslation();
  const firestore = useFirestore();
  const consumablesQuery = useMemoFirebase(
    () => (firestore ? query(collection(firestore, 'consumables')) : null),
    [firestore]
  );
  const { data: consumables, isLoading } = useCollection<Consumable>(consumablesQuery);

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('consumables')}</CardTitle>
        <CardDescription>{t('consumablesDescription')}</CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="hidden w-[100px] sm:table-cell">
                <span className="sr-only">Image</span>
              </TableHead>
              <TableHead>{t('itemName')}</TableHead>
              <TableHead>{t('price')}</TableHead>
              <TableHead>
                <div className="text-right">
                    <ConsumptionActions mode="add" />
                </div>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && Array.from({ length: 3 }).map((_, i) => (
                <TableRow key={i}>
                    <TableCell colSpan={4}><div className="h-10 w-full animate-pulse rounded-md bg-muted" /></TableCell>
                </TableRow>
            ))}
            {consumables?.map((item) => (
              <TableRow key={item.id}>
                <TableCell className="hidden sm:table-cell">
                  <Image
                    alt={item.name}
                    className="aspect-square rounded-md object-cover"
                    height="64"
                    src={item.imageUrl}
                    width="64"
                  />
                </TableCell>
                <TableCell className="font-medium">{item.name}</TableCell>
                <TableCell>{formatCurrency(item.price)}</TableCell>
                <TableCell className="text-right">
                  <ConsumptionActions mode="actions" item={item} />
                </TableCell>
              </TableRow>
            ))}
             {!isLoading && consumables?.length === 0 && (
                <TableRow>
                    <TableCell colSpan={4} className="text-center">{t('noConsumablesFound')}</TableCell>
                </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
