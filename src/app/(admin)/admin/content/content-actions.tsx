
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
  deleteDocumentNonBlocking,
} from '@/firebase/non-blocking-updates';
import type { Price, Promotion } from '@/app/lib/data';
import { PlaceHolderImages } from '@/lib/placeholder-images';

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
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import Image from 'next/image';

// Schemas
const promoSchema = z.object({
  id: z.string().optional(),
  title: z.string().min(3, 'Le titre est requis.'),
  description: z.string().min(10, 'La description est requise.'),
  image: z.string().url('Veuillez sélectionner une image.'),
  imageHint: z.string(),
});
type PromoFormValues = z.infer<typeof promoSchema>;

const priceSchema = z.object({
  id: z.string().optional(),
  stationType: z.enum(['PC', 'PS5', 'PS5 VIP', 'VR', 'Simulator']),
  pricePerHourWeekday: z.coerce.number().min(0, 'Le prix doit être positif.'),
  pricePerHourWeekend: z.coerce.number().min(0, 'Le prix doit être positif.'),
});
type PriceFormValues = z.infer<typeof priceSchema>;

// Props
type ContentActionsProps =
  | { mode: 'add'; type: 'promotion' | 'price'; item?: never }
  | { mode: 'actions'; type: 'promotion' | 'price'; item: Promotion | Price };

// Forms
function PromotionForm({
  item,
  onSubmit,
}: {
  item?: Promotion;
  onSubmit: (data: PromoFormValues) => void;
}) {
  const form = useForm<PromoFormValues>({
    resolver: zodResolver(promoSchema),
    defaultValues: item || {
      title: '',
      description: '',
      image: '',
      imageHint: '',
    },
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="title"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Titre</FormLabel>
              <FormControl>
                <Input placeholder="Ex: Tournoi FIFA" {...field} />
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
                <Textarea placeholder="Décrivez la promotion..." {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="image"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Image</FormLabel>
              <Select
                onValueChange={(value) => {
                  const selectedImage = PlaceHolderImages.find(
                    (img) => img.imageUrl === value
                  );
                  field.onChange(value);
                  form.setValue('imageHint', selectedImage?.imageHint || '');
                }}
                defaultValue={field.value}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionnez une image" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {PlaceHolderImages.map((img) => (
                    <SelectItem key={img.id} value={img.imageUrl}>
                      <div className="flex items-center gap-2">
                        <Image
                          src={img.imageUrl}
                          width={40}
                          height={40}
                          alt={img.description}
                          className="rounded-sm"
                        />
                        <span>{img.description}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">Annuler</Button>
          </DialogClose>
          <Button type="submit">Enregistrer</Button>
        </DialogFooter>
      </form>
    </Form>
  );
}

function PriceForm({
  item,
  onSubmit,
  isEditing,
}: {
  item?: Price;
  onSubmit: (data: PriceFormValues) => void;
  isEditing: boolean;
}) {
  const form = useForm<PriceFormValues>({
    resolver: zodResolver(priceSchema),
    defaultValues: item || {
      stationType: 'PC',
      pricePerHourWeekday: 0,
      pricePerHourWeekend: 0,
    },
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
          <DialogClose asChild>
            <Button variant="outline">Annuler</Button>
          </DialogClose>
          <Button type="submit">Enregistrer</Button>
        </DialogFooter>
      </form>
    </Form>
  );
}

// Main Component
export function ContentActions({ mode, type, item }: ContentActionsProps) {
  const [isDialogOpen, setDialogOpen] = useState(false);
  const firestore = useFirestore();
  const { toast } = useToast();

  const handlePromotionSubmit = (data: PromoFormValues) => {
     if (!firestore) return;
    const collectionName = 'promotions';
    const id = item?.id || doc(collection(firestore, collectionName)).id;
    const ref = doc(firestore, collectionName, id);

    setDocumentNonBlocking(ref, { ...data, id }, { merge: true });

    toast({
      title: `Promotion ${item ? 'mise à jour' : 'ajoutée'}`,
      description: `L'élément a été enregistré avec succès.`,
    });
    setDialogOpen(false);
  };
  
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

  const handleDelete = () => {
    if (!firestore || !item) return;
    const collectionName = type === 'promotion' ? 'promotions' : 'prices';
    const ref = doc(firestore, collectionName, item.id);
    deleteDocumentNonBlocking(ref);

    toast({
      variant: 'destructive',
      title: 'Élément supprimé',
      description: 'La sélection a été supprimée.',
    });
  };

  if (mode === 'add') {
    return (
      <Dialog open={isDialogOpen} onOpenChange={setDialogOpen}>
        <DialogTrigger asChild>
          <Button size="sm" className="h-8 gap-1">
            <PlusCircle className="h-3.5 w-3.5" />
            <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">
              {type === 'price' ? 'Ajouter/Modifier un tarif' : 'Ajouter'}
            </span>
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {type === 'promotion' ? 'Ajouter une promotion' : 'Ajouter un tarif'}
            </DialogTitle>
            <DialogDescription>
              Remplissez les informations ci-dessous.
            </DialogDescription>
          </DialogHeader>
          {type === 'promotion' ? (
            <PromotionForm onSubmit={handlePromotionSubmit} />
          ) : (
            <PriceForm onSubmit={handlePriceSubmit} isEditing={false} />
          )}
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
          {type === 'promotion' && (
             <DropdownMenuItem onSelect={handleDelete} className="text-red-500">
                Supprimer
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {type === 'promotion' ? 'Modifier la promotion' : 'Modifier le tarif'}
          </DialogTitle>
        </DialogHeader>
        {type === 'promotion' ? (
          <PromotionForm
            item={item as Promotion}
            onSubmit={handlePromotionSubmit}
          />
        ) : (
          <PriceForm item={item as Price} onSubmit={handlePriceSubmit} isEditing={true} />
        )}
      </DialogContent>
    </Dialog>
  );
}
