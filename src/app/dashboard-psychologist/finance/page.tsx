
"use client";

import React, { useState, useEffect } from "react";
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
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
  DialogTrigger,
} from "@/components/ui/dialog";
import { Download, CreditCard, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { db, isFirebaseConfigured } from "@/lib/firebase";
import { collection, query, where, getDocs, orderBy, Timestamp, addDoc } from "firebase/firestore";
import { Skeleton } from "@/components/ui/skeleton";

type Payout = {
    id: string;
    amount: number;
    date: string;
    status: 'Processando' | 'Pago' | 'Rejeitado';
};

export default function FinancePage() {
  const { toast } = useToast();
  const { user, userData } = useAuth();
  const [balance, setBalance] = useState(0);
  const [loading, setLoading] = useState(true);
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isRequesting, setIsRequesting] = useState(false);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  }
  
  const fetchFinancials = async () => {
      if (!isFirebaseConfigured || !db || !user?.uid) {
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        // Query for COMPLETED sessions to calculate revenue
        const sessionsQuery = query(
          collection(db, "sessions"),
          where("psychologistId", "==", user.uid),
          where("status", "==", "Concluída")
        );
        
        // Query for all payouts to calculate what has already been requested/paid
        const payoutsQuery = query(
            collection(db, "payouts"),
            where("psychologistId", "==", user.uid),
            orderBy("requestedAt", "desc")
        );

        const [sessionsSnapshot, payoutsSnapshot] = await Promise.all([
            getDocs(sessionsQuery),
            getDocs(payoutsQuery)
        ]);
        
        const fetchedPayouts = payoutsSnapshot.docs.map(doc => {
            const data = doc.data();
            return {
                id: doc.id,
                amount: data.amount,
                date: format(data.requestedAt.toDate(), "dd 'de' MMMM, yyyy", { locale: ptBR }),
                status: data.status
            }
        }) as Payout[];
        setPayouts(fetchedPayouts);

        const totalRevenue = sessionsSnapshot.docs.reduce((acc, doc) => acc + (doc.data().rate || 0), 0);
        
        const totalPayoutsRequestedOrPaid = fetchedPayouts
            .filter(p => p.status === 'Processando' || p.status === 'Pago')
            .reduce((acc, p) => acc + p.amount, 0);
        
        // Balance is the profit (85%) minus what's already been paid or is being processed
        const currentBalance = (totalRevenue * 0.85) - totalPayoutsRequestedOrPaid;
        setBalance(currentBalance > 0 ? currentBalance : 0);

      } catch (error) {
        console.error("Error fetching financials:", error);
         toast({
            variant: "destructive",
            title: "Erro ao carregar dados",
            description: "Não foi possível buscar seus dados financeiros.",
        });
      } finally {
        setLoading(false);
      }
    };

  useEffect(() => {
    if (user?.uid && isFirebaseConfigured && db) {
        fetchFinancials();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.uid, isFirebaseConfigured]);

  const handleRequestPayout = async () => {
    if (balance <= 0 || !user || !db || !userData) return;

    setIsRequesting(true);
    try {
        await addDoc(collection(db, "payouts"), {
            psychologistId: user.uid,
            psychologistName: userData.name,
            amount: balance,
            status: 'Processando',
            requestedAt: Timestamp.now()
        });
        
        toast({
            title: "Solicitação de Retirada Enviada!",
            description: `Sua solicitação para retirar ${formatCurrency(balance)} foi enviada para processamento.`,
        });
        
        await fetchFinancials(); // Refresh data after request
    } catch(error) {
        console.error("Error creating payout request:", error);
        toast({
            variant: "destructive",
            title: "Erro ao Solicitar",
            description: "Não foi possível criar sua solicitação de retirada. Tente novamente.",
        });
    } finally {
        setIsRequesting(false);
        setIsDialogOpen(false);
    }
  };

  const handleAction = (feature: string) => {
    toast({
      title: "Funcionalidade em Desenvolvimento",
      description: `A funcionalidade de ${feature} ainda não foi implementada.`,
    });
  }

  return (
    <div className="grid gap-6">
        <div className="flex items-center">
            <h1 className="text-lg font-semibold md:text-2xl">Financeiro</h1>
        </div>
        <div className="grid md:grid-cols-3 gap-6">
            <Card>
                <CardHeader>
                    <CardTitle>Saldo Disponível</CardTitle>
                    <CardDescription>
                        Valor acumulado de sessões concluídas, já com a comissão de 15% descontada.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <Skeleton className="h-9 w-40" />
                    ) : (
                        <p className="text-3xl font-bold">{formatCurrency(balance)}</p>
                    )}
                    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                      <DialogTrigger asChild>
                        <Button className="mt-4 w-full" disabled={balance <= 0 || loading || isRequesting}>Solicitar Retirada</Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Confirmar Solicitação de Retirada</DialogTitle>
                          <DialogDescription>
                            Você tem certeza que deseja solicitar a retirada de <strong>{formatCurrency(balance)}</strong>? O administrador da plataforma realizará a transferência para a sua conta bancária cadastrada.
                          </DialogDescription>
                        </DialogHeader>
                        <DialogFooter>
                          <Button variant="outline" onClick={() => setIsDialogOpen(false)} disabled={isRequesting}>Cancelar</Button>
                          <Button onClick={handleRequestPayout} disabled={isRequesting}>
                            {isRequesting ? <Loader2 className="animate-spin" /> : "Confirmar Retirada"}
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                </CardContent>
            </Card>
             <Card className="md:col-span-2">
                <CardHeader>
                    <CardTitle>Conta para Recebimento</CardTitle>
                    <CardDescription>Dados da conta onde você receberá os pagamentos.</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="flex items-center gap-4 border p-4 rounded-lg">
                        <CreditCard className="w-8 h-8 text-muted-foreground"/>
                        <div>
                            <p className="font-semibold">Banco Inter - 077</p>
                            <p className="text-sm text-muted-foreground">Ag: 0001 / CC: 1234567-8</p>
                            <p className="text-sm text-muted-foreground">Eleanor Vance</p>
                        </div>
                    </div>
                    <Button variant="outline" className="mt-4" onClick={() => handleAction('alterar conta')}>Alterar Conta</Button>
                </CardContent>
            </Card>
        </div>

        <Card>
          <CardHeader className="flex flex-row items-center">
            <div className="grid gap-2">
                <CardTitle>Histórico de Retiradas</CardTitle>
                <CardDescription>
                  Quando você solicita uma retirada, ela aparece aqui com o status "Processando". Após o administrador aprovar a transferência, o status muda para "Pago".
                </CardDescription>
            </div>
            <Button size="sm" variant="outline" className="ml-auto" onClick={() => handleAction('exportar histórico')}>
                <Download className="mr-2 h-4 w-4"/>
                Exportar
            </Button>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data da Solicitação</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                    [...Array(2)].map((_, i) => (
                        <TableRow key={i}>
                            <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                            <TableCell><Skeleton className="h-6 w-24 rounded-full" /></TableCell>
                            <TableCell className="text-right"><Skeleton className="h-5 w-20 ml-auto" /></TableCell>
                        </TableRow>
                    ))
                ) : payouts.length > 0 ? (
                    payouts.map(p => (
                        <TableRow key={p.id}>
                            <TableCell>{p.date}</TableCell>
                            <TableCell>
                                <Badge variant={p.status === 'Pago' ? 'default' : p.status === 'Processando' ? 'secondary' : 'destructive'}>
                                    {p.status}
                                </Badge>
                            </TableCell>
                            <TableCell className="text-right">{formatCurrency(p.amount)}</TableCell>
                        </TableRow>
                    ))
                ) : (
                    <TableRow>
                        <TableCell colSpan={3} className="h-24 text-center">
                            Nenhuma retirada encontrada.
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
