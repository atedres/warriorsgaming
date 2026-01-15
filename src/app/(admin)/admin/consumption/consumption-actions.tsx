'use client';

import React, { useState, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { MoreHorizontal, PlusCircle, UploadCloud, Crop, Trash2 } from 'lucide-react';
import { useFirestore } from '@/firebase';
import { doc, collection } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import {
  setDocumentNonBlocking,
  deleteDocumentNonBlocking,
} from '@/firebase/non-blocking-updates';
import type { Consumable } from '@/app/lib/data';
import { useTranslation } from '@/hooks/use-translation';

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
import Image from 'next/image';

import ReactCrop, { type Crop as CropType, centerCrop, makeAspectCrop } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';
import { formatCurrency } from '@/lib/utils';

// Schemas
const consumableSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(2, 'Le nom est requis.'),
  price: z.coerce.number().min(0, 'Le prix doit être positif.'),
  imageUrl: z.string().url('Veuillez sélectionner une image.'),
  imageHint: z.string().optional(),
});
type ConsumableFormValues = z.infer<typeof consumableSchema>;

// Props
type ConsumptionActionsProps =
  | { mode: 'add'; item?: never }
  | { mode: 'actions'; item: Consumable };

  
function getCroppedImg(
    image: HTMLImageElement,
    crop: CropType,
    fileName: string
): Promise<File> {
    const canvas = document.createElement('canvas');
    const scaleX = image.naturalWidth / image.width;
    const scaleY = image.naturalHeight / image.height;
    canvas.width = crop.width;
    canvas.height = crop.height;
    const ctx = canvas.getContext('2d');

    if (!ctx) {
        return Promise.reject(new Error('Canvas context is not available'));
    }

    const pixelRatio = window.devicePixelRatio;
    canvas.width = crop.width * pixelRatio;
    canvas.height = crop.height * pixelRatio;
    ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    ctx.imageSmoothingQuality = 'high';

    ctx.drawImage(
        image,
        crop.x * scaleX,
        crop.y * scaleY,
        crop.width * scaleX,
        crop.height * scaleY,
        0,
        0,
        crop.width,
        crop.height
    );

    return new Promise((resolve, reject) => {
        canvas.toBlob(
            (blob) => {
                if (!blob) {
                    reject(new Error('Canvas is empty'));
                    return;
                }
                const file = new File([blob], fileName, { type: blob.type });
                resolve(file);
            },
            'image/jpeg',
            0.95
        );
    });
}

function CloudinaryUploadButton({ onUpload }: { onUpload: (url: string) => void }) {
  const [isUploading, setIsUploading] = useState(false);
  const { toast } = useToast();
  const [imgSrc, setImgSrc] = useState('');
  const [crop, setCrop] = useState<CropType>();
  const [completedCrop, setCompletedCrop] = useState<CropType>();
  const [isCropModalOpen, setIsCropModalOpen] = useState(false);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [originalFile, setOriginalFile] = useState<File | null>(null);


  function centerAspectCrop(
    mediaWidth: number,
    mediaHeight: number,
    aspect: number
  ) {
    return centerCrop(
      makeAspectCrop(
        {
          unit: '%',
          width: 90,
        },
        aspect,
        mediaWidth,
        mediaHeight
      ),
      mediaWidth,
      mediaHeight
    );
  }

  function onImageLoad(e: React.SyntheticEvent<HTMLImageElement>) {
    const { width, height } = e.currentTarget;
    setCrop(centerAspectCrop(width, height, 1 / 1)); // Square aspect ratio for items
  }


  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files.length > 0) {
      const file = event.target.files[0];
      setOriginalFile(file);
      setCrop(undefined); 
      const reader = new FileReader();
      reader.addEventListener('load', () =>
        setImgSrc(reader.result?.toString() || '')
      );
      reader.readAsDataURL(file);
      setIsCropModalOpen(true);
    }
  };
  
  const handleUploadCroppedImage = async () => {
    if (!completedCrop || !imgRef.current || !originalFile) {
        toast({ variant: 'destructive', title: 'Erreur', description: 'Aucune zone de recadrage sélectionnée.' });
        return;
    }
    
    setIsUploading(true);

    try {
        const croppedImageFile = await getCroppedImg(imgRef.current, completedCrop, originalFile.name);

        const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
        const apiKey = process.env.NEXT_PUBLIC_CLOUDINARY_API_KEY;
        const uploadPreset = 'warriors_gaming';
        const folder = 'warriors_gaming_consumables';

        if (!cloudName || !apiKey) {
            console.error("Cloudinary config is not set.");
            toast({
              variant: 'destructive',
              title: 'Erreur de configuration',
              description: 'La configuration Cloudinary (cloud name, api key) est incomplète.'
            });
            setIsUploading(false);
            return;
        }

        const timestamp = Math.round(new Date().getTime() / 1000);
        
        const paramsToSign = {
          timestamp: timestamp,
          upload_preset: uploadPreset,
          folder: folder,
        };

        const signResponse = await fetch('/api/sign-cloudinary-params', {
          method: 'POST',
          body: JSON.stringify({ paramsToSign }),
        });

        if (!signResponse.ok) {
            const errorText = await signResponse.text();
            throw new Error(`Failed to get signature from server: ${errorText}`);
        }

        const { signature } = await signResponse.json();

        const formData = new FormData();
        formData.append('file', croppedImageFile);
        formData.append('api_key', apiKey);
        formData.append('timestamp', String(timestamp));
        formData.append('signature', signature);
        formData.append('upload_preset', uploadPreset);
        formData.append('folder', folder);
        
        const uploadResponse = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
            method: 'POST',
            body: formData,
        });

        if (!uploadResponse.ok) {
            let errorText = 'Upload failed due to an unknown error.';
            try {
              const errorData = await uploadResponse.json();
              errorText = errorData.error.message || JSON.stringify(errorData);
            } catch (e) {
              errorText = await uploadResponse.text();
            }
            throw new Error(errorText);
        }

        const data = await uploadResponse.json();
        onUpload(data.secure_url);
        
        setIsCropModalOpen(false);
        setImgSrc('');

    } catch (error: any) {
        console.error('Upload error:', error);
        toast({
          variant: 'destructive',
          title: 'Erreur d\'upload',
          description: error.message || 'Une erreur est survenue lors du chargement de l\'image.'
        });
    } finally {
        setIsUploading(false);
    }
  };

  return (
    <>
      <Button type="button" variant="outline" onClick={() => fileInputRef.current?.click()}>
        <UploadCloud className="mr-2 h-4 w-4" />
        Choisir une image
      </Button>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        className="hidden"
      />

      <Dialog open={isCropModalOpen} onOpenChange={setIsCropModalOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Recadrer l'image</DialogTitle>
            <DialogDescription>
              Ajustez la sélection pour recadrer votre image (format carré).
            </DialogDescription>
          </DialogHeader>
          {imgSrc && (
             <div className="flex justify-center bg-muted p-4 rounded-md">
                <ReactCrop
                    crop={crop}
                    onChange={(_, percentCrop) => setCrop(percentCrop)}
                    onComplete={(c) => setCompletedCrop(c)}
                    aspect={1}
                    minWidth={200}
                    minHeight={200}
                >
                    <Image
                    ref={imgRef}
                    alt="Crop preview"
                    src={imgSrc}
                    onLoad={onImageLoad}
                    width={400}
                    height={400}
                    style={{ maxHeight: '60vh', objectFit: 'contain' }}
                    />
                </ReactCrop>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCropModalOpen(false)}>Annuler</Button>
            <Button onClick={handleUploadCroppedImage} disabled={isUploading}>
              {isUploading ? 'Chargement...' : <><Crop className="mr-2 h-4 w-4" /> Recadrer et Uploader</>}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function ConsumableForm({
  item,
  onSubmit,
}: {
  item?: Consumable;
  onSubmit: (data: ConsumableFormValues) => void;
}) {
  const { t } = useTranslation();
  const form = useForm<ConsumableFormValues>({
    resolver: zodResolver(consumableSchema),
    defaultValues: item || {
      name: '',
      price: 0,
      imageUrl: '',
      imageHint: '',
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
              <FormLabel>{t('itemName')}</FormLabel>
              <FormControl>
                <Input placeholder="Ex: Coca-Cola" {...field} />
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
              <FormLabel>{t('price')} (en MAD)</FormLabel>
              <FormControl>
                <Input type="number" placeholder="15" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="imageUrl"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Image</FormLabel>
              <div className="flex items-center gap-4">
                  <FormControl>
                      <Input {...field} placeholder="Image URL" className="hidden" />
                  </FormControl>
                 <CloudinaryUploadButton onUpload={(url) => {
                     field.onChange(url);
                     form.setValue('imageUrl', url);
                 }} />
                  {field.value && (
                    <div className="w-24 h-24 relative">
                        <Image src={field.value} alt="Aperçu" fill className="rounded-md object-cover" />
                    </div>
                  )}
              </div>
              <FormMessage />
            </FormItem>
          )}
        />
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">{t('cancel')}</Button>
          </DialogClose>
          <Button type="submit">{t('save')}</Button>
        </DialogFooter>
      </form>
    </Form>
  );
}


export function ConsumptionActions({ mode, item }: ConsumptionActionsProps) {
  const [isDialogOpen, setDialogOpen] = useState(false);
  const firestore = useFirestore();
  const { toast } = useToast();
  const { t } = useTranslation();

  const handleConsumableSubmit = (data: ConsumableFormValues) => {
     if (!firestore) return;
    const collectionName = 'consumables';
    const id = item?.id || doc(collection(firestore, collectionName)).id;
    const ref = doc(firestore, collectionName, id);

    setDocumentNonBlocking(ref, { ...data, id }, { merge: true });

    toast({
      title: `Article ${item ? 'mis à jour' : 'ajouté'}`,
      description: `L'article ${data.name} a été enregistré.`,
    });
    setDialogOpen(false);
  };
  

  const handleDelete = () => {
    if (!firestore || !item) return;
    const collectionName = 'consumables';
    const ref = doc(firestore, collectionName, item.id);
    deleteDocumentNonBlocking(ref);

    toast({
      variant: 'destructive',
      title: 'Article supprimé',
      description: 'L\'article a été supprimé.',
    });
  };

  if (mode === 'add') {
    return (
      <Dialog open={isDialogOpen} onOpenChange={setDialogOpen}>
        <DialogTrigger asChild>
          <Button size="sm" className="h-8 gap-1">
            <PlusCircle className="h-3.5 w-3.5" />
            <span className="sr-only sm:not-sr-only sm:whitespace-rap">
              {t('addConsumable')}
            </span>
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('addConsumable')}</DialogTitle>
            <DialogDescription>
              Remplissez les informations ci-dessous.
            </DialogDescription>
          </DialogHeader>
          <ConsumableForm onSubmit={handleConsumableSubmit} />
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
          <DropdownMenuLabel>{t('actions')}</DropdownMenuLabel>
          <DropdownMenuItem onSelect={() => setDialogOpen(true)}>
            {t('edit')}
          </DropdownMenuItem>
           <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={handleDelete} className="text-red-500">
            <Trash2 className="mr-2 h-4 w-4" />
            {t('delete')}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <DialogContent>
        <DialogHeader>
          <DialogTitle>Modifier l'article</DialogTitle>
        </DialogHeader>
        <ConsumableForm
          item={item as Consumable}
          onSubmit={handleConsumableSubmit}
        />
      </DialogContent>
    </Dialog>
  );
}
