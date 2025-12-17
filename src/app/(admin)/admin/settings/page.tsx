
'use client';

import { PageHeader } from '@/components/page-header';
import { useTranslation } from '@/hooks/use-translation';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
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
import { Globe, Palette, UserPlus, Bell, Lock } from 'lucide-react';
import { useAuth, useFirestore, useUser } from '@/firebase';
import { createUserWithEmailAndPassword, sendPasswordResetEmail, updatePassword, reauthenticateWithCredential, EmailAuthProvider } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';


function AddAdminDialog() {
    const [isOpen, setIsOpen] = useState(false);
    const [email, setEmail] = useState('');
    const [name, setName] = useState('');
    const [loading, setLoading] = useState(false);
    const { toast } = useToast();
    const auth = useAuth();
    const firestore = useFirestore();

    const handleAddAdmin = async () => {
        if (!auth || !firestore) {
            toast({ variant: 'destructive', title: 'Error', description: 'Authentication service not available.' });
            return;
        }
        if (!email || !name || !email.includes('@')) {
            toast({ variant: 'destructive', title: 'Invalid Input', description: 'Please enter a valid name and email address.' });
            return;
        }

        setLoading(true);
        try {
            // 1. Create a random password (it won't be used by the new admin)
            const randomPassword = Math.random().toString(36).slice(-8);

            // 2. Create the user
            const userCredential = await createUserWithEmailAndPassword(auth, email, randomPassword);
            const newUser = userCredential.user;
            
            // 3. Add the user to the 'admins' collection
            const adminRef = doc(firestore, 'admins', newUser.uid);
            await setDoc(adminRef, {
                email: newUser.email,
                role: 'manager', // You can set a default role
                addedOn: new Date().toISOString()
            });

            // 4. Send a password reset email immediately
            await sendPasswordResetEmail(auth, email);

            toast({
                title: "Admin Added Successfully",
                description: `${name} has been added. A password reset email has been sent to ${email}.`,
            });

            setIsOpen(false);
            setEmail('');
            setName('');
        } catch (error: any) {
            console.error("Error adding admin:", error);
            let description = "An unexpected error occurred.";
            if (error.code === 'auth/email-already-in-use') {
                description = "This email address is already in use by another account.";
            } else if (error.code === 'auth/invalid-email') {
                description = "The email address is not valid.";
            }
            toast({
                variant: 'destructive',
                title: 'Failed to Add Admin',
                description: description,
            });
        } finally {
            setLoading(false);
        }
    }

    return (
         <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                <Button>
                    <UserPlus className="mr-2 h-4 w-4" /> Add Admin
                </Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Add a new Administrator</DialogTitle>
                    <DialogDescription>
                        A new admin account will be created and they will receive an email to set their password.
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="name" className="text-right">Name</Label>
                        <Input
                            id="name"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="John Doe"
                            className="col-span-3"
                        />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="email" className="text-right">Email</Label>
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
                    <Button onClick={handleAddAdmin} disabled={loading}>{loading ? 'Adding...' : 'Add Admin'}</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}

function ChangePasswordCard() {
    const { user } = useUser();
    const { toast } = useToast();
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [loading, setLoading] = useState(false);

    const handleChangePassword = async () => {
        if (!user || !user.email) {
             toast({ variant: 'destructive', title: 'Error', description: 'You must be logged in to change your password.' });
             return;
        }
        if (!currentPassword || newPassword.length < 6) {
             toast({ variant: 'destructive', title: 'Invalid Input', description: 'New password must be at least 6 characters long.' });
             return;
        }

        setLoading(true);
        try {
            const credential = EmailAuthProvider.credential(user.email, currentPassword);
            // Re-authenticate the user to confirm their identity
            await reauthenticateWithCredential(user, credential);
            
            // If re-authentication is successful, update the password
            await updatePassword(user, newPassword);

            toast({
                title: "Password Changed",
                description: "Your password has been updated successfully.",
            });
            setCurrentPassword('');
            setNewPassword('');

        } catch (error: any) {
            console.error(error);
            let description = 'An unexpected error occurred.';
            if (error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
                description = 'The current password you entered is incorrect.';
            }
            toast({
                variant: 'destructive',
                title: 'Password Change Failed',
                description: description,
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <Card className="lg:col-span-1">
            <CardHeader>
                <CardTitle className="font-headline flex items-center gap-2">
                    <Lock className="h-5 w-5 text-primary" />
                    Security
                </CardTitle>
                <CardDescription>
                    Change your administrator account password.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="space-y-2">
                    <Label htmlFor="current-password">Current Password</Label>
                    <Input id="current-password" type="password" value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} />
                </div>
                 <div className="space-y-2">
                    <Label htmlFor="new-password">New Password</Label>
                    <Input id="new-password" type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} />
                </div>
            </CardContent>
            <CardFooter>
                 <Button onClick={handleChangePassword} disabled={loading}>{loading ? 'Changing...' : 'Change Password'}</Button>
            </CardFooter>
        </Card>
    );
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
            <AddAdminDialog />
          </CardContent>
        </Card>
        
        {/* Security Card */}
        <ChangePasswordCard />

        {/* Notification Settings Card */}
        <Card className="lg:col-span-1">
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

    

    