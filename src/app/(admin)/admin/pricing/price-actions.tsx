
'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { MoreHorizontal, PlusCircle, Trash2 } from 'lucide-react';
import { useFirestore } from '@/firebase';
import { doc, collection } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import {
  setDocumentNonBlocking,
  deleteDocumentNonBlocking
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
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
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
  startHour: z.coerce.number().min(0).max(23),
  endHour: z.coerce.number().min(1).max(24),
  pricePerHourWeekday: z.coerce.number().min(0, 'Le prix doit être positif.'),
  pricePerHourWeekend: z.coerce.number().min(0, 'Le prix doit être positif.'),
}).refine(data => data.endHour > data.startHour, {
    message: "L'heure de fin doit être après l'heure de début.",
    path: ['endHour']
});

type PriceFormValues = z.infer<typeof priceSchema>;

type PriceActionsProps =
  | { mode: 'add'; item?: never }
  | { mode: 'actions'; item: Price };

const hourOptions = Array.from({ length: 25 }, (_, i) => ({ value: i, label: `${String(i).padStart(2, '0')}:00` }));


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
  
  useEffect(() => {
    form.reset(defaultValues);
  }, [defaultValues, form]);


  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="stationType"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Type de Poste</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
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
        <div className="grid grid-cols-2 gap-4">
             <FormField
                control={form.control}
                name="startHour"
                render={({ field }) => (
                    <FormItem>
                        <FormLabel>Heure de Début</FormLabel>
                        <Select onValueChange={(val) => field.onChange(Number(val))} defaultValue={String(field.value)}>
                            <FormControl><SelectTrigger><SelectValue/></SelectTrigger></FormControl>
                            <SelectContent>
                                {hourOptions.slice(0, 24).map(h => <SelectItem key={`start-${h.value}`} value={String(h.value)}>{h.label}</SelectItem>)}
                            </SelectContent>
                        </Select>
                        <FormMessage />
                    </FormItem>
                )}
            />
            <FormField
                control={form.control}
                name="endHour"
                render={({ field }) => (
                    <FormItem>
                        <FormLabel>Heure de Fin</FormLabel>
                        <Select onValueChange={(val) => field.onChange(Number(val))} defaultValue={String(field.value)}>
                            <FormControl><SelectTrigger><SelectValue/></SelectTrigger></FormControl>
                            <SelectContent>
                                {hourOptions.slice(1, 25).map(h => <SelectItem key={`end-${h.value}`} value={String(h.value)}>{h.label}</SelectItem>)}
                            </SelectContent>
                        </Select>
                        <FormMessage />
                    </FormItem>
                )}
            />
        </div>
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


export function PriceActions({ mode, item }: PriceActionsProps) {
  const [isDialogOpen, setDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const firestore = useFirestore();
  const { toast } = useToast();

  const handlePriceSubmit = (data: PriceFormValues) => {
    if (!firestore) return;
    
    setIsSubmitting(true);
    
    const id = item?.id || doc(collection(firestore, 'prices')).id;
    const ref = doc(firestore, 'prices', id);

    const priceData: Price = {
        ...data,
        id: id,
    };

    setDocumentNonBlocking(ref, priceData, { merge: true });

    toast({
      title: `Tarif ${item ? 'mis à jour' : 'ajouté'}`,
      description: `Le créneau tarifaire pour ${data.stationType} a été enregistré.`,
    });
    setDialogOpen(false);
    setIsSubmitting(false);
  };

  const handleDelete = () => {
    if (!firestore || !item) return;
    const ref = doc(firestore, 'prices', item.id);
    deleteDocumentNonBlocking(ref);
    toast({ variant: 'destructive', title: 'Tarif supprimé' });
  };


  if (mode === 'add') {
    return (
      <Dialog open={isDialogOpen} onOpenChange={setDialogOpen}>
        <DialogTrigger asChild>
          <Button size="sm" className="h-8 gap-1">
            <PlusCircle className="h-3.5 w-3.5" />
            <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">
              Ajouter un tarif
            </span>
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ajouter un créneau tarifaire</DialogTitle>
            <DialogDescription>
              Définissez un tarif pour un type de poste et un créneau horaire.
            </DialogDescription>
          </DialogHeader>
          <PriceForm 
            defaultValues={{ 
                stationType: 'PC', 
                startHour: 10,
                endHour: 18,
                pricePerHourWeekday: 0, 
                pricePerHourWeekend: 0 
            }} 
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
                <DropdownMenuItem onSelect={() => setDialogOpen(true)}>
                    Modifier
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onSelect={handleDelete} className="text-red-500">
                    <Trash2 className="mr-2 h-4 w-4" />
                    Supprimer
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
        <DialogContent>
            <DialogHeader>
                <DialogTitle>Modifier le créneau tarifaire</DialogTitle>
            </DialogHeader>
            <PriceForm 
                defaultValues={item} 
                onSubmit={handlePriceSubmit} 
                isEditing={true} 
                onClose={() => setDialogOpen(false)} 
            />
        </DialogContent>
      </Dialog>
  );
}

    