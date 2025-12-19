
"use client";

import { useState } from "react";
import Image from "next/image";
import { MoreHorizontal, PlusCircle, QrCode, FilePenLine, History, Clock } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useCollection, useFirestore } from "@/firebase";
import { collection, doc, orderBy, query } from "firebase/firestore";
import { format } from 'date-fns';

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import type { Client, ClientHistoryLog } from "@/app/lib/data";
import { useToast } from "@/hooks/use-toast";
import { addDocumentNonBlocking, deleteDocumentNonBlocking, setDocumentNonBlocking, updateDocumentNonBlocking } from "@/firebase/non-blocking-updates";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useMemoFirebase } from "@/firebase/provider";


const clientFormSchema = z.object({
  name: z.string().min(2, { message: "Name must be at least 2 characters." }),
  email: z.string().email({ message: "Please enter a valid email." }),
  phone: z.string().min(10, { message: "Phone number must be at least 10 digits." }),
  subscriptionTier: z.enum(["Basic", "Premium", "VIP"]),
});

type ClientFormValues = z.infer<typeof clientFormSchema>;

type ClientActionsProps =
  | {
      mode: "edit";
      client: Client;
    }
  | {
      mode: "delete";
      client: Client;
    };


function ClientForm({ client, onFormSubmit, isSubmitting }: { client?: Client, onFormSubmit: (data: ClientFormValues) => void, isSubmitting: boolean }) {
  const form = useForm<ClientFormValues>({
    resolver: zodResolver(clientFormSchema),
    defaultValues: client
      ? {
          name: client.name,
          email: client.email,
          phone: client.phone,
          subscriptionTier: client.subscriptionTier,
        }
      : {
          name: "",
          email: "",
          phone: "",
          subscriptionTier: "Basic",
        },
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onFormSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Name</FormLabel>
              <FormControl>
                <Input placeholder="John Doe" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input placeholder="john@example.com" {...field} disabled={!!client} />
              </FormControl>
               <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="phone"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Phone</FormLabel>
              <FormControl>
                <Input placeholder="123-456-7890" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
         <FormField
          control={form.control}
          name="subscriptionTier"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Subscription Tier</FormLabel>
               <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a subscription tier" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="Basic">Basic</SelectItem>
                  <SelectItem value="Premium">Premium</SelectItem>
                  <SelectItem value="VIP">VIP</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        <DialogFooter>
          <DialogClose asChild>
              <Button variant="outline">Cancel</Button>
          </DialogClose>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Saving..." : "Save Changes"}
          </Button>
        </DialogFooter>
      </form>
    </Form>
  )
}


export function ClientActions({ mode, client }: ClientActionsProps) {
  const [isEditDialogOpen, setEditDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const firestore = useFirestore();
  const { toast } = useToast();

  const handleFormSubmit = async (data: ClientFormValues) => {
    if (!firestore) return;
    setIsSubmitting(true);
    
    try {
      if (mode === "edit" && client) {
        const clientRef = doc(firestore, "clients", client.id);
        updateDocumentNonBlocking(clientRef, data);
        toast({ title: "Client updated", description: `${data.name}'s profile has been updated.` });
      }
      setEditDialogOpen(false);
    } catch (error) {
      console.error("Error submitting form:", error);
      toast({ variant: "destructive", title: "Error", description: "Something went wrong." });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const handleDelete = () => {
    if(!firestore || !client) return;
    const clientRef = doc(firestore, 'clients', client.id);
    deleteDocumentNonBlocking(clientRef);
    toast({
        title: 'Client Deleted',
        description: `${client.name} has been removed from the database.`,
        variant: 'destructive'
    })
  }
  
  if (mode === "edit") {
     return (
       <Dialog open={isEditDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogTrigger asChild>
          <Button aria-haspopup="true" size="icon" variant="ghost">
            <FilePenLine className="h-4 w-4" />
            <span className="sr-only">Edit client</span>
          </Button>
        </DialogTrigger>
        <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Client</DialogTitle>
              <DialogDescription>
                {`Editing profile for ${client.name}.`}
              </DialogDescription>
            </DialogHeader>
            <ClientForm client={client} onFormSubmit={handleFormSubmit} isSubmitting={isSubmitting} />
        </DialogContent>
      </Dialog>
     )
  }
  
  if (mode === "delete") {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button aria-haspopup="true" size="icon" variant="ghost">
            <MoreHorizontal className="h-4 w-4" />
            <span className="sr-only">Toggle menu</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuLabel>Actions</DropdownMenuLabel>
          <DropdownMenuItem className="text-red-500" onSelect={handleDelete}>Delete</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  return null;
}


export function QrCodeDialog({ client }: { client: Client }) {
  const [isQrDialogOpen, setQrDialogOpen] = useState(false);

  // The client ID is now the Firebase UID
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(
    JSON.stringify({ clientId: client.id, name: client.name })
  )}`;

  const handleWhatsAppShare = () => {
    const message = `Here is the QR code for ${client.name}: ${qrCodeUrl}`;
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
  };

  const handleDownloadQr = () => {
    const link = document.createElement('a');
    link.href = qrCodeUrl;
    link.download = `qrcode-${client.name.replace(/\s+/g, '-')}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <Dialog open={isQrDialogOpen} onOpenChange={setQrDialogOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <QrCode className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
            <DialogTitle>QR Code for {client.name}</DialogTitle>
            <DialogDescription>
              This QR code is unique to {client.name}. Scan it for check-ins and
              rewards.
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-center justify-center p-4">
            <Image src={qrCodeUrl} width={250} height={250} alt={`QR Code for ${client.name}`} className="rounded-lg"/>
          </div>
          <DialogFooter className="sm:justify-center">
              <Button variant="outline" onClick={handleDownloadQr}>Download QR Code</Button>
              <Button onClick={handleWhatsAppShare}>Share via WhatsApp</Button>
          </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}


export function ClientHistoryDialog({ client }: { client: Client }) {
    const [isOpen, setIsOpen] = useState(false);
    const firestore = useFirestore();

    const historyQuery = useMemoFirebase(() => {
        if (!firestore) return null;
        // Client ID is now the UID, which is the document ID
        const historyRef = collection(firestore, 'clients', client.id, 'history');
        return query(historyRef, orderBy('timestamp', 'desc'));
    }, [firestore, client.id]);

    const { data: history, isLoading } = useCollection<ClientHistoryLog>(historyQuery);
    
    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                    <History className="h-4 w-4" />
                </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
                <DialogHeader>
                    <DialogTitle>History for {client.name}</DialogTitle>
                    <DialogDescription>
                        A log of all activities and changes related to this client.
                    </DialogDescription>
                </DialogHeader>
                <ScrollArea className="h-96">
                    <div className="p-4 space-y-4">
                        {isLoading && <p>Loading history...</p>}
                        {!isLoading && history?.length === 0 && <p className="text-muted-foreground text-center">No history found.</p>}
                        {history?.map(log => (
                             <div key={log.id} className="flex items-start gap-4">
                                <div className="bg-muted p-2 rounded-full">
                                    <Clock className="h-5 w-5 text-muted-foreground"/>
                                </div>
                                <div className="flex-1">
                                    <p className="font-medium">{log.description}</p>
                                    <p className="text-sm text-muted-foreground">
                                        {format(new Date(log.timestamp), "d MMM yyyy 'at' HH:mm")}
                                    </p>
                                </div>
                             </div>
                        ))}
                    </div>
                </ScrollArea>
                 <DialogFooter>
                    <Button variant="outline" onClick={() => setIsOpen(false)}>Close</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
