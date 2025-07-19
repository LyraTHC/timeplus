
"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import React, { useState } from "react";
import { signInWithEmailAndPassword, type AuthError } from "firebase/auth";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Logo } from "@/components/Logo";
import { useToast } from "@/hooks/use-toast";
import { auth, isFirebaseConfigured } from "@/lib/firebase";
import { Loader2 } from "lucide-react";

export default function AdminLoginPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async () => {
    setIsLoading(true);
    if (!email || !password) {
      toast({
        variant: "destructive",
        title: "Campos Vazios",
        description: "Por favor, preencha o e-mail e a senha.",
      });
      setIsLoading(false);
      return;
    }

    if (!isFirebaseConfigured || !auth) {
        toast({
            variant: "destructive",
            title: "Firebase não configurado",
            description: "A autenticação não está habilitada. Configure o Firebase para continuar.",
        });
        setIsLoading(false);
        return;
    }
    
    try {
      await signInWithEmailAndPassword(auth, email, password);
      // Here you might want to add a check to ensure the user is an admin in your database
      toast({ title: "Login bem-sucedido!", description: "Bem-vindo(a), Administrador." });
      router.push("/admin");
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Acesso Negado",
        description: "As credenciais de administrador estão incorretas.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <Card className="mx-auto max-w-sm">
        <CardHeader>
          <div className="flex justify-center mb-4">
            <Logo />
          </div>
          <CardTitle className="text-2xl text-center">Acesso Restrito</CardTitle>
          <CardDescription className="text-center">
            Painel de Administração TimePlus
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="admin@timeplus.com"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isLoading}
              />
            </div>
            <div className="grid gap-2">
              <div className="flex items-center">
                <Label htmlFor="password">Senha</Label>
              </div>
              <Input
                id="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isLoading}
              />
            </div>
            <Button onClick={handleLogin} disabled={isLoading} className="w-full">
               {isLoading ? <Loader2 className="animate-spin" /> : "Entrar"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
