
'use client';

import { useMemo, useEffect, useState } from 'react';
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
import { collection, query, onSnapshot } from 'firebase/firestore';
import { useTranslation } from '@/hooks/use-translation';
import type { UsageLog, Station, Client } from '@/app/lib/data';
import { differenceInMinutes, subDays, format } from 'date-fns';

function calculatePrice(stationType: Station['type'], durationInMinutes: number, startTime: Date): number {
    const startHour = startTime.getHours();
    const isEvening = startHour >= 20;

    let price = 0;
    
    // Ensure minimum duration is not 0 to avoid free sessions
    if (durationInMinutes <= 0) return 0;

    const hours = Math.ceil(durationInMinutes / 60);

    switch(stationType) {
        case 'PC':
             // Facturation à l'heure, arrondie à l'heure supérieure.
            price = hours * 20;
            break;
        case 'PS5':
            if (isEvening) { // Tarif de soirée
                if (durationInMinutes <= 30) price = 20;
                else if (durationInMinutes <= 60) price = 30;
                else if (durationInMinutes <= 120) price = 50;
                else price = Math.ceil(durationInMinutes / 60 / 2) * 50; 
            } else { // Tarif de jour
                if (durationInMinutes <= 30) {
                    price = 10; // Prix pour 30 minutes
                } else {
                    // Si plus de 30 mins, facturer l'heure complète (ou plus)
                    price = hours * 20;
                }
            }
            break;
        case 'PS5 VIP':
        case 'VR Simulator':
             if (durationInMinutes <= 30) price = 25; // Base price for up to 30 mins
             else if (durationInMinutes <= 60) price = 45;
             else if (durationInMinutes <= 120) price = 75;
             else price = Math.ceil(durationInMinutes / 60 / 2) * 75;
            break;
    }
    return price;
}

export default function AdminDashboard() {
  const { t } = useTranslation();
  const firestore = useFirestore();

  const stationsQuery = useMemoFirebase(
    () => (firestore ? query(collection(firestore, 'stations')) : null),
    [firestore]
  );
  const { data: stations, isLoading: isLoadingStations } = useCollection<Station>(stationsQuery);

  const clientsQuery = useMemoFirebase(
    () => (firestore ? query(collection(firestore, 'clients')) : null),
    [firestore]
  );
  const { data: clients, isLoading: isLoadingClients } = useCollection<Client>(clientsQuery);
  
  const [usageLogs, setUsageLogs] = useState<UsageLog[] | null>(null);
  const [isLoadingUsageLogs, setIsLoadingUsageLogs] = useState(true);

  useEffect(() => {
    if (!firestore) return;
    
    setIsLoadingUsageLogs(true);
    const usageLogsQuery = query(collection(firestore, 'usageLogs'));
    
    const unsubscribe = onSnapshot(usageLogsQuery, (snapshot) => {
      const logs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as UsageLog));
      setUsageLogs(logs);
      setIsLoadingUsageLogs(false);
    }, (error) => {
      console.error("Error fetching usage logs in real-time: ", error);
      setIsLoadingUsageLogs(false);
    });

    return () => unsubscribe();
  }, [firestore]);


  const chartConfig = {
    revenue: {
      label: 'Revenue',
      color: 'hsl(var(--primary))',
    },
    users: {
      label: 'Users',
      color: 'hsl(var(--primary))',
    },
    pc: { label: 'PC', color: 'hsl(var(--chart-1))' },
    ps5: { label: 'PS5', color: 'hsl(var(--chart-2))' },
    "ps5 vip": { label: 'PS5 VIP', color: 'hsl(var(--accent))' },
    "vr simulator": { label: 'VR', color: 'hsl(var(--chart-5))' },
  };

  const dashboardData = useMemo(() => {
    if (!usageLogs || !stations) {
      return {
        totalRevenue: 0,
        dailyRevenue: [],
        popularStations: [],
        mostPopularType: 'N/A'
      };
    }
    
    let totalRevenue = 0;
    const stationUsageCount: Record<string, number> = { 'PC': 0, 'PS5': 0, 'PS5 VIP': 0, 'VR Simulator': 0 };
    const stationTypesMap = new Map(stations.map(s => [s.id, s.type]));
    
    const revenueByDay: Record<string, number> = {};
    const today = new Date();
    for (let i = 6; i >= 0; i--) {
        const day = subDays(today, i);
        const dayKey = format(day, 'yyyy-MM-dd');
        revenueByDay[dayKey] = 0;
    }

    for (const log of usageLogs) {
      if (log.endTime) {
        const startTime = new Date(log.startTime);
        const endTime = new Date(log.endTime);
        const duration = differenceInMinutes(endTime, startTime);
        const stationType = stationTypesMap.get(log.stationId);

        if (stationType) {
          const cost = calculatePrice(stationType, duration, startTime);
          totalRevenue += cost;
          
          // Weekly revenue
          const logDayKey = format(startTime, 'yyyy-MM-dd');
          if(logDayKey in revenueByDay) {
              revenueByDay[logDayKey] += cost;
          }

          // Station popularity
          if (duration > 0) { // Only count sessions that actually lasted some time
            stationUsageCount[stationType] = (stationUsageCount[stationType] || 0) + 1;
          }
        }
      }
    }
    
    const dailyRevenue = Object.entries(revenueByDay).map(([date, revenue]) => ({
      date: format(new Date(date), 'EEE'),
      revenue,
    }));
    
    const popularStations = Object.entries(stationUsageCount)
        .map(([station, users]) => ({ station, users }))
        .sort((a,b) => b.users - a.users);

    const mostPopularType = popularStations[0]?.station || "N/A";

    return { totalRevenue, dailyRevenue, popularStations, mostPopularType };

  }, [usageLogs, stations]);


  const stationsInUse = stations?.filter((s) => s.status === 'in use').length || 0;
  const isLoading = isLoadingClients || isLoadingStations || isLoadingUsageLogs;

  return (
    <div className="flex flex-col">
      <PageHeader
        title={t('dashboard')}
        description={t('dashboardDescription')}
        className="px-0"
      />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('totalRevenue')}</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
             {isLoading ? (
                <div className="h-8 w-1/2 animate-pulse rounded-md bg-muted" />
            ) : (
                <div className="text-2xl font-bold">
                    {formatCurrency(dashboardData.totalRevenue)}
                </div>
            )}
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
             {isLoading ? (
                <div className="h-8 w-1/2 animate-pulse rounded-md bg-muted" />
             ) : (
                <div className="text-2xl font-bold">{dashboardData.mostPopularType}</div>
             )}
            <p className="text-xs text-muted-foreground">
              {t('mostUsedStationType')}
            </p>
          </CardContent>
        </Card>
      </div>
      <div className="mt-8 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="font-headline">{t('weeklyRevenue')}</CardTitle>
          </CardHeader>
          <CardContent className="pl-2">
            {isLoading ? (
                 <div className="h-[300px] w-full animate-pulse rounded-md bg-muted" />
            ) : (
                <ChartContainer config={chartConfig} className="h-[300px] w-full">
                <AreaChart
                    accessibilityLayer
                    data={dashboardData.dailyRevenue}
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
                    tickFormatter={(value) => formatCurrency(Number(value), 'MAD').replace(/\s/g, '')}
                    tickLine={false}
                    axisLine={false}
                    tickMargin={8}
                    />
                    <ChartTooltip
                    cursor={false}
                    content={<ChartTooltipContent indicator="dot" formatter={(value) => formatCurrency(Number(value))}/>}
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
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="font-headline">{t('popularStations')}</CardTitle>
          </CardHeader>
          <CardContent>
             {isLoading ? (
                <div className="h-[300px] w-full animate-pulse rounded-md bg-muted" />
             ) : (
                <ChartContainer config={chartConfig} className="h-[300px] w-full">
                <RechartsBarChart
                    accessibilityLayer
                    data={dashboardData.popularStations}
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
                    <Bar dataKey="users" layout="vertical" radius={5} fill="var(--color-users)"/>
                </RechartsBarChart>
                </ChartContainer>
             )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
