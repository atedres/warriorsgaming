'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth, useUser, useFirestore } from '@/firebase';
import { signInWithEmailAndPassword, signOut, createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Logo } from '@/components/logo';
import { useToast } from '@/hooks/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

// In a real application, this should be a securely stored environment variable.
const INVITATION_CODE = "SUPERADMIN";

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [loading, setLoading] = useState(false);
  const auth = useAuth();
  const firestore = useFirestore();
  const { user, isUserLoading } = useUser();
  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    if (!isUserLoading && user) {
        checkAdminAndRedirect(user.uid);
    }
  }, [user, isUserLoading, router, firestore]);

  const checkAdminAndRedirect = async (uid: string) => {
    if (!firestore) return;
    const adminRef = doc(firestore, 'admins', uid);
    const adminDoc = await getDoc(adminRef);
    if (adminDoc.exists()) {
        router.push('/admin');
    }
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth || !firestore) return;
    setLoading(true);
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const loggedInUser = userCredential.user;

      const adminRef = doc(firestore, 'admins', loggedInUser.uid);
      const adminDoc = await getDoc(adminRef);

      if (adminDoc.exists()) {
        router.push('/admin');
      } else {
        await signOut(auth);
        toast({
          variant: 'destructive',
          title: 'Accès non autorisé',
          description: "Ce compte n'a pas les permissions d'administrateur.",
        });
      }
    } catch (error: any) {
      let description = 'Une erreur inattendue est survenue. Veuillez réessayer.';
      if (error.code === 'auth/invalid-credential' || error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
        description = 'Email ou mot de passe incorrect. Veuillez vérifier vos informations et réessayer.';
      }
      
      toast({
        variant: 'destructive',
        title: 'Échec de la connexion',
        description: description,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth || !firestore) return;
    if (password.length < 6) {
        toast({ variant: "destructive", title: "Mot de passe faible", description: "Le mot de passe doit contenir au moins 6 caractères." });
        return;
    }
    if (inviteCode !== INVITATION_CODE) {
        toast({ variant: "destructive", title: "Code d'invitation invalide", description: "Le code d'invitation fourni est incorrect." });
        return;
    }

    setLoading(true);
    try {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const newUser = userCredential.user;

        const adminRef = doc(firestore, "admins", newUser.uid);
        await setDoc(adminRef, {
            email: newUser.email,
            name: name,
            role: 'manager',
            addedOn: new Date().toISOString()
        });
        
        toast({ title: "Compte Admin créé", description: `Bienvenue ${name}. Vous pouvez maintenant vous connecter.` });
        router.push('/admin');

    } catch (error: any) {
        let description = "Une erreur inattendue est survenue.";
        if (error.code === 'auth/email-already-in-use') {
            description = "Cette adresse e-mail est déjà utilisée par un autre compte.";
        }
        toast({ variant: "destructive", title: "Échec de l'inscription", description: description });
    } finally {
        setLoading(false);
    }
  };
  
  if (isUserLoading || user) {
    return (
      <div className="flex h-screen w-full flex-col items-center justify-center bg-muted/40">
        <Logo className="h-12 w-auto animate-pulse" />
        <p className="mt-4 text-muted-foreground">Vérification...</p>
      </div>
    );
  }


  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-muted/40 p-4">
      <div className="mb-8">
        <Logo className="h-12 w-auto" />
      </div>
       <Tabs defaultValue="login" className="w-full max-w-sm">
        <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="login">Se connecter</TabsTrigger>
            <TabsTrigger value="signup">S'inscrire</TabsTrigger>
        </TabsList>
        <TabsContent value="login">
            <Card>
                <form onSubmit={handleLogin}>
                <CardHeader>
                    <CardTitle className="text-2xl font-headline">Admin Login</CardTitle>
                    <CardDescription>
                    Entrez vos identifiants pour accéder au panneau de contrôle.
                    </CardDescription>
                </CardHeader>
                <CardContent className="grid gap-4">
                    <div className="grid gap-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                        id="email"
                        type="email"
                        placeholder="admin@example.com"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                    />
                    </div>
                    <div className="grid gap-2">
                    <Label htmlFor="password">Password</Label>
                    <Input
                        id="password"
                        type="password"
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                    />
                    </div>
                </CardContent>
                <CardFooter className="flex flex-col gap-2">
                    <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? 'Connexion...' : 'Se connecter'}
                    </Button>
                     <Button variant="outline" className="w-full" asChild>
                        <Link href="/">Retour à l'accueil</Link>
                    </Button>
                </CardFooter>
                </form>
            </Card>
        </TabsContent>
         <TabsContent value="signup">
          <Card>
            <form onSubmit={handleSignUp}>
              <CardHeader>
                <CardTitle className="text-2xl font-headline">
                  Créer un compte Admin
                </CardTitle>
                <CardDescription>
                  Inscrivez-vous en tant que nouvel administrateur.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name-signup">Nom complet</Label>
                  <Input id="name-signup" type="text" placeholder="John Doe" required value={name} onChange={(e) => setName(e.target.value)}/>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email-signup">Email</Label>
                  <Input id="email-signup" type="email" placeholder="admin@example.com" required value={email} onChange={(e) => setEmail(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password-signup">Mot de passe</Label>
                  <Input id="password-signup" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="6+ caractères" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="invite-code">Code d'invitation</Label>
                  <Input id="invite-code" type="password" required value={inviteCode} onChange={(e) => setInviteCode(e.target.value)} placeholder="Code secret" />
                </div>
              </CardContent>
              <CardFooter>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? "Création du compte..." : "S'inscrire"}
                </Button>
              </CardFooter>
            </form>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
