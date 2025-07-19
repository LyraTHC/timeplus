
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
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { db, isFirebaseConfigured } from "@/lib/firebase";
import { collection, getDocs, query, where, orderBy } from "firebase/firestore";
import { FileDown, Loader2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

type Transaction = {
    id: string;
    psychologist: string;
    date: string;
    amount: number;
    status: string;
};

export default function PaymentsPage() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isFirebaseConfigured || !db) {
        setLoading(false);
        return;
    }

    if (user) {
        const fetchTransactions = async () => {
            setLoading(true);
            try {
                const sessionsQuery = query(
                    collection(db, "sessions"),
                    where("participantIds", "array-contains", user.uid),
                    orderBy("sessionTimestamp", "desc")
                );
                const querySnapshot = await getDocs(sessionsQuery);
                const fetchedTransactions = querySnapshot.docs.map(doc => {
                    const data = doc.data();
                    return {
                        id: doc.id,
                        psychologist: data.psychologistName,
                        date: format(data.sessionTimestamp.toDate(), "dd 'de' MMMM, yyyy", { locale: ptBR }),
                        amount: data.rate || 0,
                        status: data.status,
                    }
                });
                setTransactions(fetchedTransactions);
            } catch (error) {
                console.error("Error fetching transactions:", error);
                toast({
                    variant: "destructive",
                    title: "Erro ao buscar pagamentos",
                    description: "Não foi possível carregar seu histórico.",
                });
            } finally {
                setLoading(false);
            }
        };

        fetchTransactions();
    } else {
        setLoading(false);
    }
  }, [user, toast]);

  const handleExport = () => {
    toast({
      title: "Funcionalidade em Desenvolvimento",
      description: "A exportação de dados ainda não foi implementada.",
    });
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  }

  return (
    <div className="grid gap-6">
        <div className="flex items-center">
            <h1 className="text-lg font-semibold md:text-2xl">Histórico de Pagamentos</h1>
            <Button size="sm" variant="outline" className="ml-auto" onClick={handleExport}>
                <FileDown className="mr-2 h-4 w-4"/>
                Exportar
            </Button>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Transações</CardTitle>
            <CardDescription>
              Seu histórico completo de pagamentos por sessões.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Psicólogo(a)</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                    [...Array(4)].map((_, i) => (
                        <TableRow key={i}>
                            <TableCell><Skeleton className="h-5 w-36" /></TableCell>
                            <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                            <TableCell><Skeleton className="h-6 w-20 rounded-full" /></TableCell>
                            <TableCell className="text-right"><Skeleton className="h-5 w-24 ml-auto" /></TableCell>
                        </TableRow>
                    ))
                ) : transactions.length > 0 ? (
                    transactions.map(t => (
                        <TableRow key={t.id}>
                            <TableCell>
                                <div className="font-medium">{t.psychologist}</div>
                            </TableCell>
                            <TableCell>{t.date}</TableCell>
                            <TableCell>
                                <Badge variant="default">{t.status}</Badge>
                            </TableCell>
                            <TableCell className="text-right">{formatCurrency(t.amount)}</TableCell>
                        </TableRow>
                    ))
                ) : (
                    <TableRow>
                        <TableCell colSpan={4} className="h-24 text-center">
                            Nenhum pagamento encontrado.
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

    