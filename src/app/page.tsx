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

export default function Home() {
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
      case 'PS5 VIP':
        return <Gamepad2 className="h-6 w-6 text-primary" />;
      case 'VR Simulator':
        return <Headset className="h-6 w-6" />;
      default:
        return null;
    }
  };

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
              <Button
                size="lg"
                className="bg-accent text-accent-foreground hover:bg-accent/90"
              >
                Book a Station
              </Button>
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
                      <div className="mt-4 h-6 w-1/3 animate-pulse rounded-full bg-muted" />
                      <div className="mt-6 h-10 w-full animate-pulse rounded-md bg-muted" />
                    </CardContent>
                  </Card>
                ))}
              {stations?.map((station) => (
                <Card key={station.id} className="flex flex-col">
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="font-headline text-lg font-medium">
                      {station.name}
                    </CardTitle>
                    {getIcon(station.type)}
                  </CardHeader>
                  <CardContent className="flex-1 flex flex-col justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">
                        {station.type}
                      </p>
                      <Badge
                        variant={
                          station.status === 'Available'
                            ? 'secondary'
                            : 'destructive'
                        }
                        className={`mt-4 ${
                          station.status === 'Available'
                            ? 'bg-green-500/20 text-green-400 border-green-500/20'
                            : 'bg-red-500/20 text-red-400 border-red-500/20'
                        }`}
                      >
                        {station.status}
                      </Badge>
                    </div>
                    <Button
                      className="mt-6 w-full bg-primary/90 hover:bg-primary"
                      disabled={station.status !== 'Available'}
                    >
                      Reserve Now
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
