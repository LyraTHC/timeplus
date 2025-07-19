
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
import { Download } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { db, isFirebaseConfigured } from "@/lib/firebase";
import { collection, getDocs, query, orderBy } from "firebase/firestore";

type Transaction = {
  id: string;
  date: string;
  description: string;
  psychologist: string;
  amount: number;
  commission: number;
  status: 'Pago' | 'Retirada' | 'Processando' | 'Agendada' | 'Concluída' | 'Cancelada' | 'Pendente';
};

export default function AdminTransactionsPage() {
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchTransactions = async () => {
            setLoading(true);
            if (!isFirebaseConfigured || !db) {
                setLoading(false);
                return;
            }

            try {
                const sessionsQuery = query(collection(db, 'sessions'), orderBy('sessionTimestamp', 'desc'));
                const sessionsSnapshot = await getDocs(sessionsQuery);

                const sessionTransactionsSource = sessionsSnapshot.docs.map(doc => {
                    const data = doc.data();
                    return {
                        id: doc.id,
                        dateObject: data.sessionTimestamp.toDate(),
                        description: `Sessão: ${data.patientName}`,
                        psychologist: data.psychologistName,
                        amount: data.rate || 0,
                        commission: (data.rate || 0) * 0.15,
                        status: data.status,
                    };
                });
                
                const formattedTransactions = sessionTransactionsSource.map(t => ({
                    ...t,
                    date: format(t.dateObject, "dd 'de' MMMM, yyyy", { locale: ptBR }),
                })) as Transaction[];

                setTransactions(formattedTransactions);

            } catch (error) {
                console.error("Error fetching transactions:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchTransactions();
    }, []);

    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
    }
  return (
    <div className="grid gap-6">
      <div className="flex items-center">
        <h1 className="text-lg font-semibold md:text-2xl">Transações da Plataforma</h1>
        <Button size="sm" variant="outline" className="ml-auto">
          <Download className="mr-2 h-4 w-4" />
          Exportar Relatório
        </Button>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Histórico de Transações</CardTitle>
          <CardDescription>
            Visualize todas as transações, incluindo pagamentos de sessões e retiradas de psicólogos.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead>Descrição</TableHead>
                <TableHead>Valor</TableHead>
                <TableHead>Comissão</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                [...Array(5)].map((_, i) => (
                    <TableRow key={i}>
                        <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                        <TableCell>
                            <Skeleton className="h-5 w-40 mb-1" />
                            <Skeleton className="h-4 w-48" />
                        </TableCell>
                        <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                        <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                        <TableCell><Skeleton className="h-6 w-16 rounded-full" /></TableCell>
                    </TableRow>
                ))
              ) : transactions.length > 0 ? (
                transactions.map(t => (
                    <TableRow key={t.id}>
                    <TableCell>{t.date}</TableCell>
                    <TableCell>
                        <div className="font-medium">{t.description}</div>
                        <div className="text-sm text-muted-foreground">Psicólogo(a): {t.psychologist}</div>
                    </TableCell>
                    <TableCell className={t.amount < 0 ? 'text-destructive' : ''}>{formatCurrency(t.amount)}</TableCell>
                    <TableCell className="text-primary">{t.commission > 0 ? formatCurrency(t.commission) : '-'}</TableCell>
                    <TableCell>
                        <Badge variant={t.status === 'Pago' || t.status === 'Concluída' ? 'default' : t.status === 'Retirada' || t.status === 'Processando' ? 'secondary' : 'outline'}>{t.status}</Badge>
                    </TableCell>
                    </TableRow>
                ))
              ) : (
                <TableRow>
                    <TableCell colSpan={5} className="h-24 text-center">
                        Nenhuma transação encontrada.
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
