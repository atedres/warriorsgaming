
'use client';

import { useState, useMemo, useEffect } from 'react';
import { collection, query, onSnapshot } from 'firebase/firestore';
import { useFirestore } from '@/firebase';
import type { UsageLog, Station } from '@/app/lib/data';
import { useTranslation } from '@/hooks/use-translation';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Bar, CartesianGrid, XAxis, YAxis, ResponsiveContainer, BarChart as RechartsBarChart } from 'recharts';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { formatCurrency } from '@/lib/utils';
import { format, parseISO, getDay, getHours } from 'date-fns';
import { fr } from 'date-fns/locale';
import { DollarSign, TrendingUp } from 'lucide-react';

function calculatePrice(stationType: Station['type'], durationInMinutes: number, sessionDate: Date): number {
    if (durationInMinutes <= 0) return 0;
    let price = 0;
    const day = getDay(sessionDate); // Sunday = 0, Monday = 1, etc.
    const hour = getHours(sessionDate);
    const isWeekend = day === 0 || day === 6;

    switch (stationType) {
        case 'PC':
            price = Math.ceil(durationInMinutes / 60) * 15;
            break;
        case 'PS5':
            if (isWeekend || hour >= 20) {
                // Weekend prices
                if (durationInMinutes <= 30) price = 20;
                else if (durationInMinutes <= 60) price = 30;
                else if (durationInMinutes <= 120) price = 50;
                else price = Math.ceil(durationInMinutes / 60) * 25;
            } else {
                // Weekday prices (11:00 - 20:00)
                price = Math.ceil(durationInMinutes / 60) * 20;
            }
            break;
        case 'PS5 VIP':
            if (durationInMinutes <= 60) price = 45;
            else if (durationInMinutes <= 120) price = 75;
            else price = Math.ceil(durationInMinutes / 120) * 75;
            break;
        case 'VR':
        case 'Simulator':
            if (durationInMinutes <= 30) price = 30;
            else if (durationInMinutes <= 60) price = 50;
            else price = Math.ceil(durationInMinutes / 30) * 30;
            break;
    }
    return price;
}


export default function StatisticsPage() {
    const { t } = useTranslation();
    const firestore = useFirestore();

    const [usageLogs, setUsageLogs] = useState<UsageLog[] | null>(null);
    const [stations, setStations] = useState<Station[] | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (!firestore) return;
        
        const usageLogsQuery = query(collection(firestore, 'usageLogs'));
        const stationsQuery = query(collection(firestore, 'stations'));

        const unsubLogs = onSnapshot(usageLogsQuery, (snapshot) => {
            const logs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as UsageLog));
            setUsageLogs(logs);
        }, (error) => console.error("Error fetching usage logs: ", error));

        const unsubStations = onSnapshot(stationsQuery, (snapshot) => {
            const stationsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Station));
            setStations(stationsData);
        }, (error) => console.error("Error fetching stations: ", error));

        return () => {
            unsubLogs();
            unsubStations();
        };
    }, [firestore]);

    useEffect(() => {
        if (usageLogs !== null && stations !== null) {
            setIsLoading(false);
        }
    }, [usageLogs, stations]);
    
    const chartConfig = {
        revenue: { label: 'Revenu', color: 'hsl(var(--primary))' },
    };

    const statsData = useMemo(() => {
        if (!usageLogs || !stations) {
            return {
                totalRevenue: 0,
                revenueByMonth: [],
                bestMonth: { month: 'N/A', revenue: 0 },
            };
        }

        const stationTypesMap = new Map(stations.map(s => [s.id, s.type]));
        let totalRevenue = 0;
        const monthlyRevenue: Record<string, number> = {};

        usageLogs.forEach(log => {
            if (log.endTime) {
                const startTime = parseISO(log.startTime);
                const monthKey = format(startTime, 'yyyy-MM');
                
                let cost = 0;
                if (typeof log.finalCost === 'number') {
                    cost = log.finalCost;
                } else {
                    const endTime = parseISO(log.endTime);
                    const duration = Math.round((endTime.getTime() - startTime.getTime()) / 60000);
                    const stationType = stationTypesMap.get(log.stationId);
                    if (stationType) {
                        cost = calculatePrice(stationType, duration, startTime);
                    }
                }
                
                totalRevenue += cost;
                monthlyRevenue[monthKey] = (monthlyRevenue[monthKey] || 0) + cost;
            }
        });

        const revenueByMonth = Object.entries(monthlyRevenue)
            .map(([month, revenue]) => ({ month, revenue, }))
            .sort((a, b) => a.month.localeCompare(b.month))
            .map(({month, revenue}) => ({
                name: format(parseISO(`${month}-01`), 'MMM yyyy', { locale: fr }),
                revenue,
            }));
        
        let bestMonthData = { name: 'N/A', revenue: 0 };
        if (revenueByMonth.length > 0) {
            bestMonthData = revenueByMonth.reduce((max, current) => current.revenue > max.revenue ? current : max, revenueByMonth[0]);
        }

        return {
            totalRevenue,
            revenueByMonth,
            bestMonth: { month: bestMonthData.name, revenue: bestMonthData.revenue },
        };
    }, [usageLogs, stations]);


    return (
        <>
            <PageHeader
                title={t('advancedStatistics')}
                description={t('advancedStatisticsDescription')}
                className="px-0"
            />
            
            <div className="grid gap-4 md:grid-cols-3 mb-8">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">{t('totalRevenueSinceLaunch')}</CardTitle>
                        <DollarSign className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        {isLoading ? <div className="h-8 w-1/2 animate-pulse rounded-md bg-muted" /> : <div className="text-2xl font-bold">{formatCurrency(statsData.totalRevenue)}</div>}
                    </CardContent>
                </Card>
                 <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">{t('bestMonth')}</CardTitle>
                        <TrendingUp className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                         {isLoading ? <div className="h-8 w-1/2 animate-pulse rounded-md bg-muted" /> : (
                             <>
                                <div className="text-2xl font-bold">{formatCurrency(statsData.bestMonth.revenue)}</div>
                                <p className="text-xs text-muted-foreground">{statsData.bestMonth.month}</p>
                             </>
                         )}
                    </CardContent>
                </Card>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle className="font-headline">{t('revenueByMonth')}</CardTitle>
                    <CardDescription>Évolution mensuelle des revenus.</CardDescription>
                </CardHeader>
                <CardContent>
                    {isLoading ? (
                        <div className="h-[400px] w-full animate-pulse rounded-md bg-muted" />
                    ) : (
                        <ChartContainer config={chartConfig} className="h-[400px] w-full">
                            <RechartsBarChart data={statsData.revenueByMonth}>
                                <CartesianGrid vertical={false} />
                                <XAxis
                                    dataKey="name"
                                    tickLine={false}
                                    tickMargin={10}
                                    axisLine={false}
                                />
                                <YAxis tickFormatter={(value) => formatCurrency(Number(value), 'MAD').replace(/\s/g, '')} />
                                <ChartTooltip
                                    cursor={false}
                                    content={<ChartTooltipContent formatter={(value) => formatCurrency(Number(value))}/>}
                                />
                                <Bar dataKey="revenue" fill="var(--color-revenue)" radius={8} />
                            </RechartsBarChart>
                        </ChartContainer>
                    )}
                </CardContent>
            </Card>
        </>
    )
}
