
"use server";

import { revalidatePath } from "next/cache";
import { doc, updateDoc } from "firebase/firestore";
import { getFirebaseAdmin } from "@/firebase/admin";

export async function uploadAvatarAction(userId: string, formData: FormData) {
  const file = formData.get("avatar") as File;
  if (!file || file.size === 0) {
    return { success: false, message: "Aucun fichier n'a été fourni." };
  }
  
  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
  const uploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;

  if (!cloudName || !uploadPreset) {
      console.error("Cloudinary cloud name or upload preset is not configured. Check your .env.local file.");
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

    if (!response.ok) {
        const errorData = await response.json();
        console.error("Erreur de téléversement Cloudinary:", errorData);
        return { success: false, message: `Échec du téléversement: ${errorData.error.message}` };
    }

    const uploadResult = await response.json();
    const secureUrl = uploadResult.secure_url;
    
    if (!secureUrl) {
         return { success: false, message: "L'URL de l'image n'a pas été retournée par Cloudinary." };
    }

    const { firestore } = getFirebaseAdmin();
    const clientRef = doc(firestore, "clients", userId);
    await updateDoc(clientRef, { avatarUrl: secureUrl });

    revalidatePath("/profile");
    revalidatePath("/profile/settings");

    return {
      success: true,
      message: "Avatar téléversé avec succès.",
      avatarUrl: secureUrl,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Une erreur inconnue est survenue.";
    console.error("Erreur de téléversement:", errorMessage);
    return { success: false, message: `Échec du téléversement: ${errorMessage}` };
  }
}
