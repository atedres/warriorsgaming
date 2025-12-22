
"use server";

import { revalidatePath } from "next/cache";
import { v2 as cloudinary } from "cloudinary";
import { doc, updateDoc } from "firebase/firestore";
import { getFirebaseAdmin } from "@/firebase/admin";
import { config } from 'dotenv';

// Load environment variables from .env file
config();

// Configure Cloudinary, but only if the necessary environment variables are present.
if (
  process.env.CLOUDINARY_CLOUD_NAME &&
  process.env.CLOUDINARY_API_KEY &&
  process.env.CLOUDINARY_API_SECRET
) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });
}

export async function uploadAvatarAction(userId: string, formData: FormData) {
  // Now, this check will correctly use the loaded environment variables.
  if (!process.env.CLOUDINARY_API_SECRET) {
    console.error("Cloudinary secret key is not configured. Check your .env file.");
    return { success: false, message: "Le serveur Cloudinary n'est pas configuré." };
  }

  try {
    const file = formData.get("avatar") as File;
    if (!file || file.size === 0) {
      return { success: false, message: "Aucun fichier n'a été fourni." };
    }

    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Upload to Cloudinary using a signed request (the default for the Node.js SDK)
    const uploadResult = await new Promise<{ secure_url: string }>((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
            {
              tags: ["avatar", userId],
              // No upload_preset is needed for signed server-side uploads
            },
            (error, result) => {
              if (error) {
                return reject(error);
              }
              if (result) {
                resolve(result);
              } else {
                reject(new Error("La téléversement vers Cloudinary a échoué sans renvoyer d'erreur."));
              }
            }
          );
          uploadStream.end(buffer);
      }
    );

    const { firestore } = getFirebaseAdmin();
    const clientRef = doc(firestore, "clients", userId);
    await updateDoc(clientRef, { avatarUrl: uploadResult.secure_url });

    revalidatePath("/profile");
    revalidatePath("/profile/settings");

    return {
      success: true,
      message: "Avatar téléversé avec succès.",
      avatarUrl: uploadResult.secure_url,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Une erreur inconnue est survenue.";
    console.error("Erreur de téléversement Cloudinary:", errorMessage);
    return { success: false, message: `Échec du téléversement: ${errorMessage}` };
  }
}
