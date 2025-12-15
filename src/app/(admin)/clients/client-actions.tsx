
"use client";

import { useState } from "react";
import Image from "next/image";
import { MoreHorizontal, PlusCircle, QrCode, FilePenLine } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useFirestore } from "@/firebase";
import { collection, doc } from "firebase/firestore";

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
import type { Client } from "@/app/lib/data";
import { useToast } from "@/hooks/use-toast";
import { addDocumentNonBlocking, deleteDocumentNonBlocking, updateDocumentNonBlocking } from "@/firebase/non-blocking-updates";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const clientFormSchema = z.object({
  name: z.string().min(2, { message: "Name must be at least 2 characters." }),
  email: z.string().email({ message: "Please enter a valid email." }),
  phone: z.string().min(10, { message: "Phone number must be at least 10 digits." }),
  subscriptionTier: z.enum(["Basic", "Premium", "VIP"]),
});

type ClientFormValues = z.infer<typeof clientFormSchema>;

type ClientActionsProps =
  | {
      mode: "add";
      client?: never;
    }
  | {
      mode: "actions";
      client: Client;
    };

// Separate component for the form to manage its own state
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
                <Input placeholder="john@example.com" {...field} />
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
  const [isAddEditDialogOpen, setAddEditDialogOpen] = useState(false);
  const [isQrDialogOpen, setQrDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const firestore = useFirestore();
  const { toast } = useToast();

  const handleFormSubmit = async (data: ClientFormValues) => {
    if (!firestore) return;
    setIsSubmitting(true);
    
    try {
      if (mode === "add") {
        const clientData = {
          ...data,
          memberSince: new Date().toISOString().split("T")[0],
          subscriptionHours: 0,
          usageData: "New client.",
        };
        await addDocumentNonBlocking(collection(firestore, 'clients'), clientData);
        toast({ title: "Client created", description: `${data.name} has been added.` });
      } else if (mode === "actions" && client) {
        const clientRef = doc(firestore, "clients", client.id);
        updateDocumentNonBlocking(clientRef, data);
        toast({ title: "Client updated", description: `${data.name}'s profile has been updated.` });
      }
      setAddEditDialogOpen(false);
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
  
  if (mode === "add") {
    return (
      <Dialog open={isAddEditDialogOpen} onOpenChange={setAddEditDialogOpen}>
        <DialogTrigger asChild>
          <Button size="sm" className="h-8 gap-1">
            <PlusCircle className="h-3.5 w-3.5" />
            <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">
              Add Client
            </span>
          </Button>
        </DialogTrigger>
        <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Client</DialogTitle>
              <DialogDescription>
                Enter the client's details to create their profile.
              </DialogDescription>
            </DialogHeader>
            <ClientForm onFormSubmit={handleFormSubmit} isSubmitting={isSubmitting} />
        </DialogContent>
      </Dialog>
    );
  }

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
  }

  return (
    <>
      <Dialog open={isQrDialogOpen} onOpenChange={setQrDialogOpen}>
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

      <Dialog open={isAddEditDialogOpen} onOpenChange={setAddEditDialogOpen}>
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

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button aria-haspopup="true" size="icon" variant="ghost">
            <MoreHorizontal className="h-4 w-4" />
            <span className="sr-only">Toggle menu</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuLabel>Actions</DropdownMenuLabel>
          <DropdownMenuItem onSelect={() => setQrDialogOpen(true)}>
            <QrCode className="mr-2 h-4 w-4" />
            View QR Code
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => setAddEditDialogOpen(true)}>
            <FilePenLine className="mr-2 h-4 w-4" />
            Edit
          </DropdownMenuItem>
          <DropdownMenuItem className="text-red-500" onSelect={handleDelete}>Delete</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  );
}
