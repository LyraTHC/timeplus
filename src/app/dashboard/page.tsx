
"use client";

import { useState, useEffect } from "react";
import { ArrowUpRight, Video, Star, Loader2, AlertCircle } from "lucide-react";
import Link from "next/link";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
} from "@/components/ui/alert-dialog"
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { db, isFirebaseConfigured } from "@/lib/firebase";
import { collection, query, where, getDocs, orderBy, doc, updateDoc } from "firebase/firestore";
import { ptBR } from 'date-fns/locale';
import { format, isAfter, addMinutes, subMinutes, isBefore } from 'date-fns';
import { Skeleton } from "@/components/ui/skeleton";

type Session = {
  id: string;
  psychologist: string;
  psychologistId: string;
  dateTime: Date;
  status: 'Concluída' | 'Agendada' | 'Cancelada' | 'Pago';
  reviewed: boolean;
};

type UpcomingSession = {
  id: string;
  psychologist: string;
  psychologistId: string;
  psychologistAvatar: string;
  psychologistSpecialty: string;
  dateTime: Date;
  status: 'Concluída' | 'Agendada' | 'Cancelada' | 'Pago';
};

const isSessionTime = (dateTime: Date) => {
    const now = new Date();
    // Allow entering 5 minutes before the session starts
    const sessionStart = subMinutes(dateTime, 5); 
    const sessionEnd = addMinutes(dateTime, 59); // Session lasts 59 minutes
    return isAfter(now, sessionStart) && isBefore(now, sessionEnd);
};

export default function Dashboard() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [upcomingSessions, setUpcomingSessions] = useState<UpcomingSession[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [loadingUpcoming, setLoadingUpcoming] = useState(true);

  // Review Dialog State
  const [openReviewDialog, setOpenReviewDialog] = useState(false);
  const [selectedSession, setSelectedSession] = useState<Session | null>(null);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  
  // Cancel Dialog State
  const [isCanceling, setIsCanceling] = useState<string | null>(null);

  // Time-based state for button enabling
  const [now, setNow] = useState(new Date());
  
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    const timer = setInterval(() => {
      setNow(new Date());
    }, 60000); // Update every minute
    return () => clearInterval(timer);
  }, []);

  const fetchSessions = async () => {
    if (!isFirebaseConfigured || !db || !user?.uid) {
      setLoadingHistory(false);
      setLoadingUpcoming(false);
      return;
    }

    setLoadingHistory(true);
    setLoadingUpcoming(true);
    try {
      const sessionsCollection = collection(db, "sessions");
      const q = query(
        sessionsCollection,
        where("participantIds", "array-contains", user.uid),
        orderBy("sessionTimestamp", "desc")
      );
      const querySnapshot = await getDocs(q);
      const currentDate = new Date();
      
      const upcomingFetchedSessions: UpcomingSession[] = [];
      const pastFetchedSessions: Session[] = [];

      for (const docSnap of querySnapshot.docs) {
        try {
          const sessionData = docSnap.data();

          if (sessionData.sessionTimestamp && typeof sessionData.sessionTimestamp.toDate === 'function' && sessionData.psychologistId && sessionData.psychologistName) {
              const sessionTimestamp = sessionData.sessionTimestamp.toDate();
              const sessionEnd = addMinutes(sessionTimestamp, 59);
              const status = sessionData.status || 'Agendada';
              const isUpcoming = isAfter(sessionEnd, currentDate) && !['Concluída', 'Cancelada'].includes(status);
              
              if (isUpcoming) {
                  upcomingFetchedSessions.push({
                      id: docSnap.id,
                      psychologist: sessionData.psychologistName,
                      psychologistId: sessionData.psychologistId,
                      psychologistAvatar: `https://placehold.co/40x40.png`,
                      psychologistSpecialty: sessionData.specialty || 'Psicoterapia',
                      dateTime: sessionTimestamp,
                      status: status,
                  });
              } else {
                  pastFetchedSessions.push({
                      id: docSnap.id,
                      psychologist: sessionData.psychologistName,
                      psychologistId: sessionData.psychologistId,
                      dateTime: sessionTimestamp,
                      status: status,
                      reviewed: sessionData.reviewed || false,
                  });
              }
          } else {
              console.warn(`Skipping session ${docSnap.id} due to missing or invalid data (patient dashboard).`);
          }
        } catch (docError) {
          console.error(`Failed to process session document ${docSnap.id}:`, docError);
        }
      }
      
      // Sort upcoming sessions ascending (oldest next)
      upcomingFetchedSessions.sort((a,b) => a.dateTime.getTime() - b.dateTime.getTime());

      setUpcomingSessions(upcomingFetchedSessions);
      setSessions(pastFetchedSessions); // Already sorted descending by query

    } catch (error) {
      console.error("Error fetching sessions:", error);
      toast({
        variant: "destructive",
        title: "Erro ao carregar sessões",
        description: "Não foi possível buscar seu histórico de sessões.",
      });
    } finally {
      setLoadingHistory(false);
      setLoadingUpcoming(false);
    }
  };


  useEffect(() => {
    if (user?.uid && isFirebaseConfigured && db) {
      fetchSessions();
    } else if (!isFirebaseConfigured || !db) {
        setLoadingHistory(false);
        setLoadingUpcoming(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.uid]);

  const handleOpenReviewDialog = (session: Session) => {
    setSelectedSession(session);
    setRating(0);
    setComment("");
    setOpenReviewDialog(true);
  }

  const handleReviewSubmit = async () => {
    if (!selectedSession || !db) return;
    if (rating === 0) {
      toast({
        variant: "destructive",
        title: "Avaliação Incompleta",
        description: "Por favor, selecione uma nota de 1 a 5 estrelas.",
      });
      return;
    }

    if (isFirebaseConfigured && db) {
      try {
        const sessionRef = doc(db, 'sessions', selectedSession.id);
        await updateDoc(sessionRef, {
            reviewed: true,
            rating: rating,
            reviewComment: comment,
        });
      } catch (error) {
        console.error("Error updating session review:", error);
        toast({
            variant: "destructive",
            title: "Erro ao Enviar Avaliação",
            description: "Não foi possível salvar sua avaliação. Tente novamente.",
        });
        return;
      }
    }
    
    toast({
        title: "Avaliação Enviada!",
        description: "Obrigado pelo seu feedback. Ele ajuda outros pacientes a tomar decisões."
    });
    
    setSessions(sessions.map(s => s.id === selectedSession.id ? { ...s, reviewed: true } : s));

    setOpenReviewDialog(false);
    setSelectedSession(null);
  };

  const handleCancelSession = async (sessionId: string) => {
    if (!isFirebaseConfigured || !db) return;
    
    setIsCanceling(sessionId);
    try {
        const sessionRef = doc(db, 'sessions', sessionId);
        await updateDoc(sessionRef, { status: 'Cancelada' });
        toast({
            title: "Sessão Cancelada",
            description: "Sua sessão foi cancelada. O reembolso será processado, se aplicável."
        });
        // Refresh all data
        await fetchSessions();
    } catch(error) {
        console.error("Error canceling session:", error);
        toast({
            variant: "destructive",
            title: "Erro ao Cancelar",
            description: "Não foi possível cancelar a sessão. Tente novamente."
        });
    } finally {
        setIsCanceling(null);
    }
  };

  return (
    <>
      <div className="flex items-center">
        <h1 className="text-lg font-semibold md:text-2xl">Painel do Paciente</h1>
      </div>
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-2">
        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center">
            <div className="grid gap-2">
              <CardTitle>Próximas Sessões</CardTitle>
              <CardDescription>
                Suas próximas sessões de terapia agendadas.
              </CardDescription>
            </div>
            <Button asChild size="sm" className="ml-auto gap-1">
              <Link href="/dashboard/psychologists">
                Agendar Mais
                <ArrowUpRight className="h-4 w-4" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent className="grid gap-8">
            {loadingUpcoming ? (
              [...Array(2)].map((_, i) => (
                <div key={i} className="flex items-center justify-between space-x-4">
                  <div className="flex items-center space-x-4">
                    <Skeleton className="h-10 w-10 rounded-full" />
                    <div>
                      <Skeleton className="h-4 w-32 mb-1" />
                      <Skeleton className="h-3 w-24" />
                    </div>
                  </div>
                  <div className="text-right">
                    <Skeleton className="h-4 w-16 mb-2" />
                    <Skeleton className="h-9 w-36" />
                  </div>
                </div>
              ))
            ) : upcomingSessions.length > 0 ? (
              upcomingSessions.map(session => {
                const canEnter = isSessionTime(session.dateTime);
                const isConfirmed = ['Pago', 'Agendada'].includes(session.status);
                return (
                    <div key={session.id} className="flex items-center justify-between space-x-4">
                      <div className="flex items-center space-x-4">
                          <Avatar>
                          <AvatarImage src={session.psychologistAvatar} data-ai-hint="psychologist face" />
                          <AvatarFallback>{session.psychologist.substring(0, 2).toUpperCase()}</AvatarFallback>
                          </Avatar>
                          <div>
                          <p className="text-sm font-medium leading-none">
                              {session.psychologist}
                          </p>
                          <p className="text-sm text-muted-foreground">{session.psychologistSpecialty || 'Psicoterapia'}</p>
                          </div>
                      </div>
                      <div className="flex flex-col items-end text-right gap-2">
                          <div>
                            <p className="text-sm font-medium leading-none">{format(session.dateTime, "d 'de' MMMM", { locale: ptBR })}</p>
                            <p className="text-sm text-muted-foreground">{format(session.dateTime, "HH:mm")}</p>
                          </div>
                          
                          {isConfirmed ? (
                            <>
                              <div className="flex gap-2">
                                  <AlertDialog>
                                      <AlertDialogTrigger asChild>
                                          <Button variant="outline" size="sm" disabled={isCanceling === session.id}>
                                          {isCanceling === session.id ? <Loader2 className="h-4 w-4 animate-spin"/> : "Cancelar"}
                                          </Button>
                                      </AlertDialogTrigger>
                                      <AlertDialogContent>
                                          <AlertDialogHeader>
                                              <AlertDialogTitle>Confirmar Cancelamento</AlertDialogTitle>
                                              <AlertDialogDescription>
                                                  Tem certeza que deseja cancelar esta sessão? A política de reembolso se aplica. O psicólogo será notificado.
                                              </AlertDialogDescription>
                                          </AlertDialogHeader>
                                          <AlertDialogFooter>
                                              <AlertDialogCancel>Voltar</AlertDialogCancel>
                                              <AlertDialogAction onClick={() => handleCancelSession(session.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                                                  Confirmar Cancelamento
                                              </AlertDialogAction>
                                          </AlertDialogFooter>
                                      </AlertDialogContent>
                                  </AlertDialog>
                                  <Button asChild size="sm" className="gap-2" disabled={!canEnter}>
                                    <Link href={`/dashboard/session/${session.id}`}>
                                        <Video className="h-4 w-4" />
                                        {canEnter ? 'Entrar' : 'Aguarde'}
                                    </Link>
                                  </Button>
                              </div>
                              <Badge variant={canEnter ? "default" : "secondary"}>
                                  {canEnter ? 'Sessão em andamento' : 'Aguardando'}
                              </Badge>
                            </>
                          ) : (
                             <Badge variant="outline">{session.status}</Badge>
                          )}
                      </div>
                    </div>
                )
              })
            ) : (
              <div className="text-center text-muted-foreground text-sm py-8">
                Você não possui nenhuma sessão agendada.
              </div>
            )}
          </CardContent>
        </Card>
        <Card className="hover:shadow-md transition-shadow">
          <CardHeader>
            <CardTitle>Histórico de Sessões</CardTitle>
            <CardDescription>
              Um registro de suas sessões de terapia passadas.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loadingHistory ? (
              <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Psicólogo(a)</TableHead>
                        <TableHead>Data</TableHead>
                        <TableHead>Hora</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Avaliação</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {[...Array(3)].map((_, i) => (
                        <TableRow key={i}>
                            <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                            <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                            <TableCell><Skeleton className="h-4 w-12" /></TableCell>
                            <TableCell><Skeleton className="h-6 w-20 rounded-full" /></TableCell>
                            <TableCell className="text-right"><Skeleton className="h-8 w-20 ml-auto" /></TableCell>
                        </TableRow>
                    ))}
                </TableBody>
              </Table>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Psicólogo(a)</TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead>Hora</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Avaliação</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sessions.length > 0 ? sessions.map(session => (
                      <TableRow key={session.id}>
                      <TableCell>
                          <div className="font-medium">{session.psychologist}</div>
                      </TableCell>
                      <TableCell>{format(session.dateTime, "d 'de' MMMM, yyyy", { locale: ptBR })}</TableCell>
                      <TableCell>{format(session.dateTime, "HH:mm")}</TableCell>
                      <TableCell>
                          <Badge variant={session.status === 'Cancelada' ? 'destructive' : session.status === 'Pago' || session.status === 'Agendada' || session.status === 'Concluída' ? 'outline' : 'secondary'}>{session.status}</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                          {session.status === 'Concluída' && !session.reviewed ? (
                               <Button variant="outline" size="sm" onClick={() => handleOpenReviewDialog(session)}>Avaliar</Button>
                          ) : session.reviewed ? (
                              <span className="text-sm text-muted-foreground flex items-center justify-end gap-1">
                                  <Star className="w-4 h-4 text-primary fill-primary"/> Avaliada
                              </span>
                          ) : null}
                      </TableCell>
                      </TableRow>
                  )) : (
                     <TableRow>
                        <TableCell colSpan={5} className="h-24 text-center">
                            Você ainda não possui sessões no seu histórico.
                        </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

       <Dialog open={openReviewDialog} onOpenChange={setOpenReviewDialog}>
          <DialogContent>
              <DialogHeader>
                  <DialogTitle>Avalie sua sessão com {selectedSession?.psychologist}</DialogTitle>
                  <DialogDescription>
                      Sua avaliação é anônima e ajuda outros pacientes a encontrar o profissional certo.
                  </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                      <Label>Sua Nota</Label>
                      <div className="flex items-center gap-1">
                          {[...Array(5)].map((_, i) => (
                              <button key={i} onClick={() => setRating(i + 1)}>
                                  <Star className={`w-6 h-6 transition-colors ${i < rating ? 'text-primary fill-primary' : 'text-muted-foreground hover:text-muted-foreground/80'}`}/>
                              </button>
                          ))}
                      </div>
                  </div>
                  <div className="grid gap-2">
                      <Label htmlFor="comment">Seu Comentário (opcional)</Label>
                      <Textarea id="comment" value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Descreva sua experiência..."/>
                  </div>
              </div>
              <DialogFooter>
                  <Button variant="outline" onClick={() => setOpenReviewDialog(false)}>Cancelar</Button>
                  <Button onClick={handleReviewSubmit}>Enviar Avaliação</Button>
              </DialogFooter>
          </DialogContent>
        </Dialog>
    </>
  );
}
