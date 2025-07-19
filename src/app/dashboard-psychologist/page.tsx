
"use client";

import { useState, useEffect } from "react";
import { DollarSign, Users, Calendar, Video, Loader2 } from "lucide-react";
import Link from "next/link";
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
import { useAuth } from "@/hooks/useAuth";
import { db } from "@/lib/firebase";
import { collection, query, where, getDocs, orderBy, doc, updateDoc } from "firebase/firestore";
import { format, isSameMonth, isAfter, addMinutes, isBefore, subMinutes } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";

type Session = {
  id: string;
  patientId: string;
  patientName: string;
  dateTime: Date;
  rate: number;
  status: string;
};

const isSessionTime = (dateTime: Date) => {
    const now = new Date();
    // Allow entering 5 minutes before the session starts
    const sessionStart = subMinutes(dateTime, 5);
    const sessionEnd = addMinutes(dateTime, 59); // Session lasts 59 minutes
    return isAfter(now, sessionStart) && isBefore(now, sessionEnd);
};

export default function DashboardPsychologist() {
  const [stats, setStats] = useState({
    monthlyEarnings: 0,
    totalPatients: 0,
    totalSessions: 0,
    occupancy: 0,
  });
  const [upcomingSessions, setUpcomingSessions] = useState<Session[]>([]);
  const [pastSessions, setPastSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCanceling, setIsCanceling] = useState<string | null>(null);
  const { user } = useAuth();
  const { toast } = useToast();
  
  // Time-based state for button enabling
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setNow(new Date());
    }, 60000); // Update every minute
    return () => clearInterval(timer);
  }, []);

  const fetchDashboardData = async () => {
    if (!db || !user?.uid) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const sessionsQuery = query(
        collection(db, "sessions"),
        where("participantIds", "array-contains", user.uid),
        orderBy("sessionTimestamp", "desc")
      );
      const querySnapshot = await getDocs(sessionsQuery);
      
      const allSessions: Session[] = [];
      querySnapshot.forEach(doc => {
        try {
            const data = doc.data();
            if (
              data.sessionTimestamp &&
              typeof data.sessionTimestamp.toDate === 'function' &&
              data.patientId &&
              data.patientName
            ) {
                allSessions.push({
                  id: doc.id,
                  patientId: data.patientId,
                  patientName: data.patientName,
                  dateTime: data.sessionTimestamp.toDate(),
                  rate: data.rate || 0,
                  status: data.status || 'Agendada',
                });
            } else {
                console.warn(`Skipping session ${doc.id} due to missing or invalid data (psychologist dashboard).`);
            }
        } catch (docError) {
            console.error(`Failed to process session document ${doc.id}:`, docError);
        }
      });

      const currentDate = new Date();
      const upcoming: Session[] = [];
      const past: Session[] = [];
      const monthlyEarningsSessions: Session[] = [];
      const patientIds = new Set<string>();

      for (const session of allSessions) {
        patientIds.add(session.patientId);
        const sessionEnd = addMinutes(session.dateTime, 59);
        const isUpcoming = isAfter(sessionEnd, currentDate) && !['Concluída', 'Cancelada'].includes(session.status);

        if (isUpcoming) {
          upcoming.push(session);
        } else {
          past.push(session);
        }
        
        if (isSameMonth(session.dateTime, currentDate) && session.status === 'Concluída') {
          monthlyEarningsSessions.push(session);
        }
      }
      
      const monthlyEarnings = monthlyEarningsSessions.reduce((acc, s) => acc + (s.rate || 0), 0);
      
      // Sort upcoming sessions ascending
      upcoming.sort((a,b) => a.dateTime.getTime() - b.dateTime.getTime());
      
      setStats({
        monthlyEarnings: monthlyEarnings * 0.85, // Assuming 15% commission
        totalPatients: patientIds.size,
        totalSessions: allSessions.filter(s => s.status === 'Concluída').length,
        occupancy: 0, // Occupancy calculation is complex, leaving as 0
      });

      setUpcomingSessions(upcoming.slice(0, 5));
      setPastSessions(past); // Already sorted by query

    } catch (error) {
      console.error("Error fetching psychologist dashboard data:", error);
       toast({
        variant: "destructive",
        title: "Erro ao carregar sessões",
        description: "Não foi possível buscar os dados do painel.",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user?.uid) {
      fetchDashboardData();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.uid]);

  const handleCancelSession = async (sessionId: string) => {
    if (!db) return;

    setIsCanceling(sessionId);
    try {
        const sessionRef = doc(db, 'sessions', sessionId);
        await updateDoc(sessionRef, { status: 'Cancelada' });
        toast({
            title: "Sessão Cancelada",
            description: "A sessão foi cancelada com sucesso e o horário liberado na sua agenda."
        });
        // Refresh data
        await fetchDashboardData();
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


  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  }

  const StatCard = ({ title, value, description, icon: Icon, loading, isCurrency = false }: any) => (
    <Card className="hover:shadow-md transition-shadow">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{title}</CardTitle>
            <Icon className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
            {loading ? (
                <>
                    <Skeleton className="h-8 w-3/4 mb-2" />
                    <Skeleton className="h-3 w-1/2" />
                </>
            ) : (
                <>
                    <div className="text-2xl font-bold">{isCurrency ? formatCurrency(value) : value}</div>
                    {description && <p className="text-xs text-muted-foreground">{description}</p>}
                </>
            )}
        </CardContent>
    </Card>
  );

  return (
    <>
      <div className="flex items-center">
        <h1 className="text-lg font-semibold md:text-2xl">Painel do Psicólogo</h1>
      </div>
      <div className="grid gap-4 md:grid-cols-2 md:gap-8 lg:grid-cols-4">
        <StatCard title="Ganhos (Este Mês)" value={stats.monthlyEarnings} description="Após comissão de 15%" icon={DollarSign} loading={loading} isCurrency />
        <StatCard title="Total de Pacientes" value={stats.totalPatients} description="Desde o início" icon={Users} loading={loading} />
        <StatCard title="Sessões Realizadas (Total)" value={stats.totalSessions} description="Desde o início" icon={Calendar} loading={loading} />
        <StatCard title="Disponibilidade" value={`${stats.occupancy}%`} description="Ocupação da agenda" icon={Calendar} loading={loading} />
      </div>
      <div className="grid gap-4 md:gap-8 lg:grid-cols-2">
        <Card className="hover:shadow-md transition-shadow">
          <CardHeader>
            <CardTitle>Próximas Sessões</CardTitle>
            <CardDescription>
              Seus próximos agendamentos.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Paciente</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead>Hora</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                    [...Array(3)].map((_,i) => (
                        <TableRow key={i}>
                            <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                            <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                            <TableCell><Skeleton className="h-5 w-12" /></TableCell>
                            <TableCell className="text-right"><Skeleton className="h-9 w-32 ml-auto" /></TableCell>
                        </TableRow>
                    ))
                ) : upcomingSessions.length > 0 ? (
                    upcomingSessions.map(session => {
                      const canEnter = isSessionTime(session.dateTime);
                      const isConfirmed = ['Pago', 'Agendada'].includes(session.status);
                      return (
                        <TableRow key={session.id}>
                            <TableCell>
                                <div className="font-medium">{session.patientName}</div>
                            </TableCell>
                            <TableCell>{format(session.dateTime, "dd/MM/yyyy")}</TableCell>
                            <TableCell>{format(session.dateTime, "HH:mm")}</TableCell>
                            <TableCell className="text-right space-x-2">
                              {isConfirmed ? (
                                <>
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
                                                  Tem certeza que deseja cancelar a sessão com {session.patientName}? Esta ação não pode ser desfeita. O horário ficará vago em sua agenda e o paciente será notificado.
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
                                  <Button asChild size="sm" disabled={!canEnter} className="gap-2">
                                      <Link href={`/dashboard-psychologist/session/${session.id}`}>
                                        <Video className="h-4 w-4" />
                                        {canEnter ? "Entrar" : "Aguarde"}
                                      </Link>
                                  </Button>
                                </>
                              ) : (
                                <Badge variant="outline">{session.status}</Badge>
                              )}
                            </TableCell>
                        </TableRow>
                    )})
                ) : (
                    <TableRow>
                        <TableCell colSpan={4} className="h-24 text-center">
                            Nenhuma sessão futura encontrada.
                        </TableCell>
                    </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
        <Card className="hover:shadow-md transition-shadow">
          <CardHeader>
            <CardTitle>Histórico de Sessões</CardTitle>
            <CardDescription>
              Um registro de suas sessões passadas.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Paciente</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Valor Recebido</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                    [...Array(3)].map((_,i) => (
                        <TableRow key={i}>
                            <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                            <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                            <TableCell><Skeleton className="h-6 w-20 rounded-full" /></TableCell>
                            <TableCell className="text-right"><Skeleton className="h-5 w-16 ml-auto" /></TableCell>
                        </TableRow>
                    ))
                ) : pastSessions.length > 0 ? (
                    pastSessions.map(session => (
                        <TableRow key={session.id}>
                            <TableCell>{session.patientName}</TableCell>
                            <TableCell>{format(session.dateTime, "dd/MM/yyyy")}</TableCell>
                            <TableCell>
                              <Badge variant={session.status === 'Cancelada' ? 'destructive' : 'outline'}>{session.status}</Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              {session.status === 'Concluída' ? formatCurrency(session.rate * 0.85) : '-'}
                            </TableCell>
                        </TableRow>
                    ))
                ) : (
                    <TableRow>
                        <TableCell colSpan={4} className="h-24 text-center">
                            Nenhuma sessão no histórico.
                        </TableCell>
                    </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
