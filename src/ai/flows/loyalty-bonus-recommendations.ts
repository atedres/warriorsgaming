'use server';

/**
 * @fileOverview A Genkit flow for recommending customized bonuses or rewards to enhance customer engagement and retention.
 *
 * @exports loyaltyBonusRecommendations - A function that handles the recommendation process.
 * @exports LoyaltyBonusRecommendationsInput - The input type for the loyaltyBonusRecommendations function.
 * @exports LoyaltyBonusRecommendationsOutput - The return type for the loyaltyBonusRecommendations function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const LoyaltyBonusRecommendationsInputSchema = z.object({
  customerName: z.string().describe('The name of the customer.'),
  customerUsageData: z.string().describe('The customer usage data, including game preferences, session durations, and frequency of visits.'),
  customerSubscriptionTier: z.string().describe('The customer subscription tier (e.g., Basic, Premium, VIP).'),
  availableBonuses: z.string().describe('A list of available bonuses or rewards that can be offered to the customer.'),
});
export type LoyaltyBonusRecommendationsInput = z.infer<
  typeof LoyaltyBonusRecommendationsInputSchema
>;

const LoyaltyBonusRecommendationsOutputSchema = z.object({
  recommendedBonus: z.string().describe('The recommended bonus or reward for the customer.'),
  reasoning: z.string().describe('The reasoning behind the bonus recommendation, based on the customer data.'),
});
export type LoyaltyBonusRecommendationsOutput = z.infer<
  typeof LoyaltyBonusRecommendationsOutputSchema
>;

export async function loyaltyBonusRecommendations(
  input: LoyaltyBonusRecommendationsInput
): Promise<LoyaltyBonusRecommendationsOutput> {
  return loyaltyBonusRecommendationsFlow(input);
}

const prompt = ai.definePrompt({
  name: 'loyaltyBonusRecommendationsPrompt',
  input: {schema: LoyaltyBonusRecommendationsInputSchema},
  output: {schema: LoyaltyBonusRecommendationsOutputSchema},
  prompt: `You are an AI assistant designed to analyze customer data and recommend customized bonuses or rewards to enhance customer engagement and retention.

  Analyze the following customer data and recommend a suitable bonus or reward from the list of available bonuses.
  Explain the reasoning behind your recommendation.

  Customer Name: {{{customerName}}}
  Customer Usage Data: {{{customerUsageData}}}
  Customer Subscription Tier: {{{customerSubscriptionTier}}}
  Available Bonuses: {{{availableBonuses}}}

  Based on this information, what bonus or reward would you recommend and why?`,
});

const loyaltyBonusRecommendationsFlow = ai.defineFlow(
  {
    name: 'loyaltyBonusRecommendationsFlow',
    inputSchema: LoyaltyBonusRecommendationsInputSchema,
    outputSchema: LoyaltyBonusRecommendationsOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
