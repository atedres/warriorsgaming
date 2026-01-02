
'use client';

import { useCollection, useFirestore } from '@/firebase';
import { useMemoFirebase } from '@/firebase/provider';
import { collection, query } from 'firebase/firestore';
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
import { Badge } from '@/components/ui/badge';
import { ContentActions } from './content-actions';
import { formatCurrency } from '@/lib/utils';

export function PricesTable() {
  const firestore = useFirestore();
  const pricesQuery = useMemoFirebase(
    () => (firestore ? query(collection(firestore, 'prices')) : null),
    [firestore]
  );
  const { data: prices, isLoading } = useCollection<Price>(pricesQuery);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Grille Tarifaire</CardTitle>
        <CardDescription>
          Les tarifs affichés sur la page d'accueil.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Type de Poste</TableHead>
              <TableHead>Durée</TableHead>
              <TableHead>Type de Tarif</TableHead>
              <TableHead>Prix</TableHead>
              <TableHead>
                <div className="text-right">
                    <ContentActions mode="add" type="price" />
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
            {prices?.sort((a,b) => a.price - b.price).map((price) => (
              <TableRow key={price.id}>
                <TableCell className="font-medium">{price.stationType}</TableCell>
                <TableCell>{price.duration}</TableCell>
                <TableCell>
                  <Badge variant={price.isEveningRate ? 'default' : 'secondary'}>
                    {price.isEveningRate ? 'Soir' : 'Jour'}
                  </Badge>
                </TableCell>
                <TableCell>{formatCurrency(price.price)}</TableCell>
                <TableCell className="text-right">
                  <ContentActions mode="actions" type="price" item={price} />
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
  );
}
