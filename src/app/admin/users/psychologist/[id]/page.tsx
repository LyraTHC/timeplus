
"use client";

import React, { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import { doc, getDoc, collection, query, where, getDocs } from "firebase/firestore";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

import { ArrowLeft, AlertCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { db } from "@/lib/firebase";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";


type PsychologistData = {
    id: string;
    name: string;
    email: string;
    title: string;
    specialties: string[];
    image: string;
    imageHint: string;
    status: string;
    bio: string;
    stats: {
        totalRevenue: number;
        platformFee: number;
        totalSessions: number;
        totalPatients: number;
    };
    recentPatients: { id: string; name: string; lastSession: string; }[];
};


const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
}

export default function AdminPsychologistDetailPage({ params }: { params: { id: string } }) {
  const [psychologistData, setPsychologistData] = useState<PsychologistData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPsychologistDetails = useCallback(async () => {
      if (!db) {
          setError("Firebase não está configurado. Não é possível carregar os dados.");
          setLoading(false);
          return;
      }
      
      setLoading(true);
      setError(null);
      try {
          const psychologistDocRef = doc(db, 'users', params.id);
          const psychologistDocSnap = await getDoc(psychologistDocRef);
          
          if (!psychologistDocSnap.exists() || psychologistDocSnap.data().role !== 'Psicólogo') {
              throw new Error("Psicólogo não encontrado ou perfil inválido.");
          }
          const psychoInfo = psychologistDocSnap.data();

          const sessionsQuery = query(collection(db, 'sessions'), where('psychologistId', '==', params.id));
          const sessionsSnapshot = await getDocs(sessionsQuery);

          const sessionsData = sessionsSnapshot.docs.map(d => d.data());

          const totalRevenue = sessionsData.reduce((acc, s) => acc + (s.rate || 0), 0);
          const uniquePatientIds = new Set(sessionsData.map(s => s.patientId));

          const patientMap = new Map();
          sessionsData.forEach(s => {
              const sessionDate = s.sessionTimestamp.toDate();
              if (!patientMap.has(s.patientId) || sessionDate > patientMap.get(s.patientId).lastSessionDate) {
                  patientMap.set(s.patientId, {
                      id: s.patientId,
                      name: s.patientName,
                      lastSession: format(sessionDate, "dd 'de' MMMM, yyyy", { locale: ptBR }),
                      lastSessionDate: sessionDate
                  });
              }
          });
          const recentPatients = Array.from(patientMap.values()).sort((a,b) => b.lastSessionDate - a.lastSessionDate).slice(0, 5);


          setPsychologistData({
              id: psychoInfo.uid,
              name: psychoInfo.name,
              email: psychoInfo.email,
              title: psychoInfo.professionalProfile?.title || "Psicólogo(a)",
              specialties: psychoInfo.professionalProfile?.specialties || [],
              image: "https://placehold.co/400x400.png",
              imageHint: "woman psychologist",
              status: "Ativo", // Mock status
              bio: psychoInfo.professionalProfile?.bio || "Nenhuma biografia fornecida.",
              stats: {
                  totalRevenue: totalRevenue,
                  platformFee: totalRevenue * 0.15, // Assumes 15% fee
                  totalSessions: sessionsData.length,
                  totalPatients: uniquePatientIds.size,
              },
              recentPatients,
          });

      } catch (err: any) {
          console.error("Error fetching psychologist details:", err);
          setError(err.message || "Ocorreu um erro ao buscar os dados.");
      } finally {
          setLoading(false);
      }
  }, [params.id]);
  
  useEffect(() => {
    fetchPsychologistDetails();
  }, [fetchPsychologistDetails]);


  if (loading) {
    return (
        <div className="grid gap-6">
            <div className="flex items-center gap-4">
                <Button variant="outline" size="icon" asChild>
                    <Link href="/admin/users"><ArrowLeft className="h-4 w-4" /></Link>
                </Button>
                <Skeleton className="h-8 w-80" />
            </div>
            <div className="grid md:grid-cols-3 gap-6">
                <div className="md:col-span-2"><Skeleton className="h-80 w-full" /></div>
                <div className="md:col-span-1"><Skeleton className="h-56 w-full" /></div>
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

  if (!psychologistData) {
      return (
         <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Perfil Não Encontrado</AlertTitle>
            <AlertDescription>Não foi possível encontrar dados para este psicólogo.</AlertDescription>
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
              Perfil do Psicólogo: {psychologistData.name}
            </h1>
            <Badge variant={psychologistData.status === 'Ativo' ? 'default' : 'secondary'}>
                {psychologistData.status}
            </Badge>
        </div>
      </div>
      
      <div className="grid md:grid-cols-3 gap-6">
        <div className="md:col-span-2 grid gap-6">
             <Card>
                <CardHeader className="flex flex-col md:flex-row items-start md:items-center gap-4">
                    <Image
                    alt={psychologistData.name}
                    className="aspect-square rounded-lg object-cover"
                    height="150"
                    src={psychologistData.image}
                    data-ai-hint={psychologistData.imageHint}
                    width="150"
                    />
                    <div className="grid gap-2">
                    <CardTitle className="text-2xl">{psychologistData.name}</CardTitle>
                    <CardDescription>{psychologistData.email}</CardDescription>
                    <p className="text-sm text-muted-foreground">{psychologistData.title}</p>
                    <div className="flex gap-1.5 flex-wrap">
                      {psychologistData.specialties.map(s => <Badge variant="secondary" key={s}>{s}</Badge>)}
                    </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <h3 className="font-semibold mb-2">Biografia</h3>
                    <p className="text-muted-foreground text-sm">{psychologistData.bio}</p>
                </CardContent>
            </Card>
        </div>
        <div className="md:col-span-1 grid gap-6 content-start">
            <Card>
                <CardHeader>
                    <CardTitle>Estatísticas</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex justify-between items-center">
                        <span className="text-muted-foreground">Faturamento Total</span>
                        <span className="font-semibold">{formatCurrency(psychologistData.stats.totalRevenue)}</span>
                    </div>
                     <div className="flex justify-between items-center">
                        <span className="text-muted-foreground">Comissão da Plataforma</span>
                        <span className="font-semibold">{formatCurrency(psychologistData.stats.platformFee)}</span>
                    </div>
                     <div className="flex justify-between items-center">
                        <span className="text-muted-foreground">Sessões Totais</span>
                        <span className="font-semibold">{psychologistData.stats.totalSessions}</span>
                    </div>
                     <div className="flex justify-between items-center">
                        <span className="text-muted-foreground">Pacientes Totais</span>
                        <span className="font-semibold">{psychologistData.stats.totalPatients}</span>
                    </div>
                </CardContent>
            </Card>
        </div>
      </div>

       <Card>
            <CardHeader>
                <CardTitle>Pacientes Recentes</CardTitle>
            </CardHeader>
            <CardContent>
                 <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Nome</TableHead>
                            <TableHead>Última Sessão</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {psychologistData.recentPatients.length > 0 ? psychologistData.recentPatients.map(p => (
                            <TableRow key={p.id}>
                                <TableCell className="font-medium">{p.name}</TableCell>
                                <TableCell>{p.lastSession}</TableCell>
                            </TableRow>
                        )) : (
                            <TableRow>
                                <TableCell colSpan={2} className="h-24 text-center">
                                    Nenhum paciente recente encontrado.
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
