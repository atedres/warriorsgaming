'use client';
import Image from 'next/image';
import { Gamepad2, Headset, Monitor } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import ClientHeader from '@/components/client/header';
import { useCollection, useFirestore } from '@/firebase';
import { collection, query } from 'firebase/firestore';
import { useMemoFirebase } from '@/firebase/provider';
import type { Station } from '@/app/lib/data';
import { cn } from '@/lib/utils';
import { useState } from 'react';

export default function Home() {
  const [filter, setFilter] = useState('All');
  const firestore = useFirestore();
  const stationsQuery = useMemoFirebase(
    () => (firestore ? query(collection(firestore, 'stations')) : null),
    [firestore]
  );
  const { data: stations, isLoading } = useCollection<Station>(stationsQuery);

  const getIcon = (type: string) => {
    switch (type) {
      case 'PC':
        return <Monitor className="h-6 w-6" />;
      case 'PS5':
        return <Gamepad2 className="h-6 w-6" />;
      case 'VIP PS5':
        return <Gamepad2 className="h-6 w-6 text-primary" />;
      case 'VR Simulator':
        return <Headset className="h-6 w-6" />;
      default:
        return null;
    }
  };

  const stationTypes = [
    'All',
    'PC',
    'PS5',
    'PS5 VIP',
    'VR Simulator',
  ];

  const filteredStations =
    stations?.filter(
      (station) => filter === 'All' || station.type === filter
    ) || [];

  return (
    <div className="flex min-h-screen w-full flex-col">
      <ClientHeader />
      <main className="flex-1">
        <section className="relative w-full py-12 md:py-24 lg:py-32 xl:py-48">
          <Image
            src="https://picsum.photos/seed/cyberhub-hero/1920/1080"
            data-ai-hint="gaming setup neon"
            alt="Hero background"
            fill
            className="object-cover -z-10"
          />
          <div className="absolute inset-0 bg-background/80 -z-10" />
          <div className="container px-4 md:px-6">
            <div className="flex flex-col items-center space-y-4 text-center">
              <h1 className="font-headline text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl lg:text-6xl/none text-shadow-lg">
                Welcome to CyberHub
              </h1>
              <p className="mx-auto max-w-[700px] text-foreground/80 md:text-xl">
                Your ultimate gaming destination. Check station availability and
                book your spot now.
              </p>
            </div>
          </div>
        </section>

        <section id="stations" className="w-full py-12 md:py-24 lg:py-32">
          <div className="container px-4 md:px-6">
            <div className="flex flex-col items-center justify-center space-y-4 text-center">
              <div className="space-y-2">
                <h2 className="font-headline text-3xl font-bold tracking-tighter sm:text-5xl">
                  Station Status
                </h2>
                <p className="max-w-[900px] text-foreground/80 md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed">
                  Find an available station and jump into the action.
                </p>
              </div>
              <div className="flex flex-wrap items-center justify-center gap-2 pt-6">
                {stationTypes.map((type) => (
                  <Button
                    key={type}
                    variant={filter === type ? 'default' : 'outline'}
                    onClick={() => setFilter(type)}
                  >
                    {type}
                  </Button>
                ))}
              </div>
            </div>
            <div className="mx-auto grid max-w-5xl grid-cols-1 gap-6 py-12 sm:grid-cols-2 lg:grid-cols-3">
              {isLoading &&
                Array.from({ length: 6 }).map((_, i) => (
                  <Card key={i} className="flex flex-col">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                      <div className="h-6 w-3/4 animate-pulse rounded-md bg-muted" />
                    </CardHeader>
                    <CardContent className="flex-1 flex flex-col justify-between">
                      <div className="h-4 w-1/2 animate-pulse rounded-md bg-muted" />
                      <div className="mt-4 h-10 w-full animate-pulse rounded-md bg-muted" />
                      <div className="mt-4 h-10 w-full animate-pulse rounded-md bg-muted" />
                    </CardContent>
                  </Card>
                ))}
              {filteredStations.map((station) => (
                <Card key={station.id} className="flex flex-col">
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="font-headline text-lg font-medium">
                      {station.id}
                    </CardTitle>
                    {getIcon(station.type)}
                  </CardHeader>
                  <CardContent className="flex-1 flex flex-col justify-between">
                    <div className="space-y-2">
                      <p className="text-sm text-muted-foreground">
                        {station.type}
                      </p>
                      <div className="mt-2">
                        <h4 className="text-xs font-semibold text-muted-foreground">
                          Jeux disponibles
                        </h4>
                        <p className="text-sm">
                          {station.games?.join(', ') || 'N/A'}
                        </p>
                      </div>
                      <Badge
                        className={cn(
                          'mt-4 text-white w-full justify-center py-2 text-sm',
                          {
                            'bg-green-500 hover:bg-green-500/80':
                              station.status === 'available',
                            'bg-red-500 hover:bg-red-500/80':
                              station.status === 'in use' ||
                              station.status === 'maintenance',
                          }
                        )}
                      >
                        {station.status}
                      </Badge>
                    </div>
                    <Button
                      variant="outline"
                      className="mt-4"
                      disabled={station.status !== 'available'}
                    >
                      Réserver
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>
      </main>
      <footer className="flex flex-col gap-2 sm:flex-row py-6 w-full shrink-0 items-center px-4 md:px-6 border-t">
        <p className="text-xs text-muted-foreground">
          &copy; 2024 CyberHub Manager. All rights reserved.
        </p>
      </footer>
    </div>
  );
}
