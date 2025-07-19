
"use client";

import { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import { collection, getDocs, query } from "firebase/firestore";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MoreHorizontal, Users, UserCheck } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { db } from "@/lib/firebase";
import { Skeleton } from "@/components/ui/skeleton";

type User = {
  id: string;
  name: string;
  email: string;
  role: 'Paciente' | 'Psicólogo' | 'Admin';
  status: 'Ativo' | 'Inativo';
  value: number;
};

const UsersTable = ({ users, handleAction, handleSuspend, valueLabel, loading }: { users: User[], handleAction: (action: string, user: User) => void, handleSuspend: (userId: string, userName: string, currentStatus: string) => void, valueLabel: string, loading: boolean }) => {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  }

  if (loading) {
    return (
       <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Usuário</TableHead>
              <TableHead>{valueLabel}</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {[...Array(3)].map((_, i) => (
                <TableRow key={i}>
                    <TableCell>
                        <div className="flex items-center gap-3">
                            <Skeleton className="h-10 w-10 rounded-full" />
                            <div>
                                <Skeleton className="h-4 w-24 mb-1" />
                                <Skeleton className="h-3 w-32" />
                            </div>
                        </div>
                    </TableCell>
                    <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-16 rounded-full" /></TableCell>
                    <TableCell className="text-right"><Skeleton className="h-8 w-8" /></TableCell>
                </TableRow>
            ))}
          </TableBody>
       </Table>
    )
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Usuário</TableHead>
          <TableHead>{valueLabel}</TableHead>
          <TableHead>Status</TableHead>
          <TableHead className="text-right">Ações</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {users.map(user => (
          <TableRow key={user.id}>
            <TableCell>
              <div className="flex items-center gap-3">
                <Avatar>
                    <AvatarImage src={`https://placehold.co/40x40.png`} data-ai-hint="person face" />
                    <AvatarFallback>{user.name.substring(0,2)}</AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium">{user.name}</p>
                  <p className="text-sm text-muted-foreground">{user.email}</p>
                </div>
              </div>
            </TableCell>
            <TableCell>
                <div className="font-medium">{formatCurrency(user.value)}</div>
            </TableCell>
            <TableCell>
              <Badge variant={user.status === 'Ativo' ? 'default' : 'secondary'}>{user.status}</Badge>
            </TableCell>
            <TableCell className="text-right">
               <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                          <MoreHorizontal />
                      </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                      <DropdownMenuItem onClick={() => handleAction('ver perfil', user)}>Ver Perfil</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleAction('editar', user)}>Editar</DropdownMenuItem>
                      <DropdownMenuItem 
                        className={user.status === 'Ativo' ? "text-destructive" : ""}
                        onClick={() => handleSuspend(user.id, user.name, user.status)}
                      >
                        {user.status === 'Ativo' ? 'Suspender' : 'Reativar'}
                      </DropdownMenuItem>
                  </DropdownMenuContent>
               </DropdownMenu>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
};

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const router = useRouter();

  useEffect(() => {
    const fetchUsersAndFinancials = async () => {
        if (!db) {
            setLoading(false);
            return;
        }

        setLoading(true);
        try {
            const usersQuery = query(collection(db, "users"));
            const sessionsQuery = query(collection(db, "sessions"));
            
            const [usersSnapshot, sessionsSnapshot] = await Promise.all([
                getDocs(usersQuery),
                getDocs(sessionsQuery)
            ]);

            const userFinancials: { [key: string]: number } = {};
            sessionsSnapshot.forEach(doc => {
                const session = doc.data();
                if (session.patientId) {
                    userFinancials[session.patientId] = (userFinancials[session.patientId] || 0) + (session.rate || 0);
                }
                if (session.psychologistId) {
                    userFinancials[session.psychologistId] = (userFinancials[session.psychologistId] || 0) + (session.rate || 0);
                }
            });
            
            const fetchedUsers = usersSnapshot.docs.map(doc => {
                const data = doc.data();
                return {
                    id: doc.id,
                    name: data.name,
                    email: data.email,
                    role: data.role,
                    status: 'Ativo', // Mock status for now
                    value: userFinancials[doc.id] || 0,
                } as User;
            }).filter(u => u.role !== 'Admin');
            
            setUsers(fetchedUsers);

        } catch (error) {
            console.error("Error fetching users:", error);
            toast({
                variant: 'destructive',
                title: "Erro ao buscar usuários",
                description: "Não foi possível carregar a lista de usuários.",
            });
        } finally {
            setLoading(false);
        }
    };

    fetchUsersAndFinancials();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleAction = (action: string, user: User) => {
    if (action === 'ver perfil') {
      if (user.role === 'Paciente') {
        router.push(`/admin/users/patient/${user.id}`);
      } else if (user.role === 'Psicólogo') {
        router.push(`/admin/users/psychologist/${user.id}`);
      }
    } else if (action === 'editar') {
      toast({
        title: "Funcionalidade em Desenvolvimento",
        description: `A funcionalidade de editar o usuário ${user.name} ainda não foi implementada.`,
      });
    }
  };

  const handleSuspend = (userId: string, userName: string, currentStatus: string) => {
    const newStatus = currentStatus === 'Ativo' ? 'Inativo' : 'Ativo';
    setUsers(users.map(u => u.id === userId ? { ...u, status: newStatus } : u));
    toast({
      title: `Usuário ${newStatus === 'Ativo' ? 'Reativado' : 'Suspenso'}!`,
      description: `O usuário ${userName} foi ${newStatus === 'Ativo' ? 'reativado' : 'suspenso'} com sucesso.`,
    });
  };
  
  const patients = useMemo(() => users.filter(u => u.role === 'Paciente').sort((a, b) => b.value - a.value), [users]);
  const psychologists = useMemo(() => users.filter(u => u.role === 'Psicólogo').sort((a, b) => b.value - a.value), [users]);

  return (
    <div className="grid gap-6">
      <div className="flex items-center">
        <h1 className="text-lg font-semibold md:text-2xl">Gerenciamento de Usuários</h1>
      </div>
       <Tabs defaultValue="patients">
        <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="patients">
                <Users className="mr-2 h-4 w-4"/>
                Pacientes ({patients.length})
            </TabsTrigger>
            <TabsTrigger value="psychologists">
                <UserCheck className="mr-2 h-4 w-4"/>
                Psicólogos ({psychologists.length})
            </TabsTrigger>
        </TabsList>
        <TabsContent value="patients">
            <Card>
                <CardHeader>
                    <CardTitle>Todos os Pacientes</CardTitle>
                    <CardDescription>
                        Visualize todos os pacientes da plataforma, ordenados por quem mais gastou.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <UsersTable users={patients} handleAction={handleAction} handleSuspend={handleSuspend} valueLabel="Valor Gasto" loading={loading} />
                </CardContent>
            </Card>
        </TabsContent>
        <TabsContent value="psychologists">
             <Card>
                <CardHeader>
                    <CardTitle>Todos os Psicólogos</CardTitle>
                    <CardDescription>
                        Visualize e gerencie todos os psicólogos da plataforma, ordenados por quem mais faturou.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <UsersTable users={psychologists} handleAction={handleAction} handleSuspend={handleSuspend} valueLabel="Faturamento" loading={loading}/>
                </CardContent>
            </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
