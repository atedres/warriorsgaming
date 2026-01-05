
'use client';

import { PageHeader } from '@/components/page-header';
import { PromotionsTable } from './promotions-table';
import { useTranslation } from '@/hooks/use-translation';
import { HeroImageCard } from './hero-image-card';
import { Separator } from '@/components/ui/separator';


export default function ContentPage() {
  const { t } = useTranslation();

  return (
    <>
      <PageHeader
        title="Gestion du Contenu"
        description="Gérez les promotions et l'apparence de la page d'accueil."
        className="px-0"
      />
      <div className="space-y-8">
        <HeroImageCard />
        <PromotionsTable />
      </div>
    </>
  );
}
