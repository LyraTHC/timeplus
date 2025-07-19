
"use client";

import { useRouter } from 'next/navigation';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Skeleton } from '@/components/ui/skeleton';

type Patient = {
  id: string;
  name: string;
  avatarUrl?: string;
  lastSession: string;
};

export default function PacientesPage() {
  const router = useRouter();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    const fetchPatients = async () => {
      if (!user?.uid || !db) {
        setLoading(false);
        setPatients([]);
        return;
      }

      setLoading(true);
      try {
          const sessionsCollection = collection(db, "sessions");
          const q = query(
            sessionsCollection,
            where("psychologistId", "==", user.uid),
            orderBy("sessionTimestamp", "desc")
          );
          const querySnapshot = await getDocs(q);
          
          const patientsMap = new Map<string, Patient>();
          const userPromises = [];

          for (const sessionDoc of querySnapshot.docs) {
              const data = sessionDoc.data();
              if (!patientsMap.has(data.patientId)) {
                  const patientPromise = getDocs(query(collection(db, 'users'), where('uid', '==', data.patientId))).then(userSnap => {
                      const patientData = userSnap.docs[0]?.data();
                      patientsMap.set(data.patientId, {
                          id: data.patientId,
                          name: data.patientName,
                          avatarUrl: patientData?.avatarUrl,
                          lastSession: format(data.sessionTimestamp.toDate(), "d 'de' MMMM, yyyy", { locale: ptBR }),
                      });
                  });
                  userPromises.push(patientPromise);
              }
          }
          await Promise.all(userPromises);
  
          setPatients(Array.from(patientsMap.values()));

      } catch(error) {
          console.error("Error fetching patients list:", error);
      } finally {
          setLoading(false);
      }
    };

    fetchPatients();
  }, [user?.uid]);


  const handleRowClick = (patientId: string) => {
    router.push(`/dashboard-psychologist/pacientes/${patientId}`);
  };

  const renderTableContent = () => {
    if (loading) {
      return [...Array(4)].map((_, i) => (
        <TableRow key={i}>
          <TableCell>
            <div className="flex items-center gap-3">
              <Skeleton className="h-10 w-10 rounded-full" />
              <Skeleton className="h-5 w-32" />
            </div>
          </TableCell>
          <TableCell><Skeleton className="h-5 w-40" /></TableCell>
        </TableRow>
      ));
    }

    if (patients.length === 0) {
      return (
        <TableRow>
          <TableCell colSpan={2} className="h-24 text-center">
            Você ainda não possui pacientes.
          </TableCell>
        </TableRow>
      );
    }
    
    return patients.map(p => (
        <TableRow key={p.id} onClick={() => handleRowClick(p.id)} className="cursor-pointer">
            <TableCell>
                <div className="flex items-center gap-3">
                    <Avatar>
                        <AvatarImage src={p.avatarUrl || `https://placehold.co/40x40.png`} data-ai-hint="person face" />
                        <AvatarFallback>{p.name.substring(0,2).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <span className="font-medium">{p.name}</span>
                </div>
            </TableCell>
            <TableCell>{p.lastSession}</TableCell>
        </TableRow>
    ));
  };


  return (
    <div className="grid gap-6">
      <div className="flex items-center">
        <h1 className="text-lg font-semibold md:text-2xl">Meus Pacientes</h1>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Lista de Pacientes</CardTitle>
          <CardDescription>
            Gerencie as informações e o histórico de seus pacientes.
          </CardDescription>
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
                {renderTableContent()}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
