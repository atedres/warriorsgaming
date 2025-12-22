
'use client';

import { useState } from 'react';
import { useUser, useFirestore, useDoc, useAuth } from '@/firebase';
import type { Client } from '@/app/lib/data';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useMemoFirebase } from '@/firebase/provider';
import { doc, updateDoc } from 'firebase/firestore';
import { updatePassword, reauthenticateWithCredential, EmailAuthProvider } from 'firebase/auth';
import ClientHeader from '@/components/client/header';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Lock, User as UserIcon } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

const profileFormSchema = z.object({
  name: z.string().min(2, { message: "Le nom doit contenir au moins 2 caractères." }),
  phone: z.string().min(10, { message: "Le numéro de téléphone doit contenir au moins 10 chiffres." }),
});

const passwordFormSchema = z.object({
    currentPassword: z.string().min(1, { message: "Veuillez entrer votre mot de passe actuel." }),
    newPassword: z.string().min(6, { message: "Le nouveau mot de passe doit contenir au moins 6 caractères." }),
});

function ProfileSettingsSkeleton() {
    return (
        <div className="grid gap-8 md:grid-cols-2">
            <Card>
                <CardHeader><Skeleton className="h-6 w-48" /></CardHeader>
                <CardContent className="space-y-4">
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-10 w-full" />
                </CardContent>
                <CardFooter><Skeleton className="h-10 w-24" /></CardFooter>
            </Card>
            <Card>
                <CardHeader><Skeleton className="h-6 w-48" /></CardHeader>
                <CardContent className="space-y-4">
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-10 w-full" />
                </CardContent>
                <CardFooter><Skeleton className="h-10 w-24" /></CardFooter>
            </Card>
        </div>
    );
}

export default function ProfileSettingsPage() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const auth = useAuth();
  const { toast } = useToast();

  const clientRef = useMemoFirebase(
    () => (user ? doc(firestore!, 'clients', user.uid) : null),
    [user, firestore]
  );
  const { data: client, isLoading: isLoadingClient } = useDoc<Client>(clientRef);

  const profileForm = useForm<z.infer<typeof profileFormSchema>>({
    resolver: zodResolver(profileFormSchema),
    values: { // Use values to sync form with fetched client data
        name: client?.name || '',
        phone: client?.phone || ''
    }
  });

  const passwordForm = useForm<z.infer<typeof passwordFormSchema>>({
    resolver: zodResolver(passwordFormSchema),
    defaultValues: {
        currentPassword: '',
        newPassword: ''
    }
  });

  const handleProfileUpdate = async (values: z.infer<typeof profileFormSchema>) => {
    if (!clientRef) return;
    try {
        await updateDoc(clientRef, {
            name: values.name,
            phone: values.phone
        });
        toast({ title: "Profil mis à jour", description: "Vos informations ont été enregistrées." });
    } catch (error) {
        console.error("Error updating profile:", error);
        toast({ variant: "destructive", title: "Erreur", description: "Impossible de mettre à jour votre profil." });
    }
  }

  const handleChangePassword = async (values: z.infer<typeof passwordFormSchema>) => {
    if (!user || !user.email) {
        toast({ variant: 'destructive', title: 'Erreur', description: 'Vous devez être connecté.' });
        return;
    }

    const { currentPassword, newPassword } = values;
    const credential = EmailAuthProvider.credential(user.email, currentPassword);

    try {
        await reauthenticateWithCredential(user, credential);
        await updatePassword(user, newPassword);
        toast({ title: "Mot de passe changé", description: "Votre mot de passe a été mis à jour." });
        passwordForm.reset();
    } catch (error: any) {
        console.error("Password change error:", error);
        const description = error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential' 
            ? "Le mot de passe actuel est incorrect."
            : "Une erreur est survenue.";
        toast({ variant: 'destructive', title: 'Échec du changement', description });
    }
  }

  if (isUserLoading || isLoadingClient) {
    return (
        <>
            <ClientHeader />
            <main className='container py-8'>
                <PageHeader title="Paramètres du Profil" description="Modifiez vos informations personnelles et de sécurité." />
                <ProfileSettingsSkeleton />
            </main>
        </>
    );
  }

  if (!client) {
      return (
           <>
            <ClientHeader />
            <main className='container py-8'>
                 <PageHeader title="Paramètres du Profil" description="Modifiez vos informations personnelles et de sécurité." />
                <Card>
                    <CardHeader>
                        <CardTitle>Profil non trouvé</CardTitle>
                    </CardHeader>
                </Card>
            </main>
        </>
      )
  }
  
  const avatarSrc = `https://api.dicebear.com/8.x/bottts/svg?seed=${client.id}`;

  return (
    <>
        <ClientHeader />
        <main className='container py-8'>
            <PageHeader title="Paramètres du Profil" description="Modifiez vos informations personnelles et de sécurité." />
            
            <div className="grid gap-8 grid-cols-1 lg:grid-cols-3">
                <div className="lg:col-span-2 grid gap-8">
                     <Card>
                        <Form {...profileForm}>
                            <form onSubmit={profileForm.handleSubmit(handleProfileUpdate)}>
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2"><UserIcon /> Informations Personnelles</CardTitle>
                                    <CardDescription>Mettez à jour votre nom et numéro de téléphone.</CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <FormField
                                        control={profileForm.control}
                                        name="name"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Nom</FormLabel>
                                                <FormControl>
                                                    <Input {...field} />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={profileForm.control}
                                        name="phone"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Téléphone</FormLabel>
                                                <FormControl>
                                                    <Input {...field} />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                </CardContent>
                                <CardFooter>
                                    <Button type="submit" disabled={profileForm.formState.isSubmitting}>
                                        {profileForm.formState.isSubmitting ? 'Enregistrement...' : 'Enregistrer les modifications'}
                                    </Button>
                                </CardFooter>
                            </form>
                        </Form>
                    </Card>

                    <Card>
                        <Form {...passwordForm}>
                            <form onSubmit={passwordForm.handleSubmit(handleChangePassword)}>
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2"><Lock /> Sécurité</CardTitle>
                                    <CardDescription>Changez votre mot de passe.</CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                <FormField
                                        control={passwordForm.control}
                                        name="currentPassword"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Mot de passe actuel</FormLabel>
                                                <FormControl>
                                                    <Input type="password" {...field} />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={passwordForm.control}
                                        name="newPassword"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Nouveau mot de passe</FormLabel>
                                                <FormControl>
                                                    <Input type="password" {...field} />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                </CardContent>
                                <CardFooter>
                                    <Button type="submit" disabled={passwordForm.formState.isSubmitting}>
                                        {passwordForm.formState.isSubmitting ? 'Modification...' : 'Changer le mot de passe'}
                                    </Button>
                                </CardFooter>
                            </form>
                        </Form>
                    </Card>
                </div>
                 <div className="lg:col-span-1">
                    <Card>
                         <CardHeader>
                            <CardTitle className="flex items-center gap-2">Votre Avatar</CardTitle>
                        </CardHeader>
                        <CardContent className="flex flex-col items-center space-y-4">
                           <Avatar className="h-32 w-32 text-6xl">
                              <AvatarImage src={avatarSrc} alt={client.name} />
                              <AvatarFallback>{client.name.charAt(0)}</AvatarFallback>
                            </Avatar>
                            <p className="text-sm text-center text-muted-foreground">Votre avatar est généré automatiquement à partir de votre identifiant unique.</p>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </main>
    </>
  );
}
