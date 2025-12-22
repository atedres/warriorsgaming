
"use server";

import "dotenv/config";
import { revalidatePath } from "next/cache";
import { getFirebaseAdmin } from "@/firebase/admin";
import { v2 as cloudinary } from "cloudinary";

// Configure Cloudinary with credentials from .env
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

async function uploadImageToCloudinary(file: File): Promise<string> {
    const fileBuffer = Buffer.from(await file.arrayBuffer());

    return new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
            {
                resource_type: "image",
                folder: "warriors-gaming-avatars", // Optional: organize uploads
            },
            (error, result) => {
                if (error) {
                    console.error("Cloudinary upload error:", error);
                    reject(new Error("Échec du téléversement sur Cloudinary."));
                } else if (result) {
                    resolve(result.secure_url);
                } else {
                    reject(new Error("Aucun résultat retourné par Cloudinary."));
                }
            }
        );
        uploadStream.end(fileBuffer);
    });
}

export async function uploadAvatarAction(userId: string, formData: FormData) {
  const file = formData.get("avatar") as File;
  if (!file || file.size === 0) {
    return { success: false, message: "Aucun fichier n'a été fourni." };
  }

  // Check if Cloudinary is configured
  if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
      const errorMessage = "Les variables d'environnement Cloudinary ne sont pas configurées sur le serveur. Veuillez vérifier votre fichier .env.";
      console.error(errorMessage);
      return { success: false, message: errorMessage };
  }

  try {
    const secureUrl = await uploadImageToCloudinary(file);

    // Update Firestore with the new URL using Firebase Admin SDK
    const { firestore } = getFirebaseAdmin();
    const clientRef = firestore.collection("clients").doc(userId);
    await clientRef.update({ avatarUrl: secureUrl });
    
    // Invalidate cache to refresh data on relevant pages
    revalidatePath("/profile");
    revalidatePath("/profile/settings");

    return {
      success: true,
      message: "Avatar téléversé avec succès.",
      avatarUrl: secureUrl,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Une erreur inconnue est survenue.";
    console.error("Erreur dans uploadAvatarAction:", errorMessage);
    return { success: false, message: errorMessage };
  }
}
