
"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  ArrowLeft,
  Calendar,
  BarChart2,
  CheckCircle,
  NotebookPen,
  AlertCircle,
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { db } from "@/lib/firebase";
import { doc, getDoc, collection, query, where, getDocs, orderBy } from "firebase/firestore";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";


type SessionHistoryItem = {
  id: string;
  date: string;
  topic: string;
  status: string;
  note: string | null;
};

type PatientDetails = {
  id: string;
  name: string;
  email: string;
  avatar: string;
  avatarHint: string;
  stats: {
    totalSessions: number;
    nextSession: string;
    progress: number;
  };
  sessionHistory: SessionHistoryItem[];
};

export default function PatientDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const { user } = useAuth();
  const [patientData, setPatientData] = useState<PatientDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPatientData = useCallback(async () => {
    if (!user || !db) {
        setLoading(false);
        return;
    }
    setLoading(true);
    setError(null);
    try {
      const patientDocRef = doc(db, "users", params.id);
      const patientDocSnap = await getDoc(patientDocRef);

      if (!patientDocSnap.exists() || patientDocSnap.data().role !== 'Paciente') {
        throw new Error("Paciente não encontrado ou o perfil não é de um paciente.");
      }
      const patientInfo = patientDocSnap.data();

      const sessionsCollection = collection(db, "sessions");
      const q = query(
        sessionsCollection,
        where("participantIds", "array-contains", user.uid),
        orderBy("sessionTimestamp", "desc")
      );
      const querySnapshot = await getDocs(q);
      
      const sessionHistory = querySnapshot.docs
        .filter(doc => doc.data().participantIds.includes(params.id))
        .map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            date: format(data.sessionTimestamp.toDate(), "d 'de' MMMM, yyyy", { locale: ptBR }),
            topic: `Sessão de ${format(data.sessionTimestamp.toDate(), "PPP", { locale: ptBR })}`,
            status: data.status,
            note: data.psychologistNote || null,
          } as SessionHistoryItem;
        });

      setPatientData({
        id: patientInfo.uid,
        name: patientInfo.name,
        email: patientInfo.email,
        avatar: "https://placehold.co/128x128.png",
        avatarHint: "man face",
        stats: {
          totalSessions: sessionHistory.length,
          nextSession: "A definir",
          progress: 75,
        },
        sessionHistory,
      });

    } catch (err: any) {
      console.error("Error fetching patient details:", err);
      setError(err.message || "Ocorreu um erro ao buscar os dados do paciente.");
    } finally {
      setLoading(false);
    }
  }, [user, params.id]);

  useEffect(() => {
    fetchPatientData();
  }, [fetchPatientData]);

  if (loading) {
    return (
      <div className="grid gap-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-10" />
          <Skeleton className="h-7 w-64" />
        </div>
        <div className="grid md:grid-cols-4 gap-6">
          <div className="md:col-span-1"><Skeleton className="h-56 w-full" /></div>
          <div className="md:col-span-3 grid md:grid-cols-3 gap-6">
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
          </div>
        </div>
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-1/3" />
            <Skeleton className="h-4 w-1/2" />
          </CardHeader>
          <CardContent className="space-y-4">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
       <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Erro ao Carregar Perfil</AlertTitle>
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  if (!patientData) {
    return (
       <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Perfil Não Encontrado</AlertTitle>
        <AlertDescription>Não foi possível encontrar dados para este paciente.</AlertDescription>
      </Alert>
    );
  }
  
  return (
    <div className="grid gap-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" asChild>
          <Link href="/dashboard-psychologist/pacientes">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <h1 className="text-lg font-semibold md:text-2xl">
          Perfil do Paciente: {patientData.name}
        </h1>
      </div>

      <div className="grid md:grid-cols-4 gap-6">
        <div className="md:col-span-1">
          <Card>
            <CardContent className="pt-6 flex flex-col items-center text-center gap-4">
              <Avatar className="h-32 w-32">
                <AvatarImage
                  src={patientData.avatar}
                  data-ai-hint={patientData.avatarHint}
                />
                <AvatarFallback>
                  {patientData.name.substring(0, 2)}
                </AvatarFallback>
              </Avatar>
              <div className="grid gap-1">
                <h2 className="text-xl font-bold">{patientData.name}</h2>
                <p className="text-sm text-muted-foreground">
                  {patientData.email}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
        <div className="md:col-span-3">
          <div className="grid md:grid-cols-3 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Total de Sessões
                </CardTitle>
                <BarChart2 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {patientData.stats.totalSessions}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Próxima Sessão
                </CardTitle>
                <Calendar className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-lg font-bold">
                  {patientData.stats.nextSession}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Progresso de Metas
                </CardTitle>
                <CheckCircle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {patientData.stats.progress}%
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <NotebookPen className="h-5 w-5" /> Histórico e Anotações de Sessões
          </CardTitle>
          <CardDescription>
            Clique em uma sessão para ver os detalhes e anotações privadas.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {patientData.sessionHistory && patientData.sessionHistory.length > 0 ? (
            <Accordion type="single" collapsible className="w-full">
              {patientData.sessionHistory.map((session) => (
                <AccordionItem value={session.id} key={session.id}>
                  <AccordionTrigger>
                    <div className="flex justify-between items-center w-full pr-4">
                        <div className="text-left">
                            <p className="font-semibold">{session.topic}</p>
                            <p className="text-sm text-muted-foreground">{session.date}</p>
                        </div>
                        <Badge variant="outline">{session.status}</Badge>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground leading-relaxed">
                    {session.note ? session.note : "Nenhuma anotação para esta sessão."}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-4">
              Nenhum histórico de sessão encontrado para este paciente.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
