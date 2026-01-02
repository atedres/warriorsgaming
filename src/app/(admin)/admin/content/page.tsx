
'use client';

import { PageHeader } from '@/components/page-header';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PromotionsTable } from './promotions-table';
import { PricesTable } from './prices-table';

export default function ContentPage() {
  return (
    <>
      <PageHeader
        title="Gestion du Contenu"
        description="Gérez les promotions et les tarifs affichés sur votre site."
        className="px-0"
      />
      <Tabs defaultValue="promotions">
        <TabsList>
          <TabsTrigger value="promotions">Promotions</TabsTrigger>
          <TabsTrigger value="prices">Tarifs</TabsTrigger>
        </TabsList>
        <TabsContent value="promotions">
          <PromotionsTable />
        </TabsContent>
        <TabsContent value="prices">
          <PricesTable />
        </TabsContent>
      </Tabs>
    </>
  );
}
