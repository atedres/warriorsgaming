
"use client";

import { BarChart, DollarSign, Gamepad2, Users } from 'lucide-react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart';
import {
  Bar,
  CartesianGrid,
  XAxis,
  YAxis,
  Area,
  AreaChart,
  ResponsiveContainer,
  BarChart as RechartsBarChart,
} from 'recharts';
import { formatCurrency } from '@/lib/utils';
import { PageHeader } from '@/components/page-header';
import { useCollection, useFirestore } from '@/firebase';
import { useMemoFirebase } from '@/firebase/provider';
import { collection, query } from 'firebase/firestore';
import { useTranslation } from '@/hooks/use-translation';

export default function AdminDashboard() {
  const { t } = useTranslation();
  const firestore = useFirestore();
  const stationsQuery = useMemoFirebase(
    () => (firestore ? query(collection(firestore, 'stations')) : null),
    [firestore]
  );
  const { data: stations, isLoading: isLoadingStations } =
    useCollection(stationsQuery);
  const clientsQuery = useMemoFirebase(
    () => (firestore ? query(collection(firestore, 'clients')) : null),
    [firestore]
  );
  const { data: clients, isLoading: isLoadingClients } =
    useCollection(clientsQuery);
  
  const usageLogsQuery = useMemoFirebase(
    () => (firestore ? query(collection(firestore, 'usageLogs')) : null),
    [firestore]
  );
  const { data: usageLogs, isLoading: isLoadingUsageLogs } = useCollection(usageLogsQuery);

  const chartConfig = {
    revenue: {
      label: 'Revenue',
      color: 'hsl(var(--primary))',
    },
    users: {
      label: 'Users',
      color: 'hsl(var(--primary))',
    },
    pc: {
      label: 'PC',
      color: 'hsl(var(--chart-1))',
    },
    ps5: {
      label: 'PS5',
      color: 'hsl(var(--chart-2))',
    },
    ps5_vip: {
      label: 'PS5 VIP',
      color: 'hsl(var(--accent))',
    },
    vr: {
      label: 'VR',
      color: 'hsl(var(--chart-5))',
    },
  };

  const stationsInUse = stations?.filter((s) => s.status === 'in use').length || 0;
  // Note: revenue calculation would require price data, so we'll use a mock value for now.
  const totalRevenue = 5631.50; 

  const dailyRevenue = [
    { date: 'Mon', revenue: 650 },
    { date: 'Tue', revenue: 520 },
    { date: 'Wed', revenue: 880 },
    { date: 'Thu', revenue: 730 },
    { date: 'Fri', revenue: 1100 },
    { date: 'Sat', revenue: 1540 },
    { date: 'Sun', revenue: 1210 },
  ];

  const popularStations = [
    { station: 'PC', users: 400 },
    { station: 'PS5', users: 300 },
    { station: 'PS5 VIP', users: 180 },
    { station: 'VR', users: 120 },
  ];


  return (
    <div className="flex flex-col">
      <PageHeader
        title={t('dashboard')}
        description={t('dashboardDescription')}
        className="px-0"
      />
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('totalRevenue')}</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(totalRevenue)}
            </div>
            <p className="text-xs text-muted-foreground">{t('thisWeek')}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('totalClients')}</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoadingClients ? (
              <div className="h-8 w-1/2 animate-pulse rounded-md bg-muted" />
            ) : (
              <div className="text-2xl font-bold">{clients?.length || 0}</div>
            )}
            <p className="text-xs text-muted-foreground">
              {t('allRegisteredClients')}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {t('stationsInUse')}
            </CardTitle>
            <Gamepad2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoadingStations ? (
              <div className="h-8 w-1/2 animate-pulse rounded-md bg-muted" />
            ) : (
              <div className="text-2xl font-bold">
                {stationsInUse} / {stations?.length || 0}
              </div>
            )}
            <p className="text-xs text-muted-foreground">{t('currentlyActive')}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('popularity')}</CardTitle>
            <BarChart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">PC Gaming</div>
            <p className="text-xs text-muted-foreground">
              {t('mostUsedStationType')}
            </p>
          </CardContent>
        </Card>
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7 mt-8">
        <Card className="col-span-4">
          <CardHeader>
            <CardTitle className="font-headline">{t('weeklyRevenue')}</CardTitle>
          </CardHeader>
          <CardContent className="pl-2">
            <ChartContainer config={chartConfig} className="h-[300px] w-full">
              <AreaChart
                accessibilityLayer
                data={dailyRevenue}
                margin={{
                  left: 12,
                  right: 12,
                }}
              >
                <CartesianGrid vertical={false} strokeDasharray="3 3" />
                <XAxis
                  dataKey="date"
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                />
                <YAxis
                  tickFormatter={(value) => `$${value}`}
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                />
                <ChartTooltip
                  cursor={false}
                  content={<ChartTooltipContent indicator="dot" />}
                />
                <Area
                  dataKey="revenue"
                  type="natural"
                  fill="var(--color-revenue)"
                  fillOpacity={0.4}
                  stroke="var(--color-revenue)"
                  stackId="a"
                />
              </AreaChart>
            </ChartContainer>
          </CardContent>
        </Card>
        <Card className="col-span-4 lg:col-span-3">
          <CardHeader>
            <CardTitle className="font-headline">{t('popularStations')}</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="h-[300px] w-full">
              <RechartsBarChart
                accessibilityLayer
                data={popularStations}
                layout="vertical"
                margin={{ right: 10, left: 10 }}
              >
                <CartesianGrid horizontal={false} />
                <YAxis
                  dataKey="station"
                  type="category"
                  tickLine={false}
                  tickMargin={10}
                  axisLine={false}
                />
                <XAxis dataKey="users" type="number" hide />
                <ChartTooltip
                  cursor={false}
                  content={<ChartTooltipContent hideLabel />}
                />
                <Bar dataKey="users" layout="vertical" radius={5}></Bar>
              </RechartsBarChart>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
