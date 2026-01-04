
'use client';

import { PageHeader } from '@/components/page-header';
import { PromotionsTable } from './promotions-table';
import { useTranslation } from '@/hooks/use-translation';


export default function ContentPage() {
  const { t } = useTranslation();

  return (
    <>
      <PageHeader
        title="Gestion du Contenu"
        description="Gérez les promotions affichées sur votre site."
        className="px-0"
      />
      <PromotionsTable />
    </>
  );
}
