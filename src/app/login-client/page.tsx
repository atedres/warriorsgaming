
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth, useUser, useFirestore } from '@/firebase';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
} from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from '@/components/ui/card';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Logo } from '@/components/logo';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';

function ForgotPasswordDialog() {
    const [email, setEmail] = useState('');
    const [isOpen, setIsOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const auth = useAuth();
    const { toast } = useToast();

    const handlePasswordReset = async () => {
        if (!auth || !email) {
            toast({
                variant: "destructive",
                title: "Adresse e-mail requise",
                description: "Veuillez entrer votre adresse e-mail.",
            });
            return;
        }
        setLoading(true);
        try {
            await sendPasswordResetEmail(auth, email);
            toast({
                title: "E-mail envoyé",
                description: "Si un compte existe pour cet e-mail, vous recevrez un lien pour réinitialiser votre mot de passe.",
            });
            setIsOpen(false);
        } catch (error) {
            console.error("Password reset error:", error);
            // We show a generic message to avoid confirming if an email exists or not
            toast({
                title: "E-mail envoyé",
                description: "Si un compte existe pour cet e-mail, vous recevrez un lien pour réinitialiser votre mot de passe.",
            });
        } finally {
            setLoading(false);
        }
    };
    
    return (
        <AlertDialog open={isOpen} onOpenChange={setIsOpen}>
            <AlertDialogTrigger asChild>
                <Button variant="link" className="px-0 h-auto text-xs text-muted-foreground">Mot de passe oublié ?</Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Réinitialiser votre mot de passe</AlertDialogTitle>
                    <AlertDialogDescription>
                        Entrez votre adresse e-mail ci-dessous. Si un compte est associé, nous vous enverrons un lien pour réinitialiser votre mot de passe.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <div className="py-4">
                    <Label htmlFor="reset-email" className="sr-only">Email</Label>
                    <Input
                        id="reset-email"
                        type="email"
                        placeholder="vous@example.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                    />
                </div>
                <AlertDialogFooter>
                    <AlertDialogCancel>Annuler</AlertDialogCancel>
                    <Button onClick={handlePasswordReset} disabled={loading}>
                        {loading ? "Envoi..." : "Envoyer le lien de réinitialisation"}
                    </Button>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    )
}

export default function LoginClientPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);

  const auth = useAuth();
  const firestore = useFirestore();
  const { user, isUserLoading } = useUser();
  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    // This effect can still be useful to redirect already logged-in users
    // who land on this page by mistake.
    if (!isUserLoading && user) {
      router.push('/');
    }
  }, [user, isUserLoading, router]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth) return;
    setLoading(true);

    try {
      await signInWithEmailAndPassword(
        auth,
        email,
        password
      );
      // Redirect immediately on success
      router.push('/');
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Échec de la connexion',
        description:
          'Email ou mot de passe incorrect. Veuillez vérifier vos informations.',
      });
      setLoading(false); // Only set loading to false on error
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth || !firestore) return;
    if (password.length < 6) {
        toast({
            variant: "destructive",
            title: "Mot de passe faible",
            description: "Le mot de passe doit contenir au moins 6 caractères.",
        });
        return;
    }
    if (!phone) {
        toast({
            variant: "destructive",
            title: "Champ Requis",
            description: "Veuillez entrer votre numéro de téléphone.",
        });
        return;
    }
    setLoading(true);

    try {
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        email,
        password
      );
      const newUser = userCredential.user;

      // Create client document in Firestore
      const clientRef = doc(firestore, 'clients', newUser.uid);
      await setDoc(clientRef, {
        id: newUser.uid,
        name: name,
        email: email,
        phone: phone,
        memberSince: new Date().toISOString().split('T')[0],
        subscriptionTier: 'Basic',
        subscriptionHours: 0,
        bonusHours: 0,
        usageData: 'New client registration.',
      });

      toast({
        title: 'Compte créé',
        description: 'Bienvenue ! Vous allez être redirigé.',
      });
      // Redirect immediately on success
      router.push('/');
    } catch (error: any) {
        let description = "Une erreur inattendue est survenue.";
        if (error.code === 'auth/email-already-in-use') {
            description = "Cette adresse e-mail est déjà utilisée par un autre compte.";
        }
        toast({
            variant: "destructive",
            title: "Échec de l'inscription",
            description: description,
        });
        setLoading(false); // Only set loading to false on error
    }
  };

  if (isUserLoading || user) { // Also show loading if user object exists, because we're about to redirect
    return (
      <div className="flex h-screen w-full flex-col items-center justify-center bg-muted/40">
        <Logo className="h-12 w-auto animate-pulse" />
        <p className="mt-4 text-muted-foreground">Vérification...</p>
      </div>
    );
  }


  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-muted/40 p-4">
      <div className="mb-8 text-center">
        <Link href="/" className="inline-block">
          <Logo className="h-12 w-auto" />
        </Link>
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
                <CardTitle className="text-2xl font-headline">
                  Connexion Client
                </CardTitle>
                <CardDescription>
                  Accédez à votre espace pour réserver et suivre vos bonus.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email-login">Email</Label>
                  <Input
                    id="email-login"
                    type="email"
                    placeholder="vous@example.com"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                    <div className="flex items-center justify-between">
                        <Label htmlFor="password-login">Mot de passe</Label>
                        <ForgotPasswordDialog />
                    </div>
                  <Input
                    id="password-login"
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
                    <Link href="/login">Accès Admin</Link>
                </Button>
                <Button variant="outline" className="w-full" asChild>
                    <Link href="/">Revenir à l'accueil</Link>
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
                  Créer un compte
                </CardTitle>
                <CardDescription>
                  Rejoignez la communauté Warriors Gaming en quelques secondes.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name-signup">Nom complet</Label>
                  <Input
                    id="name-signup"
                    type="text"
                    placeholder="John Doe"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email-signup">Email</Label>
                  <Input
                    id="email-signup"
                    type="email"
                    placeholder="vous@example.com"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
                 <div className="space-y-2">
                  <Label htmlFor="phone-signup">Téléphone</Label>
                  <Input
                    id="phone-signup"
                    type="tel"
                    placeholder="06 12 34 56 78"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password-signup">Mot de passe</Label>
                  <Input
                    id="password-signup"
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="6+ caractères"
                  />
                </div>
              </CardContent>
              <CardFooter className="flex flex-col gap-2">
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? "Création du compte..." : "S'inscrire"}
                </Button>
                 <Button variant="outline" className="w-full" asChild>
                    <Link href="/">Revenir à l'accueil</Link>
                </Button>
              </CardFooter>
            </form>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
