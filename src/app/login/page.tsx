'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth, useUser, useFirestore } from '@/firebase';
import { signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
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

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const auth = useAuth();
  const firestore = useFirestore();
  const { user, isUserLoading } = useUser();
  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    // This effect redirects an already logged-in admin to the dashboard.
    // It should not interfere with the login process itself.
    if (!isUserLoading && user) {
        const checkAdminAndRedirect = async () => {
            if (!firestore) return;
            const adminRef = doc(firestore, 'admins', user.uid);
            const adminDoc = await getDoc(adminRef);
            if (adminDoc.exists()) {
                router.push('/admin');
            }
        };
        checkAdminAndRedirect();
    }
  }, [user, isUserLoading, router, firestore]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth || !firestore) return;
    setLoading(true);
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const loggedInUser = userCredential.user;

      // Check if user is an admin
      const adminRef = doc(firestore, 'admins', loggedInUser.uid);
      const adminDoc = await getDoc(adminRef);

      if (adminDoc.exists()) {
        // It's an admin, redirect to dashboard.
        // The useEffect above will also catch this, but a direct push is more immediate.
        router.push('/admin');
      } else {
        // Not an admin. Show error and sign out.
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
  
  if (isUserLoading || user) {
    // While checking auth or if user is already logged in, show a loading state
    // to prevent the login form from flashing. The useEffect will handle redirection.
    return (
      <div className="flex h-screen w-full flex-col items-center justify-center bg-muted/40">
        <Logo className="h-12 w-auto animate-pulse" />
        <p className="mt-4 text-muted-foreground">Vérification...</p>
      </div>
    );
  }


  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-muted/40">
      <div className="mb-8">
        <Logo className="h-12 w-auto" />
      </div>
      <Card className="w-full max-w-sm">
        <form onSubmit={handleLogin}>
          <CardHeader>
            <CardTitle className="text-2xl font-headline">Admin Login</CardTitle>
            <CardDescription>
              Enter your email below to login to your account.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="m@example.com"
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
              {loading ? 'Signing In...' : 'Sign in'}
            </Button>
            <Button variant="outline" className="w-full" asChild>
              <Link href="/">Go to Home</Link>
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
