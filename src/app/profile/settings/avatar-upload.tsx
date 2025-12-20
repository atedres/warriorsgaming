"use client";

import { useState, useTransition } from "react";
import Image from "next/image";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import type { Client } from "@/app/lib/data";
import { uploadAvatarAction } from "./actions";
import { Loader2 } from "lucide-react";

export function AvatarUpload({ client }: { client: Client }) {
  const [preview, setPreview] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
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

    const formData = new FormData();
    formData.append("avatar", file);

    startTransition(async () => {
      const result = await uploadAvatarAction(client.id, formData);
      if (result.success) {
        toast({
          title: "Succès",
          description: "Votre photo de profil a été mise à jour.",
        });
        setPreview(null);
        setFile(null);
      } else {
        toast({
          variant: "destructive",
          title: "Échec du téléversement",
          description: result.message,
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
