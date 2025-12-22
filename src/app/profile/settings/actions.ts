"use server";

import { revalidatePath } from "next/cache";
import { getFirebaseAdmin } from "@/firebase/admin";

export async function saveAvatarUrlAction(userId: string, avatarUrl: string) {
  if (!userId || !avatarUrl) {
    return { success: false, message: "L'ID utilisateur ou l'URL de l'avatar est manquant." };
  }

  try {
    // Utilise le SDK Admin pour mettre à jour Firestore côté serveur
    const { firestore } = getFirebaseAdmin();
    const clientRef = firestore.collection("clients").doc(userId);
    await clientRef.update({ avatarUrl: avatarUrl });
    
    // Invalide le cache pour rafraîchir les données sur les pages concernées
    revalidatePath("/profile");
    revalidatePath("/profile/settings");

    return {
      success: true,
      message: "Avatar mis à jour avec succès.",
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Une erreur inconnue est survenue lors de la sauvegarde.";
    console.error("Erreur dans saveAvatarUrlAction:", errorMessage);
    return { success: false, message: errorMessage };
  }
}
