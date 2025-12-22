
"use server";

import { revalidatePath } from "next/cache";
import { doc, updateDoc } from "firebase/firestore";
import { getFirebaseAdmin } from "@/firebase/admin";

export async function uploadAvatarAction(userId: string, formData: FormData) {
  const file = formData.get("avatar") as File;
  if (!file || file.size === 0) {
    return { success: false, message: "Aucun fichier n'a été fourni." };
  }

  // Ces variables sont maintenant exposées au serveur via next.config.js
  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
  const uploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;

  if (!cloudName || !uploadPreset) {
    console.error("Les variables d'environnement Cloudinary ne sont pas configurées. Vérifiez vos fichiers .env.local et next.config.js.");
    return { success: false, message: "Le serveur Cloudinary n'est pas configuré correctement." };
  }

  const uploadFormData = new FormData();
  uploadFormData.append("file", file);
  uploadFormData.append("upload_preset", uploadPreset);

  const cloudinaryUrl = `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`;

  try {
    const response = await fetch(cloudinaryUrl, {
      method: "POST",
      body: uploadFormData,
    });

    const uploadResult = await response.json();

    if (!response.ok || !uploadResult.secure_url) {
      console.error("Erreur de téléversement Cloudinary:", uploadResult.error?.message || 'Réponse invalide');
      return { success: false, message: `Échec du téléversement: ${uploadResult.error?.message || 'Une erreur inconnue est survenue.'}` };
    }

    const secureUrl = uploadResult.secure_url;

    // Mise à jour de Firestore avec la nouvelle URL
    const { firestore } = getFirebaseAdmin();
    const clientRef = doc(firestore, "clients", userId);
    await updateDoc(clientRef, { avatarUrl: secureUrl });

    // Invalider le cache pour rafraîchir les données sur les pages concernées
    revalidatePath("/profile");
    revalidatePath("/profile/settings");

    return {
      success: true,
      message: "Avatar téléversé avec succès.",
      avatarUrl: secureUrl,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Une erreur inconnue est survenue lors de la connexion à Cloudinary.";
    console.error("Erreur de fetch lors du téléversement:", errorMessage);
    return { success: false, message: `Échec du téléversement: ${errorMessage}` };
  }
}
