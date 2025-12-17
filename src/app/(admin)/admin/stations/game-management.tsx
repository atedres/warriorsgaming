
'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { PlusCircle, Trash2 } from 'lucide-react';
import { useCollection, useFirestore } from '@/firebase';
import { useMemoFirebase } from '@/firebase/provider';
import { collection, doc, query } from 'firebase/firestore';
import type { Game } from '@/app/lib/data';
import {
  deleteDocumentNonBlocking,
  setDocumentNonBlocking,
} from '@/firebase/non-blocking-updates';
import { useToast } from '@/hooks/use-toast';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useTranslation } from '@/hooks/use-translation';

const addGameSchema = z.object({
  name: z.string().min(1, 'Game name cannot be empty.'),
});

type AddGameFormValues = z.infer<typeof addGameSchema>;

export function GameManagement() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const firestore = useFirestore();
  const { toast } = useToast();
  const { t } = useTranslation();

  const gamesQuery = useMemoFirebase(
    () => (firestore ? query(collection(firestore, 'games')) : null),
    [firestore]
  );
  const { data: games, isLoading } = useCollection<Game>(gamesQuery);

  const form = useForm<AddGameFormValues>({
    resolver: zodResolver(addGameSchema),
    defaultValues: { name: '' },
  });

  const handleAddGame = async (data: AddGameFormValues) => {
    if (!firestore) return;
    setIsSubmitting(true);
    const gameRef = doc(firestore, 'games', data.name);
    setDocumentNonBlocking(gameRef, { name: data.name }, { merge: false });
    toast({ title: 'Game Added', description: `${data.name} has been added to the list.` });
    form.reset();
    setIsSubmitting(false);
  };

  const handleDeleteGame = (gameId: string) => {
    if (!firestore) return;
    const gameRef = doc(firestore, 'games', gameId);
    deleteDocumentNonBlocking(gameRef);
    toast({
      title: 'Game Deleted',
      description: `${gameId} has been removed.`,
      variant: 'destructive',
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-headline">{t('gameManagement')}</CardTitle>
        <CardDescription>{t('gameManagementDescription')}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(handleAddGame)}
            className="flex items-start gap-2"
          >
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem className="flex-grow">
                  <FormControl>
                    <Input placeholder={t('enterGameName')} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" disabled={isSubmitting} size="icon">
              <PlusCircle className="h-4 w-4" />
            </Button>
          </form>
        </Form>
        <h4 className="font-medium text-sm text-muted-foreground pt-4">{t('availableGamesList')}</h4>
        <ScrollArea className="h-72 rounded-md border">
          <div className="p-4">
            {isLoading && <p>{t('loading')}...</p>}
            {games && games.length > 0 ? (
              <ul className="space-y-2">
                {games.map((game) => (
                  <li
                    key={game.id}
                    className="flex items-center justify-between text-sm p-2 rounded-md bg-muted/50"
                  >
                    <span>{game.id}</span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-muted-foreground hover:text-destructive"
                      onClick={() => handleDeleteGame(game.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </li>
                ))}
              </ul>
            ) : (
                <p className="text-sm text-muted-foreground text-center py-4">{t('noGamesAdded')}</p>
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
