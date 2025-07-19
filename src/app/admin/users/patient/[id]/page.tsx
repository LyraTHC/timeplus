
"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { doc, getDoc, collection, query, where, getDocs, orderBy } from "firebase/firestore";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ArrowLeft, BarChart2, DollarSign, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { db, isFirebaseConfigured } from "@/lib/firebase";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";


type PatientData = {
  id: string;
  name: string;
  email: string;
  avatar: string;
  avatarHint: string;
  status: string;
  memberSince: string;
  stats: {
    totalSessions: number;
    totalSpent: number;
  };
  sessionHistory: {
    id: string;
    date: string;
    psychologist: string;
    value: number;
    status: string;
  }[];
};

const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
}

export default function AdminPatientDetailPage({ params }: { params: { id: string } }) {
  const [patientData, setPatientData] = useState<PatientData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isFirebaseConfigured || !db) {
        setError("Firebase não está configurado. Não é possível carregar os dados do paciente.");
        setLoading(false);
        return;
    }

    const fetchPatientDetails = async () => {
        setLoading(true);
        setError(null);
        try {
            const patientDocRef = doc(db, 'users', params.id);
            const patientDocSnap = await getDoc(patientDocRef);

            if (!patientDocSnap.exists() || patientDocSnap.data().role !== 'Paciente') {
                throw new Error("Paciente não encontrado ou o perfil não é de um paciente.");
            }

            const patientInfo = patientDocSnap.data();

            const sessionsQuery = query(
                collection(db, 'sessions'),
                where('patientId', '==', params.id),
                orderBy('sessionTimestamp', 'desc')
            );
            const sessionsSnapshot = await getDocs(sessionsQuery);

            const sessionHistory = sessionsSnapshot.docs.map(doc => {
                const data = doc.data();
                return {
                    id: doc.id,
                    date: format(data.sessionTimestamp.toDate(), "dd 'de' MMMM, yyyy", { locale: ptBR }),
                    psychologist: data.psychologistName,
                    value: data.rate,
                    status: data.status,
                };
            });

            const totalSpent = sessionHistory.reduce((acc, session) => acc + session.value, 0);

            setPatientData({
                id: patientInfo.uid,
                name: patientInfo.name,
                email: patientInfo.email,
                avatar: "https://placehold.co/128x128.png",
                avatarHint: "man face",
                status: "Ativo", // Mock status
                memberSince: patientInfo.createdAt ? format(patientInfo.createdAt.toDate(), "dd 'de' MMMM, yyyy", { locale: ptBR }) : 'Data indisponível',
                stats: {
                    totalSessions: sessionHistory.length,
                    totalSpent: totalSpent,
                },
                sessionHistory: sessionHistory,
            });

        } catch (err: any) {
            console.error("Error fetching patient details:", err);
            setError(err.message || "Ocorreu um erro ao buscar os dados do paciente.");
        } finally {
            setLoading(false);
        }
    };
    
    fetchPatientDetails();
  }, [params.id]);


  if (loading) {
    return (
        <div className="grid gap-6">
            <div className="flex items-center gap-4">
                <Button variant="outline" size="icon" asChild>
                    <Link href="/admin/users"><ArrowLeft className="h-4 w-4" /></Link>
                </Button>
                <Skeleton className="h-8 w-72" />
            </div>
            <div className="grid md:grid-cols-4 gap-6">
                <div className="md:col-span-1"><Skeleton className="h-[250px] w-full" /></div>
                <div className="md:col-span-3"><Skeleton className="h-[108px] w-full" /></div>
            </div>
            <Skeleton className="h-64 w-full" />
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
          <Link href="/admin/users">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div className="flex items-center gap-4">
            <h1 className="text-lg font-semibold md:text-2xl">
              Perfil do Paciente: {patientData.name}
            </h1>
            <Badge variant={patientData.status === 'Ativo' ? 'default' : 'secondary'}>
                {patientData.status}
            </Badge>
        </div>
      </div>

      <div className="grid md:grid-cols-4 gap-6">
        <div className="md:col-span-1">
          <Card>
            <CardContent className="pt-6 flex flex-col items-center text-center gap-4">
              <Avatar className="h-32 w-32">
                <AvatarImage src={patientData.avatar} data-ai-hint={patientData.avatarHint} />
                <AvatarFallback>{patientData.name.substring(0, 2)}</AvatarFallback>
              </Avatar>
              <div className="grid gap-1">
                <h2 className="text-xl font-bold">{patientData.name}</h2>
                <p className="text-sm text-muted-foreground">{patientData.email}</p>
                <p className="text-xs text-muted-foreground">Membro desde {patientData.memberSince}</p>
              </div>
            </CardContent>
          </Card>
        </div>
        <div className="md:col-span-3">
          <div className="grid md:grid-cols-2 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total de Sessões</CardTitle>
                <BarChart2 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{patientData.stats.totalSessions}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Valor Total Gasto</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(patientData.stats.totalSpent)}</div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Histórico de Sessões</CardTitle>
          <CardDescription>
            Todas as sessões realizadas pelo paciente na plataforma.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead>Psicólogo(a)</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Valor</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {patientData.sessionHistory.length > 0 ? patientData.sessionHistory.map((session) => (
                <TableRow key={session.id}>
                  <TableCell>{session.date}</TableCell>
                  <TableCell>{session.psychologist}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{session.status}</Badge>
                  </TableCell>
                  <TableCell className="text-right">{formatCurrency(session.value)}</TableCell>
                </TableRow>
              )) : (
                <TableRow>
                    <TableCell colSpan={4} className="h-24 text-center">
                        Nenhum histórico de sessão encontrado.
                    </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
