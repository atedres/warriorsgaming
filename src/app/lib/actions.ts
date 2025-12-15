"use server";

import { z } from "zod";
import { loyaltyBonusRecommendations } from "@/ai/flows/loyalty-bonus-recommendations";

const recommendationSchema = z.object({
  customerId: z.string(),
  availableBonuses: z.string(),
  customerUsageData: z.string(),
  customerSubscriptionTier: z.string(),
  customerName: z.string(),
});

export type State = {
  status: "success" | "error" | "idle";
  message?: string;
  recommendation?: {
    recommendedBonus: string;
    reasoning: string;
  };
};

export async function getLoyaltyRecommendation(
  prevState: State,
  formData: FormData
): Promise<State> {
  const validatedFields = recommendationSchema.safeParse({
    customerId: formData.get("customerId"),
    availableBonuses: formData.get("availableBonuses"),
    customerUsageData: formData.get("customerUsageData"),
    customerSubscriptionTier: formData.get("customerSubscriptionTier"),
    customerName: formData.get("customerName"),
  });

  if (!validatedFields.success) {
    return {
      status: "error",
      message: "Invalid form data.",
    };
  }

  try {
    const result = await loyaltyBonusRecommendations(validatedFields.data);
    return {
      status: "success",
      message: "Recommendation generated.",
      recommendation: result,
    };
  } catch (error) {
    console.error(error);
    return {
      status: "error",
      message: "Failed to generate recommendation. Please try again.",
    };
  }
}
