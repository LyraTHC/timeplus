
"use client";

import { useState, useEffect } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
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
import { Skeleton } from "@/components/ui/skeleton";
import { db } from "@/lib/firebase";
import { collection, getDocs, query, orderBy, doc, updateDoc } from "firebase/firestore";
import { Check, X, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

type PayoutRequest = {
  id: string;
  date: string;
  psychologistName: string;
  amount: number;
  status: 'Processando' | 'Pago' | 'Rejeitado';
};

export default function AdminPayoutsPage() {
    const [payouts, setPayouts] = useState<PayoutRequest[]>([]);
    const [loading, setLoading] = useState(true);
    const [updatingId, setUpdatingId] = useState<string | null>(null);
    const { toast } = useToast();
    
    const fetchPayouts = async () => {
        if (!db) {
            setLoading(false);
            return;
        }

        setLoading(true);
        try {
            const payoutsQuery = query(collection(db, 'payouts'), orderBy('requestedAt', 'desc'));
            const payoutsSnapshot = await getDocs(payoutsQuery);
            const payoutsData = payoutsSnapshot.docs.map(doc => {
                const data = doc.data();
                return {
                    id: doc.id,
                    date: format(data.requestedAt.toDate(), "dd 'de' MMMM, yyyy", { locale: ptBR }),
                    psychologistName: data.psychologistName,
                    amount: data.amount,
                    status: data.status,
                };
            }) as PayoutRequest[];
            setPayouts(payoutsData);
        } catch (error) {
            console.error("Error fetching payouts:", error);
            toast({ variant: 'destructive', title: 'Erro', description: 'Não foi possível buscar as solicitações de retirada.' });
        } finally {
            setLoading(false);
        }
    };
    
    useEffect(() => {
        fetchPayouts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const handleUpdateStatus = async (payoutId: string, newStatus: 'Pago' | 'Rejeitado') => {
        if (!db) {
            toast({ variant: 'destructive', title: 'Erro de Configuração', description: 'Firebase não configurado.' });
            setUpdatingId(null);
            return;
        }

        setUpdatingId(payoutId);
        try {
            const payoutRef = doc(db, 'payouts', payoutId);
            await updateDoc(payoutRef, { status: newStatus });
            toast({ title: 'Status Atualizado', description: `A solicitação foi marcada como "${newStatus}".` });
            // Optimistic update
            setPayouts(prev => prev.map(p => p.id === payoutId ? { ...p, status: newStatus } : p));
        } catch (error) {
            console.error("Error updating payout status:", error);
            toast({ variant: 'destructive', title: 'Erro', description: 'Não foi possível atualizar o status da solicitação.' });
        } finally {
            setUpdatingId(null);
        }
    };

    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
    }

  return (
    <div className="grid gap-6">
      <div className="flex items-center">
        <h1 className="text-lg font-semibold md:text-2xl">Gerenciar Retiradas</h1>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Solicitações de Retirada</CardTitle>
          <CardDescription>
            Aprove ou rejeite as solicitações de retirada dos psicólogos.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead>Psicólogo(a)</TableHead>
                <TableHead>Valor</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                [...Array(5)].map((_, i) => (
                    <TableRow key={i}>
                        <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                        <TableCell><Skeleton className="h-5 w-40" /></TableCell>
                        <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                        <TableCell><Skeleton className="h-6 w-24 rounded-full" /></TableCell>
                        <TableCell className="text-right"><Skeleton className="h-8 w-20 ml-auto" /></TableCell>
                    </TableRow>
                ))
              ) : payouts.length > 0 ? (
                payouts.map(p => (
                    <TableRow key={p.id}>
                    <TableCell>{p.date}</TableCell>
                    <TableCell>{p.psychologistName}</TableCell>
                    <TableCell>{formatCurrency(p.amount)}</TableCell>
                    <TableCell>
                      <Badge variant={p.status === 'Pago' ? 'default' : p.status === 'Processando' ? 'secondary' : 'destructive'}>{p.status}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      {updatingId === p.id ? (
                        <Loader2 className="h-5 w-5 animate-spin ml-auto" />
                      ) : p.status === 'Processando' ? (
                        <>
                          <Button size="icon" variant="ghost" className="h-8 w-8 text-green-600 hover:text-green-700" onClick={() => handleUpdateStatus(p.id, 'Pago')}>
                            <Check className="h-4 w-4" />
                          </Button>
                          <Button size="icon" variant="ghost" className="h-8 w-8 text-red-600 hover:text-red-700" onClick={() => handleUpdateStatus(p.id, 'Rejeitado')}>
                            <X className="h-4 w-4" />
                          </Button>
                        </>
                      ) : null}
                    </TableCell>
                    </TableRow>
                ))
              ) : (
                <TableRow>
                    <TableCell colSpan={5} className="h-24 text-center">
                        Nenhuma solicitação de retirada encontrada.
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
