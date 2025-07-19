
"use client";

import Image from "next/image";
import Link from "next/link";
import { Chrome, Facebook, Loader2, Eye, EyeOff } from "lucide-react";
import React, { useState } from "react";
import { useRouter } from "next/navigation";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  deleteUser,
  type AuthError,
  type User,
} from "firebase/auth";
import { doc, getDoc, setDoc, Timestamp } from "firebase/firestore";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Logo } from "@/components/Logo";
import { useToast } from "@/hooks/use-toast";
import { auth, db } from "@/lib/firebase";
import { validateCPF } from "@/lib/cpf-validator";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { cn } from "@/lib/utils";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const brazilianStates = [
  { value: "AC", label: "AC" }, { value: "AL", label: "AL" }, { value: "AP", label: "AP" },
  { value: "AM", label: "AM" }, { value: "BA", label: "BA" }, { value: "CE", label: "CE" },
  { value: "DF", label: "DF" }, { value: "ES", label: "ES" }, { value: "GO", label: "GO" },
  { value: "MA", label: "MA" }, { value: "MT", label: "MT" }, { value: "MS", label: "MS" },
  { value: "MG", label: "MG" }, { value: "PA", label: "PA" }, { value: "PB", label: "PB" },
  { value: "PR", label: "PR" }, { value: "PE", label: "PE" }, { value: "PI", label: "PI" },
  { value: "RJ", label: "RJ" }, { value: "RN", label: "RN" }, { value: "RS", label: "RS" },
  { value: "RO", label: "RO" }, { value: "RR", label: "RR" }, { value: "SC", label: "SC" },
  { value: "SP", label: "SP" }, { value: "SE", label: "SE" }, { value: "TO", label: "TO" },
];

const baseSignupSchema = z.object({
  name: z.string().min(3, { message: "O nome deve ter pelo menos 3 caracteres." }),
  email: z.string().email({ message: "Por favor, insira um e-mail válido." }),
  cpf: z.string()
    .min(11, { message: "O CPF deve ter exatamente 11 dígitos." })
    .max(11, { message: "O CPF deve ter exatamente 11 dígitos." })
    .refine(validateCPF, { message: "O CPF informado é inválido." }),
  whatsapp: z.string().min(8, { message: "Por favor, insira um número de WhatsApp válido." }),
  password: z.string().min(6, { message: "A senha deve ter pelo menos 6 caracteres." }),
  confirmPassword: z.string(),
});

const patientSignupSchema = baseSignupSchema.refine(data => data.password === data.confirmPassword, {
  message: "As senhas não coincidem.",
  path: ["confirmPassword"],
});

const psychologistSignupSchema = baseSignupSchema.extend({
  crpNumber: z.string().min(1, { message: "O número do CRP é obrigatório."}),
  crpState: z.string({ required_error: "Selecione o estado do seu CRP."}),
}).refine(data => data.password === data.confirmPassword, {
  message: "As senhas não coincidem.",
  path: ["confirmPassword"],
});

type PatientSignupFormValues = z.infer<typeof patientSignupSchema>;
type PsychologistSignupFormValues = z.infer<typeof psychologistSignupSchema>;


export default function AuthenticationPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("patient");

  // State for login fields
  const [patientLoginEmail, setPatientLoginEmail] = useState("");
  const [patientLoginPassword, setPatientLoginPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [psychologistLoginEmail, setPsychologistLoginEmail] = useState("");
  const [psychologistLoginPassword, setPsychologistLoginPassword] = useState("");
  const [showPsychoPassword, setShowPsychoPassword] = useState(false);

  const patientForm = useForm<PatientSignupFormValues>({
    resolver: zodResolver(patientSignupSchema),
    defaultValues: { name: "", email: "", cpf: "", whatsapp: "", password: "", confirmPassword: "" },
    mode: 'onBlur',
  });

  const psychologistForm = useForm<PsychologistSignupFormValues>({
    resolver: zodResolver(psychologistSignupSchema),
    defaultValues: { name: "", email: "", cpf: "", whatsapp: "", password: "", confirmPassword: "", crpNumber: "", crpState: undefined },
    mode: 'onBlur',
  });

  const handleAuthError = (error: AuthError) => {
    let title = "Erro de Autenticação";
    let description = "Ocorreu um erro inesperado. Tente novamente.";

    switch (error.code) {
      case "auth/api-key-not-valid":
        title = "Chave de API Inválida";
        description = "A configuração do cliente Firebase está incorreta. Verifique as chaves no arquivo .env.local.";
        break;
      case "auth/invalid-email":
        description = "O formato do e-mail é inválido.";
        break;
      case "auth/user-not-found":
      case "auth/wrong-password":
      case "auth/invalid-credential":
        description = "E-mail ou senha incorretos. Por favor, verifique seus dados.";
        break;
      case "auth/email-already-in-use":
        description = "Este e-mail já está em uso. Tente fazer login.";
        break;
      case "auth/weak-password":
        description = "A senha é muito fraca. Ela deve ter pelo menos 6 caracteres.";
        break;
      case "permission-denied":
        title = "Erro de Permissão";
        description = "Você não tem permissão para salvar este perfil. Verifique as regras de segurança do Firestore.";
        break;
      default:
        console.error("Authentication or Firestore Error:", error.code, error.message);
        title = "Erro ao Salvar Perfil";
        description = `Não foi possível salvar os dados do seu perfil. Código do erro: ${error.code}`;
        break;
    }
    toast({ variant: "destructive", title, description });
  };


  const handleLogin = async (role: "patient" | "psychologist") => {
    setIsLoading(true);
    const email = role === "patient" ? patientLoginEmail : psychologistLoginEmail;
    const password =
      role === "patient" ? patientLoginPassword : psychologistLoginPassword;

    if (!email || !password) {
      toast({
        variant: "destructive",
        title: "Campos Vazios",
        description: "Por favor, preencha o e-mail e a senha.",
      });
      setIsLoading(false);
      return;
    }

    if (!auth || !db) {
      toast({
        variant: "destructive",
        title: "Firebase não configurado",
        description:
          "A autenticação não está habilitada. Configure o Firebase.",
      });
      setIsLoading(false);
      return;
    }

    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      const userDocRef = doc(db, "users", user.uid);
      const userDocSnap = await getDoc(userDocRef);

      if (!userDocSnap.exists()) {
        await auth.signOut();
        toast({
          variant: "destructive",
          title: "Erro no Login",
          description: "Perfil de usuário não encontrado no banco de dados.",
        });
        return;
      }

      const userData = userDocSnap.data();
      const expectedRole = role === "patient" ? "Paciente" : "Psicólogo";

      if (userData.role !== expectedRole) {
        await auth.signOut();
        const wrongRole = expectedRole === "Paciente" ? "Psicólogo" : "Paciente";
        toast({
          variant: "destructive",
          title: "Acesso Incorreto",
          description: `Este e-mail está cadastrado como ${wrongRole}. Por favor, use a aba correta para fazer login.`,
        });
        return;
      }

      toast({
        title: "Login bem-sucedido!",
        description: "Redirecionando para o seu painel.",
      });
      router.push(
        role === "patient" ? "/dashboard" : "/dashboard-psychologist"
      );
    } catch (error) {
      handleAuthError(error as AuthError);
    } finally {
        setIsLoading(false);
    }
  };

  const handleSignUp = async (data: PatientSignupFormValues | PsychologistSignupFormValues, role: "patient" | "psychologist") => {
    setIsLoading(true);
    
    if (!db || !auth) {
        toast({
            variant: "destructive",
            title: "Firebase não configurado",
            description: "O cadastro não está habilitado. Configure o Firebase para continuar.",
        });
        setIsLoading(false);
        return;
    }

    let newUser: User | null = null;
    try {
        const userCredential = await createUserWithEmailAndPassword(auth, data.email, data.password);
        newUser = userCredential.user;
        const fullWhatsapp = `+55${data.whatsapp.replace(/\D/g, '')}`;

        const userDataToSave: any = {
          name: data.name,
          email: data.email,
          cpf: data.cpf.replace(/[^\d]+/g, ''),
          whatsapp: fullWhatsapp,
          role: role === 'patient' ? 'Paciente' : 'Psicólogo',
          createdAt: Timestamp.now(),
        };
        
        if (role === 'psychologist') {
            const psychoData = data as PsychologistSignupFormValues;
            userDataToSave.professionalProfile = {
                title: "Psicólogo(a) Clínico(a)",
                crp: `${psychoData.crpNumber}/${psychoData.crpState}`,
                bio: "Uma breve biografia sobre sua experiência e abordagem terapêutica.",
                specialties: ["TCC", "Ansiedade"],
                rate: 150,
            };
            userDataToSave.availability = {
                segunda: { enabled: true, start: '09:00', end: '18:00' },
                terca: { enabled: true, start: '09:00', end: '18:00' },
                quarta: { enabled: true, start: '09:00', end: '18:00' },
                quinta: { enabled: true, start: '09:00', end: '18:00' },
                sexta: { enabled: true, start: '09:00', end: '14:00' },
                sabado: { enabled: false, start: '09:00', end: '12:00' },
                domingo: { enabled: false, start: '09:00', end: '12:00' },
            };
            userDataToSave.payoutInfo = {
                bank: '',
                agency: '',
                account: ''
            };
        }

        await setDoc(doc(db, "users", newUser.uid), userDataToSave);
        
        toast({ title: "Conta criada com sucesso!", description: "Redirecionando para o seu painel." });
        router.push(role === "patient" ? "/dashboard" : "/dashboard-psychologist");
    } catch (error) {
        if (newUser) {
            await deleteUser(newUser);
        }
        handleAuthError(error as AuthError);
    } finally {
        setIsLoading(false);
    }
  };

  return (
    <div className="w-full min-h-screen lg:grid lg:grid-cols-2">
      <div className="flex items-center justify-center py-12 px-4">
        <div className="mx-auto grid w-full max-w-sm gap-8">
          <div className="grid gap-4 text-center">
            <div className="flex items-center justify-center mb-4">
              <Logo priority />
            </div>
            <h1 className="text-3xl font-bold">Seja bem-vindo(a)</h1>
            <p className="text-balance text-muted-foreground">
              Encontre a sua paz, uma sessão de cada vez.
            </p>
          </div>
          <Tabs defaultValue="patient" className="w-full" onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="patient">Sou Paciente</TabsTrigger>
              <TabsTrigger value="psychologist">Sou Psicólogo</TabsTrigger>
            </TabsList>
            <TabsContent value="patient">
              <Tabs defaultValue="login" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="login">Entrar</TabsTrigger>
                  <TabsTrigger value="signup">Criar Conta</TabsTrigger>
                </TabsList>
                <TabsContent value="login">
                  <Card className="border-0 shadow-none">
                    <CardContent className="grid gap-4 p-0 pt-6">
                      <div className="grid gap-2">
                        <Label htmlFor="email-patient-login">Email</Label>
                        <Input
                          id="email-patient-login"
                          type="email"
                          placeholder="m@exemplo.com"
                          value={patientLoginEmail}
                          onChange={(e) => setPatientLoginEmail(e.target.value)}
                          disabled={isLoading}
                        />
                      </div>
                      <div className="grid gap-2">
                        <div className="flex items-center">
                          <Label htmlFor="password-patient-login">Senha</Label>
                          <Link
                            href="#"
                            className="ml-auto inline-block text-sm underline"
                          >
                            Esqueceu sua senha?
                          </Link>
                        </div>
                        <div className="relative">
                          <Input
                            id="password-patient-login"
                            type={showPassword ? "text" : "password"}
                            value={patientLoginPassword}
                            onChange={(e) => setPatientLoginPassword(e.target.value)}
                            disabled={isLoading}
                          />
                           <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 text-muted-foreground"
                            onClick={() => setShowPassword(prev => !prev)}
                          >
                            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </Button>
                        </div>
                      </div>
                      <Button onClick={() => handleLogin('patient')} disabled={isLoading} className="w-full">
                        {isLoading ? <Loader2 className="animate-spin" /> : "Entrar"}
                      </Button>
                    </CardContent>
                  </Card>
                </TabsContent>
                <TabsContent value="signup">
                  <Card className="border-0 shadow-none">
                    <CardContent className="p-0 pt-6">
                      <Form {...patientForm}>
                        <form onSubmit={patientForm.handleSubmit(data => handleSignUp(data, 'patient'))} className="grid gap-4">
                          <FormField
                            control={patientForm.control}
                            name="name"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Nome</FormLabel>
                                <FormControl>
                                  <Input placeholder="Seu nome completo" {...field} disabled={isLoading} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={patientForm.control}
                            name="email"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Email</FormLabel>
                                <FormControl>
                                  <Input type="email" placeholder="m@exemplo.com" {...field} disabled={isLoading} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={patientForm.control}
                            name="cpf"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>CPF</FormLabel>
                                <FormControl>
                                  <Input placeholder="00000000000" {...field} maxLength={11} disabled={isLoading} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={patientForm.control}
                            name="whatsapp"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>WhatsApp (com DDD)</FormLabel>
                                <div className="flex items-center gap-2">
                                  <div className={cn(
                                      "flex h-10 w-[80px] items-center justify-center rounded-md border border-input bg-background px-3 py-2 text-sm"
                                  )}>
                                      🇧🇷 +55
                                  </div>
                                  <FormControl>
                                    <Input type="tel" placeholder="(11) 99999-9999" {...field} disabled={isLoading} className="flex-1" />
                                  </FormControl>
                                </div>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={patientForm.control}
                            name="password"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Senha</FormLabel>
                                <FormControl>
                                   <div className="relative">
                                    <Input type={showPassword ? "text" : "password"} {...field} disabled={isLoading} />
                                    <Button type="button" variant="ghost" size="icon" className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 text-muted-foreground" onClick={() => setShowPassword(p => !p)}>
                                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                    </Button>
                                  </div>
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={patientForm.control}
                            name="confirmPassword"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Confirmar Senha</FormLabel>
                                <FormControl>
                                  <div className="relative">
                                    <Input type={showPassword ? "text" : "password"} {...field} disabled={isLoading} />
                                  </div>
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <Button type="submit" disabled={isLoading} className="w-full mt-2">
                            {isLoading ? <Loader2 className="animate-spin" /> : "Criar Conta"}
                          </Button>
                        </form>
                      </Form>
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            </TabsContent>
            <TabsContent value="psychologist">
              <Tabs defaultValue="login" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="login">Entrar</TabsTrigger>
                  <TabsTrigger value="signup">Criar Conta</TabsTrigger>
                </TabsList>
                <TabsContent value="login">
                  <Card className="border-0 shadow-none">
                    <CardContent className="grid gap-4 p-0 pt-6">
                      <div className="grid gap-2">
                        <Label htmlFor="email-psychologist-login">Email</Label>
                        <Input
                          id="email-psychologist-login"
                          type="email"
                          placeholder="m@exemplo.com"
                          value={psychologistLoginEmail}
                          onChange={(e) => setPsychologistLoginEmail(e.target.value)}
                          disabled={isLoading}
                        />
                      </div>
                      <div className="grid gap-2">
                        <div className="flex items-center">
                          <Label htmlFor="password-psychologist-login">
                            Senha
                          </Label>
                          <Link
                            href="#"
                            className="ml-auto inline-block text-sm underline"
                          >
                            Esqueceu sua senha?
                          </Link>
                        </div>
                        <div className="relative">
                          <Input
                            id="password-psychologist-login"
                            type={showPsychoPassword ? "text" : "password"}
                            value={psychologistLoginPassword}
                            onChange={(e) => setPsychologistLoginPassword(e.target.value)}
                            disabled={isLoading}
                          />
                           <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 text-muted-foreground"
                            onClick={() => setShowPsychoPassword(prev => !prev)}
                          >
                            {showPsychoPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </Button>
                        </div>
                      </div>
                      <Button onClick={() => handleLogin('psychologist')} disabled={isLoading} className="w-full">
                        {isLoading ? <Loader2 className="animate-spin" /> : "Entrar"}
                      </Button>
                    </CardContent>
                  </Card>
                </TabsContent>
                <TabsContent value="signup">
                   <Card className="border-0 shadow-none">
                    <CardContent className="p-0 pt-6">
                      <Form {...psychologistForm}>
                        <form onSubmit={psychologistForm.handleSubmit(data => handleSignUp(data, 'psychologist'))} className="grid gap-4">
                           <FormField
                            control={psychologistForm.control}
                            name="name"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Nome</FormLabel>
                                <FormControl>
                                  <Input placeholder="Seu nome completo" {...field} disabled={isLoading} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={psychologistForm.control}
                            name="email"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Email</FormLabel>
                                <FormControl>
                                  <Input type="email" placeholder="m@exemplo.com" {...field} disabled={isLoading} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={psychologistForm.control}
                            name="cpf"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>CPF</FormLabel>
                                <FormControl>
                                  <Input placeholder="00000000000" {...field} maxLength={11} disabled={isLoading} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={psychologistForm.control}
                            name="crpNumber"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>CRP</FormLabel>
                                <div className="flex gap-2">
                                  <FormControl>
                                    <Input placeholder="Número do CRP" {...field} disabled={isLoading} className="flex-1" />
                                  </FormControl>
                                   <FormField
                                      control={psychologistForm.control}
                                      name="crpState"
                                      render={({ field: selectField }) => (
                                        <FormItem className="w-[80px]">
                                          <FormControl>
                                            <Select onValueChange={selectField.onChange} defaultValue={selectField.value} disabled={isLoading}>
                                              <SelectTrigger>
                                                <SelectValue placeholder="UF" />
                                              </SelectTrigger>
                                              <SelectContent>
                                                {brazilianStates.map(state => (
                                                  <SelectItem key={state.value} value={state.value}>{state.label}</SelectItem>
                                                ))}
                                              </SelectContent>
                                            </Select>
                                          </FormControl>
                                        </FormItem>
                                      )}
                                    />
                                </div>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={psychologistForm.control}
                            name="whatsapp"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>WhatsApp (com DDD)</FormLabel>
                                <div className="flex items-center gap-2">
                                  <div className={cn(
                                      "flex h-10 w-[80px] items-center justify-center rounded-md border border-input bg-background px-3 py-2 text-sm"
                                  )}>
                                      🇧🇷 +55
                                  </div>
                                  <FormControl>
                                    <Input type="tel" placeholder="(11) 99999-9999" {...field} disabled={isLoading} className="flex-1" />
                                  </FormControl>
                                </div>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={psychologistForm.control}
                            name="password"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Senha</FormLabel>
                                <FormControl>
                                   <div className="relative">
                                    <Input type={showPsychoPassword ? "text" : "password"} {...field} disabled={isLoading} />
                                    <Button type="button" variant="ghost" size="icon" className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 text-muted-foreground" onClick={() => setShowPsychoPassword(p => !p)}>
                                      {showPsychoPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                    </Button>
                                  </div>
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={psychologistForm.control}
                            name="confirmPassword"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Confirmar Senha</FormLabel>
                                <FormControl>
                                  <div className="relative">
                                    <Input type={showPsychoPassword ? "text" : "password"} {...field} disabled={isLoading} />
                                  </div>
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <Button type="submit" disabled={isLoading} className="w-full mt-2">
                            {isLoading ? <Loader2 className="animate-spin" /> : "Criar Conta"}
                          </Button>
                        </form>
                      </Form>
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            </TabsContent>
          </Tabs>
          <div className="relative my-2">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">
                Ou entre com
              </span>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Button variant="outline" disabled>
              <Chrome className="mr-2 h-4 w-4" /> Google
            </Button>
            <Button variant="outline" disabled>
              <Facebook className="mr-2 h-4 w-4" /> Facebook
            </Button>
          </div>
        </div>
      </div>
      <div className="hidden bg-muted lg:block">
        <Image
          src="https://placehold.co/1200x900.png"
          alt="Image"
          width="1200"
          height="900"
          data-ai-hint="therapy calm"
          className="h-full w-full object-cover dark:brightness-[0.2] dark:grayscale"
        />
      </div>
    </div>
  );
}
