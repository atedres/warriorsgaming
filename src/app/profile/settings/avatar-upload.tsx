"use client";

import { useState, useTransition } from "react";
import Image from "next/image";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import type { Client } from "@/app/lib/data";
import { saveAvatarUrlAction } from "./actions";
import { Loader2 } from "lucide-react";

// IMPORTANT: Assurez-vous que ces variables correspondent à votre configuration
// dans le fichier .env.local ou directement ici si vous n'en avez pas.
const CLOUDINARY_CLOUD_NAME = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || "dp8sw0v9d"; 
const CLOUDINARY_UPLOAD_PRESET = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET || "ml_default";

export function AvatarUpload({ client }: { client: Client }) {
  const [preview, setPreview] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      // Vérification de la taille du fichier (ex: max 5MB)
      if (selectedFile.size > 5 * 1024 * 1024) {
          toast({
              variant: "destructive",
              title: "Fichier trop volumineux",
              description: "Veuillez choisir une image de moins de 5 Mo.",
          });
          return;
      }
      setFile(selectedFile);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result as string);
      };
      reader.readAsDataURL(selectedFile);
    }
  };

  const handleUpload = async () => {
    if (!file) {
      toast({
        variant: "destructive",
        title: "Aucun fichier sélectionné",
        description: "Veuillez choisir une image à téléverser.",
      });
      return;
    }
     if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_UPLOAD_PRESET) {
        toast({
            variant: "destructive",
            title: "Configuration manquante",
            description: "Le nom du cloud ou le preset de téléversement n'est pas configuré.",
        });
        return;
    }

    const formData = new FormData();
    formData.append("file", file);
    formData.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);

    startTransition(async () => {
        try {
            const response = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`, {
                method: 'POST',
                body: formData,
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error.message || "Un problème est survenu lors du téléversement.");
            }
            
            const data = await response.json();
            const secureUrl = data.secure_url;

            // Une fois l'upload réussi, on sauvegarde l'URL dans Firestore via la Server Action
            const saveResult = await saveAvatarUrlAction(client.id, secureUrl);

            if (saveResult.success) {
                toast({
                    title: "Succès",
                    description: "Votre photo de profil a été mise à jour.",
                });
                setPreview(null);
                setFile(null);
            } else {
                 throw new Error(saveResult.message);
            }

        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : "Une erreur inconnue est survenue.";
            toast({
                variant: "destructive",
                title: "Échec du téléversement",
                description: errorMessage,
            });
        }
    });
  };

  const currentAvatarSrc = client.avatarUrl || `https://api.dicebear.com/8.x/bottts/svg?seed=${client.id}`;

  return (
    <div className="flex flex-col items-center space-y-4">
      <Avatar className="h-32 w-32 text-6xl">
        <AvatarImage src={preview || currentAvatarSrc} alt={client.name} />
        <AvatarFallback>{client.name.charAt(0)}</AvatarFallback>
      </Avatar>

      <Input
        id="avatar-upload"
        type="file"
        accept="image/png, image/jpeg, image/gif"
        onChange={handleFileChange}
        className="hidden"
        disabled={isPending}
      />
      <label
        htmlFor="avatar-upload"
        className="cursor-pointer inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-10 px-4 py-2 w-full"
      >
        Choisir une image
      </label>

      {preview && (
        <div className="w-full space-y-2">
          <Button onClick={handleUpload} disabled={isPending} className="w-full">
            {isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Enregistrement...
              </>
            ) : (
              "Enregistrer la photo"
            )}
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              setPreview(null);
              setFile(null);
            }}
            disabled={isPending}
            className="w-full"
          >
            Annuler
          </Button>
        </div>
      )}
    </div>
  );
}
