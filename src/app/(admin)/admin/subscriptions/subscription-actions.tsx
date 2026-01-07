
'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { MoreHorizontal, PlusCircle, Trash2 } from 'lucide-react';
import { useFirestore } from '@/firebase';
import { doc, collection } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { setDocumentNonBlocking, deleteDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import type { SubscriptionCard } from '@/app/lib/data';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

const cardSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(3, "Le nom est requis."),
  description: z.string().min(5, "La description est requise."),
  price: z.coerce.number().min(0, "Le prix doit être positif."),
  hoursGranted: z.coerce.number().min(0, "Les heures doivent être positives."),
  bonusHoursGranted: z.coerce.number().min(0, "Les heures bonus doivent être positives."),
});
type CardFormValues = z.infer<typeof cardSchema>;

type SubscriptionCardActionsProps =
  | { mode: 'add'; item?: never }
  | { mode: 'actions'; item: SubscriptionCard };

function SubscriptionCardForm({ item, onSubmit }: { item?: SubscriptionCard; onSubmit: (data: CardFormValues) => void; }) {
  const form = useForm<CardFormValues>({
    resolver: zodResolver(cardSchema),
    defaultValues: item || {
      name: '',
      description: '',
      price: 0,
      hoursGranted: 0,
      bonusHoursGranted: 0,
    },
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nom de la carte</FormLabel>
              <FormControl>
                <Input placeholder="Ex: Pack Bronze" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description</FormLabel>
              <FormControl>
                <Textarea placeholder="Ex: 10 heures de jeu" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="price"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Prix (en MAD)</FormLabel>
              <FormControl>
                <Input type="number" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="hoursGranted"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Heures d'abonnement</FormLabel>
                <FormControl>
                  <Input type="number" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="bonusHoursGranted"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Heures Bonus</FormLabel>
                <FormControl>
                  <Input type="number" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <DialogFooter>
          <DialogClose asChild><Button variant="outline">Annuler</Button></DialogClose>
          <Button type="submit">Enregistrer</Button>
        </DialogFooter>
      </form>
    </Form>
  );
}

export function SubscriptionCardActions({ mode, item }: SubscriptionCardActionsProps) {
  const [isDialogOpen, setDialogOpen] = useState(false);
  const firestore = useFirestore();
  const { toast } = useToast();

  const handleFormSubmit = (data: CardFormValues) => {
    if (!firestore) return;
    const collectionName = 'subscriptionCards';
    const id = item?.id || doc(collection(firestore, collectionName)).id;
    const ref = doc(firestore, collectionName, id);

    setDocumentNonBlocking(ref, { ...data, id }, { merge: true });

    toast({
      title: `Carte ${item ? 'mise à jour' : 'ajoutée'}`,
      description: `La carte ${data.name} a été enregistrée.`,
    });
    setDialogOpen(false);
  };

  const handleDelete = () => {
    if (!firestore || !item) return;
    const ref = doc(firestore, 'subscriptionCards', item.id);
    deleteDocumentNonBlocking(ref);

    toast({
      variant: 'destructive',
      title: 'Carte supprimée',
      description: 'La carte a bien été supprimée.',
    });
  };

  if (mode === 'add') {
    return (
      <Dialog open={isDialogOpen} onOpenChange={setDialogOpen}>
        <DialogTrigger asChild>
          <Button size="sm">
            <PlusCircle className="mr-2 h-4 w-4" />
            Ajouter une carte
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ajouter une Carte d'Abonnement</DialogTitle>
            <DialogDescription>Remplissez les détails de la nouvelle carte.</DialogDescription>
          </DialogHeader>
          <SubscriptionCardForm onSubmit={handleFormSubmit} />
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isDialogOpen} onOpenChange={setDialogOpen}>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button aria-haspopup="true" size="icon" variant="ghost">
            <MoreHorizontal className="h-4 w-4" />
            <span className="sr-only">Toggle menu</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuLabel>Actions</DropdownMenuLabel>
          <DropdownMenuItem onSelect={() => setDialogOpen(true)}>Modifier</DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={handleDelete} className="text-red-500">
            <Trash2 className="mr-2 h-4 w-4" />
            Supprimer
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <DialogContent>
        <DialogHeader>
          <DialogTitle>Modifier la Carte d'Abonnement</DialogTitle>
        </DialogHeader>
        <SubscriptionCardForm item={item} onSubmit={handleFormSubmit} />
      </DialogContent>
    </Dialog>
  );
}
