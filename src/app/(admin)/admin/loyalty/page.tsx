import { PageHeader } from "@/components/page-header";
import { LoyaltyForm } from "./loyalty-form";

export default function LoyaltyPage() {
  return (
    <>
      <PageHeader
        title="Loyalty & Bonus Recommendations"
        description="Use AI to generate personalized bonus recommendations for clients."
        className="px-0"
      />
      <div className="p-1">
        <LoyaltyForm />
      </div>
    </>
  );
}
