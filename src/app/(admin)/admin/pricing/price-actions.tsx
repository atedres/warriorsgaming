
'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { MoreHorizontal, PlusCircle } from 'lucide-react';
import { useFirestore } from '@/firebase';
import { doc, collection } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import {
  setDocumentNonBlocking,
} from '@/firebase/non-blocking-updates';
import type { Price } from '@/app/lib/data';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const priceSchema = z.object({
  id: z.string().optional(),
  stationType: z.enum(['PC', 'PS5', 'PS5 VIP', 'VR', 'Simulator']),
  pricePerHourWeekday: z.coerce.number().min(0, 'Le prix doit être positif.'),
  pricePerHourWeekend: z.coerce.number().min(0, 'Le prix doit être positif.'),
});
type PriceFormValues = z.infer<typeof priceSchema>;

type PriceActionsProps =
  | { mode: 'add'; item?: never }
  | { mode: 'actions'; item: Price };


function PriceForm({
  defaultValues,
  onSubmit,
  isEditing,
  onClose,
}: {
  defaultValues: Partial<PriceFormValues>;
  onSubmit: (data: PriceFormValues) => void;
  isEditing: boolean;
  onClose: () => void;
}) {
  const form = useForm<PriceFormValues>({
    resolver: zodResolver(priceSchema),
    defaultValues: defaultValues
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="stationType"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Type de Poste</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value} disabled={isEditing}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionnez un type" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="PC">PC</SelectItem>
                  <SelectItem value="PS5">PS5</SelectItem>
                  <SelectItem value="PS5 VIP">PS5 VIP</SelectItem>
                  <SelectItem value="VR">VR</SelectItem>
                  <SelectItem value="Simulator">Simulator</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="pricePerHourWeekday"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Prix par Heure (Semaine)</FormLabel>
              <FormControl>
                <Input type="number" placeholder="Ex: 20" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="pricePerHourWeekend"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Prix par Heure (Week-end)</FormLabel>
              <FormControl>
                <Input type="number" placeholder="Ex: 25" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>Annuler</Button>
          <Button type="submit">Enregistrer</Button>
        </DialogFooter>
      </form>
    </Form>
  );
}

function EditPriceDialog({ item }: { item: Price }) {
    const [isOpen, setIsOpen] = useState(false);
    const firestore = useFirestore();
    const { toast } = useToast();

    const handlePriceSubmit = (data: PriceFormValues) => {
        if (!firestore) return;
        const collectionName = 'prices';
        const id = data.stationType; // Use stationType as the document ID
        const ref = doc(firestore, collectionName, id);

        const priceData: Price = {
            id: id,
            stationType: data.stationType,
            pricePerHourWeekday: data.pricePerHourWeekday,
            pricePerHourWeekend: data.pricePerHourWeekend,
        }

        setDocumentNonBlocking(ref, priceData, { merge: true });

        toast({
            title: `Tarif mis à jour`,
            description: `Le tarif pour ${data.stationType} a été enregistré avec succès.`,
        });
        setIsOpen(false);
    };

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                    Modifier
                </DropdownMenuItem>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Modifier le tarif</DialogTitle>
                </DialogHeader>
                <PriceForm defaultValues={item} onSubmit={handlePriceSubmit} isEditing={true} onClose={() => setIsOpen(false)} />
            </DialogContent>
        </Dialog>
    );
}

export function PriceActions({ mode, item }: PriceActionsProps) {
  const [isDialogOpen, setDialogOpen] = useState(false);
  const firestore = useFirestore();
  const { toast } = useToast();

  const handlePriceSubmit = (data: PriceFormValues) => {
    if (!firestore) return;
    const collectionName = 'prices';
    const id = data.stationType; // Use stationType as the document ID
    const ref = doc(firestore, collectionName, id);

    const priceData: Price = {
        id: id,
        stationType: data.stationType,
        pricePerHourWeekday: data.pricePerHourWeekday,
        pricePerHourWeekend: data.pricePerHourWeekend,
    }

    setDocumentNonBlocking(ref, priceData, { merge: true });

    toast({
      title: `Tarif ${item ? 'mis à jour' : 'ajouté'}`,
      description: `Le tarif pour ${data.stationType} a été enregistré avec succès.`,
    });
    setDialogOpen(false);
  };


  if (mode === 'add') {
    return (
      <Dialog open={isDialogOpen} onOpenChange={setDialogOpen}>
        <DialogTrigger asChild>
          <Button size="sm" className="h-8 gap-1">
            <PlusCircle className="h-3.5 w-3.5" />
            <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">
              Ajouter/Modifier un tarif
            </span>
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ajouter un tarif</DialogTitle>
            <DialogDescription>
              Remplissez les informations ci-dessous. Si un tarif pour ce type de poste existe déjà, il sera mis à jour.
            </DialogDescription>
          </DialogHeader>
          <PriceForm 
            defaultValues={{ stationType: 'PC', pricePerHourWeekday: 0, pricePerHourWeekend: 0 }} 
            onSubmit={handlePriceSubmit} 
            isEditing={false} 
            onClose={() => setDialogOpen(false)} 
          />
        </DialogContent>
      </Dialog>
    );
  }

  // mode === 'actions'
  return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button aria-haspopup="true" size="icon" variant="ghost">
            <MoreHorizontal className="h-4 w-4" />
            <span className="sr-only">Toggle menu</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuLabel>Actions</DropdownMenuLabel>
          <EditPriceDialog item={item as Price} />
        </DropdownMenuContent>
      </DropdownMenu>
  );
}
