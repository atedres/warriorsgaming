'use client';

import { useState, useRef } from 'react';
import Image from 'next/image';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { useDoc, useFirestore } from '@/firebase';
import { useMemoFirebase } from '@/firebase/provider';
import { doc } from 'firebase/firestore';
import { setDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { useToast } from '@/hooks/use-toast';
import ReactCrop, { type Crop as CropType, centerCrop, makeAspectCrop } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { UploadCloud, Crop } from 'lucide-react';
import { Input } from '@/components/ui/input';

type HeroImageSetting = {
  id: string;
  imageUrl: string;
  imageHint: string;
};

// --- Helper Functions from content-actions ---

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

// --- Cloudinary Upload Component for Hero ---

function CloudinaryUploadButton({ onUpload, isUploading, onUploadingChange }: { 
    onUpload: (url: string) => void;
    isUploading: boolean;
    onUploadingChange: (isUploading: boolean) => void;
}) {
  const { toast } = useToast();
  const [imgSrc, setImgSrc] = useState('');
  const [crop, setCrop] = useState<CropType>();
  const [completedCrop, setCompletedCrop] = useState<CropType>();
  const [isCropModalOpen, setIsCropModalOpen] = useState(false);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [originalFile, setOriginalFile] = useState<File | null>(null);

  function centerAspectCrop(mediaWidth: number, mediaHeight: number, aspect: number) {
    return centerCrop(makeAspectCrop({ unit: '%', width: 90 }, aspect, mediaWidth, mediaHeight), mediaWidth, mediaHeight);
  }

  function onImageLoad(e: React.SyntheticEvent<HTMLImageElement>) {
    const { width, height } = e.currentTarget;
    setCrop(centerAspectCrop(width, height, 16 / 9));
  }

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files.length > 0) {
      const file = event.target.files[0];
      setOriginalFile(file);
      setCrop(undefined);
      const reader = new FileReader();
      reader.addEventListener('load', () => setImgSrc(reader.result?.toString() || ''));
      reader.readAsDataURL(file);
      setIsCropModalOpen(true);
    }
  };
  
  const handleUploadCroppedImage = async () => {
    if (!completedCrop || !imgRef.current || !originalFile) {
        toast({ variant: 'destructive', title: 'Erreur', description: 'Aucune zone de recadrage sélectionnée.' });
        return;
    }
    
    onUploadingChange(true);

    try {
        const croppedImageFile = await getCroppedImg(imgRef.current, completedCrop, originalFile.name);

        const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
        const uploadPreset = 'warriors_gaming';
        const folder = 'warriors_gaming_hero'; // Separate folder for hero images
        
        const paramsToSign = {
          timestamp: Math.round(new Date().getTime() / 1000),
          upload_preset: uploadPreset,
          folder: folder
        };

        const signResponse = await fetch('/api/sign-cloudinary-params', {
          method: 'POST',
          body: JSON.stringify({ paramsToSign }),
        });

        if (!signResponse.ok) throw new Error(await signResponse.text());
        const { signature } = await signResponse.json();

        const formData = new FormData();
        formData.append('file', croppedImageFile);
        formData.append('upload_preset', uploadPreset);
        formData.append('folder', folder);
        formData.append('signature', signature);
        formData.append('timestamp', String(paramsToSign.timestamp));
        formData.append('api_key', process.env.NEXT_PUBLIC_CLOUDINARY_API_KEY!);

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
        toast({
          variant: 'destructive',
          title: 'Erreur d\'upload',
          description: error.message || 'Une erreur est survenue.'
        });
    } finally {
        onUploadingChange(false);
    }
  };

  return (
    <>
      <Button type="button" variant="outline" onClick={() => fileInputRef.current?.click()} disabled={isUploading}>
        <UploadCloud className="mr-2 h-4 w-4" />
        Changer l'image
      </Button>
      <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileSelect} className="hidden" />

      <Dialog open={isCropModalOpen} onOpenChange={setIsCropModalOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Recadrer l'image de fond</DialogTitle>
            <DialogDescription>Ajustez la sélection pour l'image. Un ratio 16:9 est recommandé.</DialogDescription>
          </DialogHeader>
          {imgSrc && (
             <div className="flex justify-center bg-muted p-4 rounded-md">
                <ReactCrop
                    crop={crop}
                    onChange={(_, percentCrop) => setCrop(percentCrop)}
                    onComplete={(c) => setCompletedCrop(c)}
                    aspect={16 / 9}
                    minWidth={1280}
                    minHeight={720}
                >
                    <Image
                      ref={imgRef}
                      alt="Crop preview"
                      src={imgSrc}
                      onLoad={onImageLoad}
                      width={1280}
                      height={720}
                      style={{ maxHeight: '70vh', objectFit: 'contain' }}
                    />
                </ReactCrop>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCropModalOpen(false)} disabled={isUploading}>Annuler</Button>
            <Button onClick={handleUploadCroppedImage} disabled={isUploading}>
              {isUploading ? 'Chargement...' : <><Crop className="mr-2 h-4 w-4" /> Recadrer et Uploader</>}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

// --- Main Hero Image Card Component ---

export function HeroImageCard() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [newImageUrl, setNewImageUrl] = useState('');

  const firestore = useFirestore();
  const { toast } = useToast();

  const heroImageRef = useMemoFirebase(
    () => firestore ? doc(firestore, 'site_settings', 'hero_image') : null,
    [firestore]
  );
  const { data: heroImage, isLoading } = useDoc<HeroImageSetting>(heroImageRef);

  const handleSave = () => {
    if (!firestore || !newImageUrl) return;

    const ref = doc(firestore, 'site_settings', 'hero_image');
    setDocumentNonBlocking(ref, { id: 'hero_image', imageUrl: newImageUrl, imageHint: 'gaming background' }, { merge: true });

    toast({
      title: 'Image de fond mise à jour',
      description: 'La nouvelle image sera visible sur la page d\'accueil.',
    });
    setNewImageUrl('');
    setIsDialogOpen(false);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Image de la Page d'Accueil</CardTitle>
        <CardDescription>
          Changez l'image de fond principale (section "Héro").
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading ? (
          <Skeleton className="aspect-video w-full" />
        ) : (
          <div className="relative aspect-video w-full overflow-hidden rounded-md">
            <Image
              src={heroImage?.imageUrl || "https://picsum.photos/seed/hero/1280/720"}
              alt="Aperçu de l'image de fond"
              fill
              className="object-cover"
            />
          </div>
        )}
      </CardContent>
      <DialogFooter className='p-6 pt-0'>
         <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
                <Button>Changer l'image</Button>
            </DialogTrigger>
            <DialogContent>
                 <DialogHeader>
                    <DialogTitle>Mettre à jour l'image de fond</DialogTitle>
                    <DialogDescription>
                        Chargez une nouvelle image qui remplacera l'actuelle sur la page d'accueil.
                    </DialogDescription>
                </DialogHeader>
                <div className='py-4 space-y-4'>
                    <CloudinaryUploadButton 
                        onUpload={setNewImageUrl} 
                        isUploading={isUploading}
                        onUploadingChange={setIsUploading}
                    />
                    {newImageUrl && (
                        <div className="space-y-2">
                             <p className="text-sm font-medium">Nouvelle image :</p>
                             <div className="relative aspect-video w-full overflow-hidden rounded-md">
                                <Image
                                src={newImageUrl}
                                alt="Aperçu de la nouvelle image"
                                fill
                                className="object-cover"
                                />
                            </div>
                        </div>
                    )}
                </div>
                 <DialogFooter>
                    <Button variant="outline" onClick={() => setIsDialogOpen(false)} disabled={isUploading}>Annuler</Button>
                    <Button onClick={handleSave} disabled={!newImageUrl || isUploading}>
                        {isUploading ? 'Chargement...' : 'Enregistrer'}
                    </Button>
                </DialogFooter>
            </DialogContent>
         </Dialog>
      </DialogFooter>
    </Card>
  );
}
