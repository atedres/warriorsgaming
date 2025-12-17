import { PageHeader } from "@/components/page-header";
import { LoyaltyForm } from "./loyalty-form";
import { useTranslation } from "@/hooks/use-translation";

export default function LoyaltyPage() {
  // We can't use hooks in server components, so we'll do this for now.
  // A better solution would involve passing the translations down.
  const title = "Loyalty & Bonus Recommendations";
  const description = "Use AI to generate personalized bonus recommendations for clients.";

  return (
    <>
      <PageHeader
        title={title}
        description={description}
        className="px-0"
      />
      <div className="p-1">
        <LoyaltyForm />
      </div>
    </>
  );
}
