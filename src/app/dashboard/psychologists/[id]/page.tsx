
"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import { useParams, useRouter } from "next/navigation";
import { Star, CheckCircle, CreditCard, MessageCircle, AlertCircle, Loader2 } from "lucide-react";
import { format, isSameDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { getFunctions, httpsCallable } from "firebase/functions";
import { initMercadoPago, Payment } from '@mercadopago/sdk-react';

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { app, isFirebaseConfigured, db } from "@/lib/firebase";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import { doc, onSnapshot, setDoc, Timestamp } from "firebase/firestore";
import { Input } from "@/components/ui/input";


const generateTimeSlots = (start: string, end: string, bookedMillis: number[], sessionDate: Date): string[] => {
    if (!start || !end) return [];
    
    const slots: string[] = [];
    const now = new Date();
    
    const isToday = isSameDay(sessionDate, now);

    let currentTime = new Date(sessionDate);
    const [startHour, startMinute] = start.split(':').map(Number);
    currentTime.setHours(startHour, startMinute, 0, 0);

    const [endHour, endMinute] = end.split(':').map(Number);
    const endTime = new Date(sessionDate);
    endTime.setHours(endHour, endMinute, 0, 0);

    while (currentTime < endTime) {
        const slotTime = new Date(currentTime);
        
        const isFutureSlot = isToday ? slotTime > now : true;

        if (isFutureSlot && !bookedMillis.includes(slotTime.getTime())) {
            slots.push(format(slotTime, 'HH:mm'));
        }
        currentTime.setHours(currentTime.getHours() + 1);
    }
    return slots;
};

const dayIndexToKey = ['domingo', 'segunda', 'terca', 'quarta', 'quinta', 'sexta', 'sabado'];

export default function PsychologistDetailPage() {
  const params = useParams<{ id: string }>();
  const [psychologist, setPsychologist] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [selectedTime, setSelectedTime] = useState<string | undefined>();
  const [availableTimes, setAvailableTimes] = useState<string[]>([]);
  const [bookedSlots, setBookedSlots] = useState<number[]>([]);

  const [isConfirming, setIsConfirming] = useState(false);
  const [dialogStep, setDialogStep] = useState<"confirm" | "card-payment" | "pix-status">("confirm");
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [currentPreferenceId, setCurrentPreferenceId] = useState<string | null>(null);
  
  // PIX State
  const [pixDetails, setPixDetails] = useState<{ qrCode: string, qrCodeBase64: string, paymentId: string } | null>(null);
  const [currentPixSessionId, setCurrentPixSessionId] = useState<string | null>(null);


  const [isClient, setIsClient] = useState(false);
  const router = useRouter();
  const { toast } = useToast();
  const { user, userData } = useAuth();
  
  useEffect(() => {
    setIsClient(true);
    if(process.env.NEXT_PUBLIC_MERCADO_PAGO_PUBLIC_KEY) {
        initMercadoPago(process.env.NEXT_PUBLIC_MERCADO_PAGO_PUBLIC_KEY, { locale: 'pt-BR'});
    }
  }, []);

  useEffect(() => {
    const fetchPsychologistDetails = async () => {
        setLoading(true);
        setError(null);

        if (!isFirebaseConfigured || !app || !params.id) {
            setError("A aplicação não está configurada corretamente.");
            setLoading(false);
            return;
        }

        try {
            const functions = getFunctions(app);
            const getDetails = httpsCallable(functions, 'getPsychologistDetails');
            const result = await getDetails({ psychologistId: params.id });
            
            const data = result.data as any;

            setPsychologist({
                ...data.psychologist,
                image: data.psychologist.avatarUrl || "https://placehold.co/400x400.png",
                imageHint: "psychologist professional",
            });
            setBookedSlots(data.bookedSlots);

        } catch (err: any) {
            console.error("Error fetching psychologist details:", err);
            setError(err.message || "Ocorreu um erro ao buscar os dados do psicólogo.");
        } finally {
            setLoading(false);
        }
    };

    if (params.id) {
        fetchPsychologistDetails();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id]);

  useEffect(() => {
    if (selectedDate && psychologist?.availability) {
        const dayKey = dayIndexToKey[selectedDate.getDay()] as keyof typeof psychologist.availability;
        const availabilityForDay = psychologist.availability[dayKey];

        if (availabilityForDay?.enabled) {
            const slots = generateTimeSlots(availabilityForDay.start, availabilityForDay.end, bookedSlots, selectedDate);
            setAvailableTimes(slots);
        } else {
            setAvailableTimes([]);
        }
    } else {
        setAvailableTimes([]);
    }
    setSelectedTime(undefined);
  }, [selectedDate, psychologist, bookedSlots]);
  
  // Add a listener for PIX payment confirmation via webhook
  useEffect(() => {
    if (!currentPixSessionId || !db) return;

    const sessionRef = doc(db, 'sessions', currentPixSessionId);
    const unsubscribe = onSnapshot(sessionRef, (docSnap) => {
        if (docSnap.exists() && docSnap.data().status === 'Pago') {
            toast({
              title: 'Pagamento Aprovado!',
              description: 'Sua sessão foi agendada e está no seu painel.',
            });
            router.push('/dashboard');
            setIsConfirming(false); // Close dialog
        }
    });

    return () => unsubscribe(); // Cleanup listener on component unmount or when pixDetails changes
  }, [currentPixSessionId, router, toast]);

  const handleCreateSession = async (paymentDetails: { paymentMethod: string; id?: string; status?: string; }) => {
    if (!selectedDate || !selectedTime || !psychologist || !app || !user || !userData) {
        toast({ variant: "destructive", title: "Erro Interno", description: "Dados da sessão ou do psicólogo ausentes para criar a sessão." });
        return null;
    }

    try {
        const sessionDate = new Date(selectedDate);
        const [hours, minutes] = selectedTime.split(':').map(Number);
        sessionDate.setHours(hours, minutes, 0, 0);

        const sessionDocId = `session-${psychologist.id}-${sessionDate.getTime()}`;

        await setDoc(doc(db, "sessions", sessionDocId), {
            participantIds: [user.uid, psychologist.id],
            patientId: user.uid,
            patientName: userData.name,
            psychologistId: psychologist.id,
            psychologistName: psychologist.name,
            sessionTimestamp: Timestamp.fromDate(sessionDate),
            createdAt: Timestamp.now(),
            status: 'Pago',
            rate: psychologist.professionalProfile?.rate,
            paymentDetails: paymentDetails,
            reviewed: false,
            effectiveDurationInSeconds: 0,
        });

        toast({
            title: 'Pagamento Aprovado!',
            description: 'Sua sessão foi agendada e está no seu painel.',
        });
        router.push('/dashboard');
        
        return sessionDocId;

    } catch (error: any) {
        console.error("Error creating session after payment:", error);
        toast({
            variant: "destructive",
            title: "Erro Crítico de Agendamento",
            description: error.message || "Seu pagamento foi aprovado, mas não conseguimos agendar sua sessão. Por favor, entre em contato com o suporte imediatamente com o ID do pagamento."
        });
        return null;
    } finally {
        setIsConfirming(false);
        setIsProcessingPayment(false);
    }
  };
  
  const handleInitiatePayment = async (method: 'card' | 'pix') => {
    if (!selectedDate || !selectedTime || !user || !userData || !psychologist) {
        toast({ variant: "destructive", title: "Erro Interno", description: "Dados da sessão ou do usuário ausentes." });
        return;
    }
    setIsProcessingPayment(true);
    
    const sessionDate = new Date(selectedDate);
    const [hours, minutes] = selectedTime.split(':').map(Number);
    sessionDate.setHours(hours, minutes, 0, 0);
    const sessionTimestampMillis = sessionDate.getTime();

    try {
        if (method === 'card') {
            const response = await fetch('/api/create-payment', { 
                method: 'POST', 
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    rate: psychologist.professionalProfile.rate, 
                    psychologistName: psychologist.name,
                    psychologistId: psychologist.id,
                    sessionTimestampMillis: sessionTimestampMillis,
                    payerEmail: userData.email,
                }) 
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.message || 'Falha ao criar preferência de cartão');
            setCurrentPreferenceId(data.preferenceId);
            setDialogStep('card-payment');

        } else { // pix
            setCurrentPixSessionId(`session-${psychologist.id}-${sessionTimestampMillis}`);
            
            const response = await fetch('/api/create-pix-payment', { 
                method: 'POST', 
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                  rate: psychologist.professionalProfile.rate, 
                  payerEmail: userData.email, 
                  description: `Sessão com ${psychologist.name}`,
                  psychologistId: psychologist.id,
                  sessionTimestampMillis: sessionTimestampMillis,
                  patientId: user.uid,
                }) 
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.message || 'Falha ao criar pagamento PIX');
            
            setPixDetails(data);
            setDialogStep('pix-status');
        }

    } catch (error: any) {
        console.error("Error initiating payment:", error);
        toast({ variant: "destructive", title: "Erro ao Iniciar Pagamento", description: error.message });
        setIsProcessingPayment(false);
        setIsConfirming(false);
    } finally {
        if (method === 'card') {
            setIsProcessingPayment(false);
        }
    }
  };
  
  const handlePaymentError = (message: string = "Ocorreu um erro durante o pagamento.") => {
    toast({
      variant: 'destructive',
      title: 'Pagamento Falhou',
      description: message,
    });
    setDialogStep('confirm');
    setIsConfirming(false);
    setIsProcessingPayment(false);
  };

  const openDialog = () => {
    setDialogStep("confirm");
    setCurrentPreferenceId(null);
    setPixDetails(null);
    setIsProcessingPayment(false);
    setIsConfirming(true);
  }
  
  if (loading) {
      return (
        <div className="grid gap-6 md:grid-cols-3">
            <div className="md:col-span-2 grid gap-6">
                <Card>
                    <CardHeader className="flex flex-col md:flex-row items-start md:items-center gap-4">
                        <Skeleton className="h-[200px] w-[200px] rounded-lg shrink-0" />
                        <div className="grid gap-3 w-full">
                           <Skeleton className="h-8 w-3/4" />
                           <Skeleton className="h-5 w-1/2" />
                           <Skeleton className="h-6 w-1/3" />
                           <Skeleton className="h-8 w-1/4" />
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <Skeleton className="h-6 w-1/4 mb-4" />
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-4 w-3/4" />
                    </CardContent>
                </Card>
                 <Card>
                    <CardHeader>
                        <Skeleton className="h-6 w-1/3" />
                        <Skeleton className="h-4 w-1/2" />
                    </CardHeader>
                    <CardContent className="space-y-6 p-6 pt-0">
                       <div className="space-y-2">
                           <Skeleton className="h-5 w-1/4" />
                           <Skeleton className="h-4 w-full" />
                       </div>
                       <div className="space-y-2">
                           <Skeleton className="h-5 w-1/4" />
                           <Skeleton className="h-4 w-full" />
                       </div>
                    </CardContent>
                </Card>
            </div>
            <div className="md:col-span-1">
                <Card>
                    <CardHeader>
                        <Skeleton className="h-6 w-3/4" />
                        <Skeleton className="h-4 w-1/2" />
                    </CardHeader>
                    <CardContent className="flex items-center justify-center p-0">
                        <Skeleton className="h-[305px] w-[280px]" />
                    </CardContent>
                    <CardFooter className="p-6">
                         <Skeleton className="h-10 w-full" />
                    </CardFooter>
                </Card>
            </div>
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
  
  if (!psychologist) {
      return (
         <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Perfil Não Encontrado</AlertTitle>
            <AlertDescription>Não foi possível encontrar dados para este psicólogo.</AlertDescription>
        </Alert>
      );
  }


  return (
    <div className="grid gap-6 md:grid-cols-3">
      <div className="md:col-span-2 grid gap-6">
        <Card>
          <CardHeader className="flex flex-col md:flex-row items-start md:items-center gap-4">
            <Image
              alt={psychologist.name}
              className="aspect-square rounded-lg object-cover"
              height="200"
              src={psychologist.image}
              data-ai-hint={psychologist.imageHint}
              width="200"
            />
            <div className="grid gap-2">
              <CardTitle className="text-2xl">{psychologist.name}</CardTitle>
              <CardDescription>{psychologist.professionalProfile?.title}</CardDescription>
               <div className="flex items-center gap-2">
                  {(psychologist.professionalProfile?.reviewsCount || 0) > 0 ? (
                    <>
                      <div className="flex items-center gap-0.5">
                        {[...Array(5)].map((_, i) => (
                          <Star key={i} className={`w-5 h-5 ${i < Math.round(psychologist.professionalProfile.rating || 0) ? 'fill-primary text-primary' : 'text-muted-foreground'}`} />
                        ))}
                      </div>
                      <span className="text-muted-foreground">
                        ({(psychologist.professionalProfile.rating || 0).toFixed(1)}) - {psychologist.professionalProfile.reviewsCount} {psychologist.professionalProfile.reviewsCount === 1 ? 'avaliação' : 'avaliações'}
                      </span>
                    </>
                  ) : (
                    <span className="text-sm text-muted-foreground">Sem avaliações</span>
                  )}
                </div>
              <p className="text-2xl font-bold">R${psychologist.professionalProfile?.rate}<span className="text-sm font-normal text-muted-foreground">/h</span></p>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4">
              <div>
                <h3 className="font-semibold text-lg mb-2">Sobre</h3>
                <p className="text-muted-foreground">{psychologist.professionalProfile?.bio}</p>
              </div>
               <div>
                <h3 className="font-semibold text-lg mb-2">Áreas de Especialidade</h3>
                <ul className="grid grid-cols-1 md:grid-cols-2 gap-2 text-muted-foreground">
                    {(psychologist.professionalProfile?.specialties || []).map((s : string) => (
                        <li key={s} className="flex items-center gap-2">
                            <CheckCircle className="w-4 h-4 text-primary"/>
                            <span>{s}</span>
                        </li>
                    ))}
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2"><MessageCircle /> Avaliações de Pacientes</CardTitle>
                <CardDescription>O que outros pacientes estão dizendo.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                {psychologist.reviews && psychologist.reviews.length > 0 ? psychologist.reviews.map((review: any, index: number) => (
                    <React.Fragment key={review.id || index}>
                      <div className="text-sm">
                          <div className="flex items-center justify-between mb-1">
                              <div className="flex items-center gap-0.5">
                                  {[...Array(5)].map((_, i) => (
                                      <Star key={i} className={`w-4 h-4 ${i < review.rating ? 'fill-primary text-primary' : 'text-muted-foreground'}`}/>
                                  ))}
                              </div>
                              <p className="text-xs text-muted-foreground">{review.date}</p>
                          </div>
                          <p className="text-muted-foreground">{review.comment}</p>
                      </div>
                      {index < psychologist.reviews.length - 1 && <Separator />}
                    </React.Fragment>
                )) : (
                    <p className="text-muted-foreground text-sm text-center py-4">
                        Este profissional ainda não recebeu avaliações.
                    </p>
                )}
            </CardContent>
        </Card>

      </div>
      <div className="md:col-span-1 grid gap-6">
         <Card>
            <CardHeader>
                <CardTitle>Agendar uma Sessão</CardTitle>
                <CardDescription>Selecione uma data e hora para agendar sua consulta.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col items-center justify-center">
                 {isClient ? (
                   <Calendar
                      mode="single"
                      selected={selectedDate}
                      onSelect={(date) => {
                        setSelectedDate(date);
                      }}
                      className="rounded-md"
                      disabled={(date) => {
                        const dayKey = dayIndexToKey[date.getDay()] as keyof typeof psychologist.availability;
                        const startOfToday = new Date();
                        startOfToday.setHours(0, 0, 0, 0);
                        const isPast = date < startOfToday;
                        const isUnavailable = !psychologist?.availability?.[dayKey]?.enabled;
                        return isPast || isUnavailable;
                      }}
                      locale={ptBR}
                   />
                 ) : (
                   <div className="p-3">
                    <Skeleton className="w-[280px] h-[305px] rounded-md border" />
                   </div>
                 )}
                 {isClient && selectedDate && (
                  <div className="p-4 pt-2 w-full">
                    <h3 className="mb-4 text-center text-sm font-medium text-muted-foreground">
                      Horários disponíveis para {format(selectedDate, 'PPP', { locale: ptBR })}
                    </h3>
                    <div className="grid grid-cols-3 gap-2">
                      {availableTimes.length > 0 ? availableTimes.map((time) => (
                        <Button
                          key={time}
                          variant={selectedTime === time ? "default" : "outline"}
                          onClick={() => setSelectedTime(time)}
                          className="text-xs"
                        >
                          {time}
                        </Button>
                      )) : <p className="col-span-3 text-center text-sm text-muted-foreground">Sem horários disponíveis.</p>}
                    </div>
                  </div>
                )}
            </CardContent>
             <CardFooter>
                <Dialog open={isConfirming} onOpenChange={setIsConfirming}>
                  <DialogTrigger asChild>
                    <Button className="w-full" disabled={!selectedDate || !selectedTime} onClick={openDialog}>Agendar Sessão</Button>
                  </DialogTrigger>
                  <DialogContent className={cn(
                        "sm:max-w-md",
                        dialogStep !== 'confirm' && "sm:max-w-lg"
                    )}>
                    {dialogStep === 'confirm' && (
                      <>
                        <DialogHeader>
                          <DialogTitle>Confirmar Agendamento</DialogTitle>
                          <DialogDescription>
                            Você está prestes a agendar uma sessão com <strong>{psychologist.name}</strong> para o dia <strong>{selectedDate ? format(selectedDate, "PPP", { locale: ptBR }) : ""}</strong> às <strong>{selectedTime}</strong>.
                          </DialogDescription>
                        </DialogHeader>
                        <div className="py-4 space-y-4">
                            <div className="flex justify-between items-center text-lg font-semibold">
                                <span>Total a pagar:</span>
                                <span>R$ {psychologist.professionalProfile?.rate}</span>
                            </div>
                            <Separator />
                         </div>
                        <DialogFooter className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          <Button 
                            onClick={() => handleInitiatePayment('pix')}
                            disabled={isProcessingPayment}
                            variant="secondary"
                          >
                             {isProcessingPayment ? <Loader2 className="animate-spin" /> : "Pagar com PIX"}
                          </Button>
                          <Button 
                            onClick={() => handleInitiatePayment('card')}
                            disabled={isProcessingPayment}
                          >
                            {isProcessingPayment ? <Loader2 className="animate-spin" /> : "Pagar com Cartão"}
                          </Button>
                        </DialogFooter>
                      </>
                    )}
                    {dialogStep === 'card-payment' && (
                       <>
                        <DialogHeader>
                          <DialogTitle className="flex items-center gap-2">
                            <CreditCard className="w-6 h-6"/> Pagamento com Cartão
                          </DialogTitle>
                          <DialogDescription>
                            Realize o pagamento de <strong>R$ {psychologist.professionalProfile?.rate}</strong> para confirmar sua sessão.
                          </DialogDescription>
                        </DialogHeader>
                        <ScrollArea className="h-[450px] py-4">
                           {currentPreferenceId && !isProcessingPayment ? (
                                <Payment
                                    key={currentPreferenceId}
                                    initialization={{
                                        preferenceId: currentPreferenceId,
                                        amount: psychologist.professionalProfile.rate,
                                    }}
                                    customization={{
                                        paymentMethods: {
                                            creditCard: 'all',
                                            debitCard: 'all',
                                        },
                                    }}
                                    onSubmit={async ({ formData }) => {
                                        if (formData.status === 'approved') {
                                            await handleCreateSession({ id: formData.id, paymentMethod: 'card', status: 'approved' });
                                        } else {
                                            handlePaymentError(`O pagamento foi ${formData.status}.`);
                                        }
                                    }}
                                    onError={() => handlePaymentError("Não foi possível processar o pagamento com cartão.")}
                                />
                           ) : (
                                <div className="flex h-full items-center justify-center"><Loader2 className="animate-spin h-8 w-8 text-primary"/></div>
                           )}
                        </ScrollArea>
                       </>
                    )}
                     {dialogStep === 'pix-status' && (
                        <>
                            <DialogHeader>
                            <DialogTitle>Pagar com PIX</DialogTitle>
                            <DialogDescription>
                                Escaneie o QR Code ou use o código para pagar <strong>R$ {psychologist.professionalProfile?.rate}</strong>. A janela fechará automaticamente após a confirmação.
                            </DialogDescription>
                            </DialogHeader>
                            <div className="py-4 flex flex-col items-center justify-center gap-4">
                                {pixDetails?.qrCodeBase64 ? (
                                  <>
                                    <Image 
                                      src={`data:image/jpeg;base64,${pixDetails.qrCodeBase64}`}
                                      alt="PIX QR Code"
                                      width={250}
                                      height={250}
                                    />
                                    <Input 
                                      value={pixDetails.qrCode}
                                      readOnly
                                    />
                                    <Button variant="outline" onClick={() => navigator.clipboard.writeText(pixDetails.qrCode).then(() => toast({ title: 'Copiado!', description: 'Código PIX copiado para a área de transferência.' }))}>Copiar Código</Button>
                                    <p className="text-sm text-muted-foreground flex items-center gap-2">
                                      <Loader2 className="animate-spin h-4 w-4" /> 
                                      Aguardando confirmação do pagamento...
                                    </p>
                                  </>
                                ) : (
                                    <div className="flex h-full items-center justify-center"><Loader2 className="animate-spin h-8 w-8 text-primary"/></div>
                                )}
                            </div>
                        </>
                    )}
                  </DialogContent>
                </Dialog>
            </CardFooter>
         </Card>
      </div>
    </div>
  );
}
