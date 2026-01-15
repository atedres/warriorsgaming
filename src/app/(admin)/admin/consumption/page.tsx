'use client';

import { PageHeader } from '@/components/page-header';
import { ConsumablesTable } from './consumables-table';
import { useTranslation } from '@/hooks/use-translation';

export default function ConsumptionPage() {
  const { t } = useTranslation();

  return (
    <>
      <PageHeader
        title={t('consumptionManagement')}
        description={t('consumptionManagementDescription')}
        className="px-0"
      />
      <ConsumablesTable />
    </>
  );
}
