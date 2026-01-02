
'use client';

import Image from 'next/image';
import { useCollection, useFirestore } from '@/firebase';
import { useMemoFirebase } from '@/firebase/provider';
import { collection, query, doc } from 'firebase/firestore';
import type { Promotion } from '@/app/lib/data';
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
import { ContentActions } from './content-actions';

export function PromotionsTable() {
  const firestore = useFirestore();
  const promotionsQuery = useMemoFirebase(
    () => (firestore ? query(collection(firestore, 'promotions')) : null),
    [firestore]
  );
  const { data: promotions, isLoading } = useCollection<Promotion>(promotionsQuery);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Toutes les promotions</CardTitle>
        <CardDescription>
          Promotions affichées sur la page d'accueil.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="hidden w-[100px] sm:table-cell">
                <span className="sr-only">Image</span>
              </TableHead>
              <TableHead>Titre</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>
                <div className="text-right">
                    <ContentActions mode="add" type="promotion" />
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
            {promotions?.map((promo) => (
              <TableRow key={promo.id}>
                <TableCell className="hidden sm:table-cell">
                  <Image
                    alt={promo.title}
                    className="aspect-square rounded-md object-cover"
                    height="64"
                    src={promo.image}
                    width="64"
                  />
                </TableCell>
                <TableCell className="font-medium">{promo.title}</TableCell>
                <TableCell>{promo.description}</TableCell>
                <TableCell className="text-right">
                  <ContentActions mode="actions" type="promotion" item={promo} />
                </TableCell>
              </TableRow>
            ))}
             {!isLoading && promotions?.length === 0 && (
                <TableRow>
                    <TableCell colSpan={4} className="text-center">Aucune promotion trouvée.</TableCell>
                </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
