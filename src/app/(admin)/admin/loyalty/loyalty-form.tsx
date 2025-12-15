"use client";

import { useEffect, useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { Wand2, Sparkles, Bot, User } from "lucide-react";
import { getLoyaltyRecommendation, type State } from "@/app/lib/actions";
import { clients, type Client } from "@/app/lib/data";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} className="w-full">
      {pending ? (
        "Generating..."
      ) : (
        <>
          <Wand2 className="mr-2 h-4 w-4" />
          Get Recommendation
        </>
      )}
    </Button>
  );
}

export function LoyaltyForm() {
  const initialState: State = { status: "idle" };
  const [state, formAction] = useFormState(getLoyaltyRecommendation, initialState);
  const [selectedClientId, setSelectedClientId] = useState<string | undefined>(
    clients[0]?.id
  );
  const [selectedClient, setSelectedClient] = useState<Client | undefined>(
    clients[0]
  );
  const [availableBonuses, setAvailableBonuses] = useState(
    "Free 1 hour of gameplay, 20% off next visit, Free drink, VIP lounge upgrade for a day"
  );

  useEffect(() => {
    if (state.status === "error") {
      toast({
        variant: "destructive",
        title: "Error",
        description: state.message,
      });
    }
  }, [state]);

  const handleClientChange = (clientId: string) => {
    setSelectedClientId(clientId);
    const client = clients.find((c) => c.id === clientId);
    setSelectedClient(client);
  };

  return (
    <div className="grid gap-8 md:grid-cols-3">
      <div className="md:col-span-1">
        <Card>
          <CardHeader>
            <CardTitle className="font-headline">Recommendation Engine</CardTitle>
            <CardDescription>
              Fill in the details to get an AI-powered bonus suggestion.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form action={formAction} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="customer">Select Client</Label>
                <Select
                  name="customerId"
                  value={selectedClientId}
                  onValueChange={handleClientChange}
                >
                  <SelectTrigger id="customer">
                    <SelectValue placeholder="Select a client" />
                  </SelectTrigger>
                  <SelectContent>
                    {clients.map((client) => (
                      <SelectItem key={client.id} value={client.id}>
                        {client.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <input
                type="hidden"
                name="customerName"
                value={selectedClient?.name || ""}
              />
              <input
                type="hidden"
                name="customerSubscriptionTier"
                value={selectedClient?.subscriptionTier || ""}
              />

              <div className="space-y-2">
                <Label htmlFor="usageData">Customer Usage Data</Label>
                <Textarea
                  id="usageData"
                  name="customerUsageData"
                  placeholder="Describe customer habits..."
                  rows={4}
                  value={selectedClient?.usageData || ""}
                  readOnly
                  className="bg-muted"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="availableBonuses">Available Bonuses</Label>
                <Textarea
                  id="availableBonuses"
                  name="availableBonuses"
                  placeholder="List available bonuses, comma-separated"
                  rows={3}
                  value={availableBonuses}
                  onChange={(e) => setAvailableBonuses(e.target.value)}
                />
              </div>

              <SubmitButton />
            </form>
          </CardContent>
        </Card>
      </div>

      <div className="md:col-span-2">
        <Card className="min-h-full">
          <CardHeader>
            <CardTitle className="font-headline">AI Recommendation</CardTitle>
            <CardDescription>
              The generated recommendation will appear below.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {state.status === 'idle' && (
                 <div className="flex flex-col items-center justify-center text-center text-muted-foreground h-64">
                    <Bot className="h-12 w-12 mb-4" />
                    <p>Your AI assistant is ready.</p>
                </div>
            )}
             {state.status === 'success' && state.recommendation && (
                <div className="space-y-6">
                    <div>
                        <h3 className="flex items-center font-semibold text-lg mb-2">
                            <Sparkles className="h-5 w-5 mr-2 text-primary" />
                            Recommended Bonus
                        </h3>
                        <p className="text-primary-foreground text-base p-4 bg-primary/10 rounded-lg border border-primary/20">
                            {state.recommendation.recommendedBonus}
                        </p>
                    </div>
                     <div>
                        <h3 className="flex items-center font-semibold text-lg mb-2">
                            <User className="h-5 w-5 mr-2 text-muted-foreground" />
                            Reasoning
                        </h3>
                        <p className="text-base p-4 bg-muted rounded-lg">
                            {state.recommendation.reasoning}
                        </p>
                    </div>
                </div>
             )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
