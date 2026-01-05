
'use client';

import React, { useState, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { MoreHorizontal, PlusCircle, UploadCloud, Crop } from 'lucide-react';
import { useFirestore } from '@/firebase';
import { doc, collection } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import {
  setDocumentNonBlocking,
  deleteDocumentNonBlocking,
} from '@/firebase/non-blocking-updates';
import type { Promotion } from '@/app/lib/data';

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
import Image from 'next/image';

import ReactCrop, { type Crop as CropType, centerCrop, makeAspectCrop } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';

// Schemas
const promoSchema = z.object({
  id: z.string().optional(),
  title: z.string().min(3, 'Le titre est requis.'),
  description: z.string().min(10, 'La description est requise.'),
  image: z.string().url('Veuillez sélectionner une image.'),
  imageHint: z.string().optional(),
});
type PromoFormValues = z.infer<typeof promoSchema>;

// Props
type ContentActionsProps =
  | { mode: 'add'; item?: never }
  | { mode: 'actions'; item: Promotion };

  
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


// Cloudinary Upload & Crop Component
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
    setCrop(centerAspectCrop(width, height, 3 / 2));
  }


  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files.length > 0) {
      const file = event.target.files[0];
      setOriginalFile(file);
      setCrop(undefined); // Reste crop
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
        const folder = 'warriors_gaming';

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
              console.error('Cloudinary upload failed with JSON:', errorData);
              errorText = errorData.error.message || JSON.stringify(errorData);
            } catch (e) {
              errorText = await uploadResponse.text();
              console.error('Cloudinary upload failed with text response:', errorText);
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
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Recadrer l'image</DialogTitle>
            <DialogDescription>
              Ajustez la sélection pour recadrer votre image.
            </DialogDescription>
          </DialogHeader>
          {imgSrc && (
             <div className="flex justify-center bg-muted p-4 rounded-md">
                <ReactCrop
                    crop={crop}
                    onChange={(_, percentCrop) => setCrop(percentCrop)}
                    onComplete={(c) => setCompletedCrop(c)}
                    aspect={3 / 2}
                    minWidth={300}
                    minHeight={200}
                >
                    <Image
                    ref={imgRef}
                    alt="Crop preview"
                    src={imgSrc}
                    onLoad={onImageLoad}
                    width={800}
                    height={600}
                    style={{ maxHeight: '70vh', objectFit: 'contain' }}
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
              <div className="flex items-center gap-4">
                  <FormControl>
                      <Input {...field} placeholder="Image URL" className="hidden" />
                  </FormControl>
                 <CloudinaryUploadButton onUpload={(url) => {
                     field.onChange(url);
                     form.setValue('image', url);
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
            <Button variant="outline">Annuler</Button>
          </DialogClose>
          <Button type="submit">Enregistrer</Button>
        </DialogFooter>
      </form>
    </Form>
  );
}


// Main Component
export function ContentActions({ mode, item }: ContentActionsProps) {
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
  

  const handleDelete = () => {
    if (!firestore || !item) return;
    const collectionName = 'promotions';
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
            <span className="sr-only sm:not-sr-only sm:whitespace-rap">
              Ajouter une promotion
            </span>
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ajouter une promotion</DialogTitle>
            <DialogDescription>
              Remplissez les informations ci-dessous.
            </DialogDescription>
          </DialogHeader>
          <PromotionForm onSubmit={handlePromotionSubmit} />
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
          <DropdownMenuItem onSelect={handleDelete} className="text-red-500">
              Supprimer
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <DialogContent>
        <DialogHeader>
          <DialogTitle>Modifier la promotion</DialogTitle>
        </DialogHeader>
        <PromotionForm
          item={item as Promotion}
          onSubmit={handlePromotionSubmit}
        />
      </DialogContent>
    </Dialog>
  );
}
