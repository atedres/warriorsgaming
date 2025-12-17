
'use client';

import { PageHeader } from '@/components/page-header';
import { useTranslation } from '@/hooks/use-translation';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { Globe, Palette, UserPlus, Bell } from 'lucide-react';


function InviteAdminDialog() {
    const [isOpen, setIsOpen] = useState(false);
    const [email, setEmail] = useState('');
    const { toast } = useToast();
    const { t } = useTranslation();

    const handleInvite = () => {
        // Here you would typically call a server action or API
        // to send an invitation email to the new administrator.
        // For this example, we'll just show a success toast.
        if (email && email.includes('@')) {
            toast({
                title: "Invitation Sent",
                description: `An invitation has been sent to ${email}.`,
            });
            setIsOpen(false);
            setEmail('');
        } else {
            toast({
                variant: 'destructive',
                title: 'Invalid Email',
                description: 'Please enter a valid email address.',
            });
        }
    }

    return (
         <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                <Button>
                    <UserPlus className="mr-2 h-4 w-4" /> Invite Admin
                </Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Invite a new Administrator</DialogTitle>
                    <DialogDescription>
                        Enter the email address of the user you want to invite. They will receive an email with instructions to set up their account.
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="email" className="text-right">
                            Email
                        </Label>
                        <Input
                            id="email"
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="admin@example.com"
                            className="col-span-3"
                        />
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => setIsOpen(false)}>Cancel</Button>
                    <Button onClick={handleInvite}>Send Invitation</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}


export default function SettingsPage() {
  const { t } = useTranslation();

  return (
    <>
      <PageHeader
        title={t('settings')}
        description="Manage your application settings."
        className="px-0"
      />
      <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
        {/* User Management Card */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="font-headline flex items-center gap-2">
                <UserPlus className="h-5 w-5 text-primary" />
                User Management
            </CardTitle>
            <CardDescription>
              Add new administrators to your dashboard.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <InviteAdminDialog />
          </CardContent>
        </Card>

        {/* Notification Settings Card */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="font-headline flex items-center gap-2">
                <Bell className="h-5 w-5 text-primary" />
                Notifications
            </CardTitle>
            <CardDescription>
              Manage how you receive alerts and notifications.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
             <div className="flex items-center justify-between space-x-2 p-2 rounded-md hover:bg-muted/50">
              <Label htmlFor="station-full-notif" className="flex flex-col gap-1">
                <span>Station Full</span>
                <span className="font-normal text-sm text-muted-foreground leading-snug">
                  Notify when all stations are in use.
                </span>
              </Label>
              <Switch id="station-full-notif" />
            </div>
             <div className="flex items-center justify-between space-x-2 p-2 rounded-md hover:bg-muted/50">
              <Label htmlFor="maintenance-notif" className="flex flex-col gap-1">
                <span>Maintenance Required</span>
                 <span className="font-normal text-sm text-muted-foreground leading-snug">
                  Get alerts for stations that need maintenance.
                </span>
              </Label>
              <Switch id="maintenance-notif" />
            </div>
             <div className="flex items-center justify-between space-x-2 p-2 rounded-md hover:bg-muted/50">
              <Label htmlFor="new-client-notif" className="flex flex-col gap-1">
                <span>New Client</span>
                 <span className="font-normal text-sm text-muted-foreground leading-snug">
                  Notify when a new client profile is created.
                </span>
              </Label>
              <Switch id="new-client-notif" checked/>
            </div>
          </CardContent>
        </Card>

        {/* Appearance and Language Card */}
         <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle className="font-headline">Appearance & Language</CardTitle>
            <CardDescription>
              Customize the look and feel of your dashboard.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid md:grid-cols-2 gap-4">
             <div className="flex items-start gap-4 p-4 rounded-lg border bg-background">
                <Globe className="h-6 w-6 text-primary" />
                <div>
                    <h3 className="font-semibold">Language</h3>
                    <p className="text-sm text-muted-foreground">
                        Change the display language of the dashboard using the globe icon in the top header.
                    </p>
                </div>
            </div>
            <div className="flex items-start gap-4 p-4 rounded-lg border bg-background">
                <Palette className="h-6 w-6 text-primary" />
                <div>
                    <h3 className="font-semibold">Theme</h3>
                    <p className="text-sm text-muted-foreground">
                        Switch between light, dark, and system themes using the sun/moon icon in the top header.
                    </p>
                </div>
            </div>
          </CardContent>
        </Card>

      </div>
    </>
  );
}
