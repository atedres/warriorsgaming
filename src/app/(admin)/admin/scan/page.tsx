"use client";

import { useState } from "react";
import { QrCode, User, CheckCircle, Gift, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { Client } from "@/app/lib/data";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/page-header";
import { useCollection, useFirestore } from "@/firebase";
import { useMemoFirebase } from "@/firebase/provider";
import { collection, query } from "firebase/firestore";


export default function ScanPage() {
  const [scannedClient, setScannedClient] = useState<Client | null>(null);
  const [loading, setLoading] = useState(false);

  const firestore = useFirestore();
  const clientsQuery = useMemoFirebase(
    () => (firestore ? query(collection(firestore, 'clients')) : null),
    [firestore]
  );
  const { data: clients, isLoading } = useCollection<Client>(clientsQuery);

  const handleScan = () => {
    setLoading(true);
    setScannedClient(null);
    // Simulate scanning a QR code by using a webcam
    // For now, we'll just simulate a scan with a timeout
    setTimeout(() => {
      // Simulate scanning a random client
      if(clients && clients.length > 0){
        const randomClient = clients[Math.floor(Math.random() * clients.length)];
        setScannedClient(randomClient);
      }
      setLoading(false);
    }, 1500);
  };

  return (
    <>
      <PageHeader
        title="QR Code Scanner"
        description="Scan a client's QR code to check them in or manage their account."
      />
      <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="font-headline">Scanner</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center justify-center gap-6 text-center h-full min-h-[300px]">
            <div className="w-full max-w-[200px] h-auto aspect-square bg-muted rounded-lg flex items-center justify-center">
              <QrCode className="h-24 w-24 text-muted-foreground" />
            </div>
            <Button onClick={handleScan} disabled={loading || isLoading} className="w-full max-w-xs">
              {loading ? "Scanning..." : "Simulate Scan"}
            </Button>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="font-headline">Client Profile</CardTitle>
            <CardDescription>
              Client information will appear here after a successful scan.
            </CardDescription>
          </CardHeader>
          <CardContent className="min-h-[300px]">
            {loading && (
              <div className="flex items-center justify-center h-full">
                <div className="flex flex-col items-center gap-2">
                  <QrCode className="h-10 w-10 animate-pulse text-primary" />
                  <p className="text-muted-foreground">Searching for client...</p>
                </div>
              </div>
            )}
            {!loading && scannedClient && (
              <div className="space-y-6">
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0">
                    <User className="h-12 w-12 text-primary" />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold">{scannedClient.name}</h3>
                    <p className="text-muted-foreground">{scannedClient.email}</p>
                    <Badge variant="secondary" className="mt-2">{scannedClient.subscriptionTier}</Badge>
                  </div>
                </div>
                
                <Separator />
                
                <div className="grid gap-4">
                  <h4 className="font-semibold">Actions</h4>
                  <div className="flex flex-wrap gap-2">
                    <Button>
                      <CheckCircle className="mr-2 h-4 w-4" /> Check-in Client
                    </Button>
                    <Button variant="secondary">
                      <Gift className="mr-2 h-4 w-4" /> Add Bonus
                    </Button>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="hours" className="flex items-center">
                        <Clock className="mr-2 h-4 w-4 text-muted-foreground"/>
                        Manage Subscription Hours
                    </Label>
                    <div className="flex gap-2">
                        <Input id="hours" type="number" placeholder={`${scannedClient.subscriptionHours} hours`} />
                        <Button variant="outline">Update</Button>
                    </div>
                  </div>
                </div>
              </div>
            )}
            {!loading && !scannedClient && (
              <div className="flex items-center justify-center h-full text-center">
                <div className="flex flex-col items-center gap-2">
                    <User className="h-10 w-10 text-muted-foreground"/>
                    <p className="text-muted-foreground">Waiting for scan...</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
