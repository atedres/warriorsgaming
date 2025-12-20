"use server";

import { revalidatePath } from "next/cache";
import { v2 as cloudinary } from "cloudinary";
import { doc, updateDoc } from "firebase/firestore";
import { getFirebaseAdmin } from "@/firebase/admin";

if (!process.env.CLOUDINARY_CLOUD_NAME) {
  throw new Error("CLOUDINARY_CLOUD_NAME is not set");
}
if (!process.env.CLOUDINARY_API_KEY) {
  throw new Error("CLOUDINARY_API_KEY is not set");
}
if (!process.env.CLOUDINARY_API_SECRET) {
  throw new Error("CLOUDINARY_API_SECRET is not set");
}

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export async function uploadAvatarAction(userId: string, formData: FormData) {
  try {
    const file = formData.get("avatar") as File;
    if (!file || file.size === 0) {
      return { success: false, message: "No file provided." };
    }

    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = new Uint8Array(arrayBuffer);

    // Upload to Cloudinary
    const uploadResult = await new Promise<{ secure_url: string }>(
      (resolve, reject) => {
        cloudinary.uploader
          .upload_stream(
            {
              tags: ["avatar", userId],
              upload_preset: "ml_default", // Make sure you have an unsigned upload preset named 'ml_default'
            },
            (error, result) => {
              if (error) {
                return reject(error);
              }
              if (result) {
                resolve(result);
              }
            }
          )
          .end(buffer);
      }
    );

    const { firestore } = getFirebaseAdmin();
    const clientRef = doc(firestore, "clients", userId);
    await updateDoc(clientRef, { avatarUrl: uploadResult.secure_url });

    revalidatePath("/profile");
    revalidatePath("/profile/settings");

    return {
      success: true,
      message: "Avatar uploaded successfully.",
      avatarUrl: uploadResult.secure_url,
    };
  } catch (error) {
    console.error("Upload error:", error);
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
    return { success: false, message: `Upload failed: ${errorMessage}` };
  }
}
