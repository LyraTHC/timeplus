
"use client";

import { useState, useEffect } from "react";
import { DollarSign, Users, Activity, Wallet } from "lucide-react";
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
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { db } from "@/lib/firebase";
import { collection, getDocs, query, where, orderBy, limit } from "firebase/firestore";

type Transaction = {
    id: string;
    patient: string;
    psychologist: string;
    amount: number;
    commission: number;
    status: string;
};

export default function AdminDashboardPage() {
  const [stats, setStats] = useState({
    totalRevenue: 0,
    platformProfit: 0,
    activeUsers: 0,
    totalSessions: 0,
  });
  const [latestTransactions, setLatestTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
        if (!db) {
            setLoading(false);
            console.error("Firestore DB is not available.");
            return;
        }

        setLoading(true);
        try {
            const sessionsQuery = query(collection(db, "sessions"), orderBy('sessionTimestamp', 'desc'));
            const usersQuery = query(collection(db, "users"), where('role', '!=', 'Admin'));

            const [sessionsSnapshot, usersSnapshot] = await Promise.all([
                getDocs(sessionsQuery),
                getDocs(usersQuery)
            ]);

            let totalRevenue = 0;
            const completedSessions = sessionsSnapshot.docs.filter(doc => ['Concluída', 'Agendada', 'Pago'].includes(doc.data().status));

            completedSessions.forEach(doc => {
                totalRevenue += doc.data().rate || 0;
            });

            const platformProfit = totalRevenue * 0.15;
            const activeUsers = usersSnapshot.size;
            const totalSessions = completedSessions.length;

            setStats({ totalRevenue, platformProfit, activeUsers, totalSessions });

            const transactionsData = sessionsSnapshot.docs.slice(0, 5).map(doc => {
                const data = doc.data();
                return {
                    id: doc.id,
                    patient: data.patientName,
                    psychologist: data.psychologistName,
                    amount: data.rate,
                    commission: data.rate * 0.15,
                    status: data.status,
                };
            });
            setLatestTransactions(transactionsData);

        } catch (error) {
            console.error("Error fetching dashboard data:", error);
        } finally {
            setLoading(false);
        }
    };

    fetchData();
  }, []);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  }

  const StatCard = ({ title, value, description, icon: Icon, loading, isCurrency = true }: any) => (
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
        <h1 className="text-lg font-semibold md:text-2xl">Painel do Administrador</h1>
      </div>
      <div className="grid gap-4 md:grid-cols-2 md:gap-8 lg:grid-cols-4">
        <StatCard title="Receita Total" value={stats.totalRevenue} description="+20.1% em relação ao mês passado" icon={DollarSign} loading={loading} />
        <StatCard title="Lucro da Plataforma (Comissões)" value={stats.platformProfit} description="Comissão de 15% aplicada" icon={Wallet} loading={loading} />
        <StatCard title="Usuários Ativos" value={`+${stats.activeUsers}`} description="+180 novos este mês" icon={Users} loading={loading} isCurrency={false} />
        <StatCard title="Sessões Realizadas (Total)" value={`+${stats.totalSessions}`} description="+570 este mês" icon={Activity} loading={loading} isCurrency={false} />
      </div>
      <div className="grid gap-4 md:gap-8">
        <Card className="hover:shadow-md transition-shadow">
          <CardHeader>
            <CardTitle>Últimas Transações</CardTitle>
            <CardDescription>
              Pagamentos de sessões recentes na plataforma.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Paciente</TableHead>
                  <TableHead>Psicólogo(a)</TableHead>
                  <TableHead>Valor</TableHead>
                  <TableHead>Comissão</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                    [...Array(5)].map((_, i) => (
                        <TableRow key={i}>
                            <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                            <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                            <TableCell><Skeleton className="h-5 w-16" /></TableCell>
                            <TableCell><Skeleton className="h-5 w-16" /></TableCell>
                            <TableCell><Skeleton className="h-6 w-14 rounded-full" /></TableCell>
                        </TableRow>
                    ))
                ) : latestTransactions.length > 0 ? (
                    latestTransactions.map(t => (
                        <TableRow key={t.id}>
                            <TableCell>{t.patient}</TableCell>
                            <TableCell>{t.psychologist}</TableCell>
                            <TableCell>{formatCurrency(t.amount)}</TableCell>
                            <TableCell className="text-primary">{formatCurrency(t.commission)}</TableCell>
                            <TableCell><Badge>{t.status}</Badge></TableCell>
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
    </>
  );
}
