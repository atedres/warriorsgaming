
"use client";

import { useState } from "react";
import { MoreHorizontal, PlusCircle } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useCollection, useFirestore } from "@/firebase";
import { collection, doc, query } from "firebase/firestore";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
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
import type { Game, Station } from "@/app/lib/data";
import { useToast } from "@/hooks/use-toast";
import { deleteDocumentNonBlocking, setDocumentNonBlocking } from "@/firebase/non-blocking-updates";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useMemoFirebase } from "@/firebase/provider";
import { ScrollArea } from "@/components/ui/scroll-area";


const stationFormSchema = z.object({
  id: z.string().min(1, { message: "Station ID cannot be empty." }),
  type: z.enum(["PC", "PS5", "PS5 VIP", "VR Simulator"]),
  status: z.enum(["available", "in use", "maintenance"]),
  games: z.array(z.string()).optional(),
});

type StationFormValues = z.infer<typeof stationFormSchema>;

type StationActionsProps =
  | {
      mode: "add";
      station?: never;
    }
  | {
      mode: "actions";
      station: Station;
    };

function StationForm({
  isEditing,
  station,
  onFormSubmit,
  isSubmitting,
  onClose,
}: {
  isEditing: boolean;
  station?: Station;
  onFormSubmit: (data: StationFormValues) => void;
  isSubmitting: boolean;
  onClose: () => void;
}) {
  const form = useForm<StationFormValues>({
    resolver: zodResolver(stationFormSchema),
    defaultValues: station
      ? { ...station }
      : {
          id: "",
          type: "PC",
          status: "available",
          games: [],
        },
  });

  const firestore = useFirestore();
  const gamesQuery = useMemoFirebase(
      () => (firestore ? query(collection(firestore, 'games')) : null),
      [firestore]
  );
  const { data: availableGames, isLoading: isLoadingGames } = useCollection<Game>(gamesQuery);

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onFormSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="id"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Station ID</FormLabel>
              <FormControl>
                <Input placeholder="PC-01" {...field} disabled={isEditing} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="type"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Station Type</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a station type" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="PC">PC</SelectItem>
                  <SelectItem value="PS5">PS5</SelectItem>
                  <SelectItem value="PS5 VIP">PS5 VIP</SelectItem>
                  <SelectItem value="VR Simulator">VR Simulator</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="status"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Status</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="available">Available</SelectItem>
                  <SelectItem value="in use">In Use</SelectItem>
                  <SelectItem value="maintenance">Maintenance</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="games"
          render={() => (
            <FormItem>
              <div className="mb-4">
                <FormLabel className="text-base">Available Games</FormLabel>
              </div>
              <ScrollArea className="h-40 rounded-md border p-4">
                {isLoadingGames && <p>Loading games...</p>}
                {availableGames?.map((game) => (
                  <FormField
                    key={game.id}
                    control={form.control}
                    name="games"
                    render={({ field }) => {
                      return (
                        <FormItem
                          key={game.id}
                          className="flex flex-row items-start space-x-3 space-y-0"
                        >
                          <FormControl>
                            <Checkbox
                              checked={field.value?.includes(game.id)}
                              onCheckedChange={(checked) => {
                                return checked
                                  ? field.onChange([...(field.value || []), game.id])
                                  : field.onChange(
                                      field.value?.filter(
                                        (value) => value !== game.id
                                      )
                                    )
                              }}
                            />
                          </FormControl>
                          <FormLabel className="font-normal">
                            {game.id}
                          </FormLabel>
                        </FormItem>
                      )
                    }}
                  />
                ))}
              </ScrollArea>
              <FormMessage />
            </FormItem>
          )}
        />
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Saving..." : isEditing ? "Save Changes" : "Add Station"}
          </Button>
        </DialogFooter>
      </form>
    </Form>
  );
}

export function StationActions({ mode, station }: StationActionsProps) {
  const [isDialogOpen, setDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const firestore = useFirestore();
  const { toast } = useToast();

  const handleFormSubmit = async (data: StationFormValues) => {
    if (!firestore) return;
    setIsSubmitting(true);
    
    try {
      const stationRef = doc(firestore, 'stations', data.id);
      
      const stationData = {
        ...data,
      };

      if (mode === "add") {
        setDocumentNonBlocking(stationRef, stationData, { merge: false });
        toast({ title: "Station created", description: `Station ${data.id} has been added.` });
      } else if (mode === "actions" && station) {
        setDocumentNonBlocking(stationRef, stationData, { merge: true });
        toast({ title: "Station updated", description: `Station ${station.id} has been updated.` });
      }
      setDialogOpen(false);
    } catch (error) {
      console.error("Error submitting form:", error);
      toast({ variant: "destructive", title: "Error", description: "Something went wrong." });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const handleDelete = () => {
    if(!firestore || !station) return;
    const stationRef = doc(firestore, 'stations', station.id);
    deleteDocumentNonBlocking(stationRef);
    toast({
        title: 'Station Deleted',
        description: `Station ${station.id} has been removed.`,
        variant: 'destructive'
    })
  }
  
  if (mode === "add") {
    return (
      <Dialog open={isDialogOpen} onOpenChange={setDialogOpen}>
        <DialogTrigger asChild>
          <Button size="sm" className="h-8 gap-1">
            <PlusCircle className="h-3.5 w-3.5" />
            <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">
              Add Station
            </span>
          </Button>
        </DialogTrigger>
        <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Station</DialogTitle>
              <DialogDescription>
                Enter the station details to add it to the system.
              </DialogDescription>
            </DialogHeader>
            <StationForm isEditing={false} onFormSubmit={handleFormSubmit} isSubmitting={isSubmitting} onClose={() => setDialogOpen(false)} />
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <>
      <Dialog open={isDialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Station</DialogTitle>
              <DialogDescription>
                {`Editing station ${station.id}.`}
              </DialogDescription>
            </DialogHeader>
            <StationForm isEditing={true} station={station} onFormSubmit={handleFormSubmit} isSubmitting={isSubmitting} onClose={() => setDialogOpen(false)} />
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
          <DropdownMenuItem onSelect={() => setDialogOpen(true)}>
            Edit
          </DropdownMenuItem>
          <DropdownMenuItem className="text-red-500" onSelect={handleDelete}>Delete</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  );
}

    
