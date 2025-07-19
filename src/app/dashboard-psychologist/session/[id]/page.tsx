
"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  NotebookPen,
  Loader2,
  MessageCircle,
  Timer,
} from "lucide-react";
import '@livekit/components-styles';
import {
  LiveKitRoom,
  RoomAudioRenderer,
  GridLayout,
  ControlBar,
  Chat,
  useRoomContext,
  ConnectionState,
  useRemoteParticipants,
} from '@livekit/components-react';

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { db } from '@/lib/firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';

function formatTime(seconds: number) {
  const mins = Math.floor(seconds / 60).toString().padStart(2, '0');
  const secs = (seconds % 60).toString().padStart(2, '0');
  return `${mins}:${secs}`;
}

function RoomContent({ sessionId }: { sessionId: string }) {
  const room = useRoomContext();
  const remoteParticipants = useRemoteParticipants();
  const [notes, setNotes] = useState('');
  const [isSavingNotes, setIsSavingNotes] = useState(false);
  const [sessionTime, setSessionTime] = useState(0);
  const { toast } = useToast();

  const isPatientPresent = useMemo(() => {
    return remoteParticipants.length > 0;
  }, [remoteParticipants]);

  useEffect(() => {
    let interval: NodeJS.Timeout | undefined;
    if (room.state === ConnectionState.Connected && isPatientPresent) {
      interval = setInterval(() => {
        setSessionTime(prevTime => prevTime + 1);
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [room.state, isPatientPresent]);

  useEffect(() => {
    const fetchNotes = async () => {
      if (!db) return;
      const sessionRef = doc(db, 'sessions', sessionId);
      const sessionSnap = await getDoc(sessionRef);
      if (sessionSnap.exists()) {
        setNotes(sessionSnap.data().psychologistNote || '');
        // Do not reset sessionTime from Firestore to allow it to continue from where it was
        if (sessionTime === 0 && sessionSnap.data().effectiveDurationInSeconds > 0) {
           setSessionTime(sessionSnap.data().effectiveDurationInSeconds);
        }
      }
    };
    fetchNotes();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId]);

  const handleSaveNotes = async () => {
    if (!db || !sessionId) return;
    setIsSavingNotes(true);
    try {
      const sessionRef = doc(db, 'sessions', sessionId);
      await updateDoc(sessionRef, {
        psychologistNote: notes,
      });
      toast({
        title: "Anotações Salvas",
        description: "Suas anotações da sessão foram salvas com sucesso.",
      });
    } catch (error) {
      console.error("Error saving notes:", error);
      toast({
        variant: "destructive",
        title: "Erro ao Salvar",
        description: "Não foi possível salvar suas anotações. Tente novamente.",
      });
    } finally {
      setIsSavingNotes(false);
    }
  };

  const handleDisconnect = async () => {
    if (!db) {
      room.disconnect();
      return;
    }
    
    try {
      const sessionRef = doc(db, 'sessions', sessionId);
      await updateDoc(sessionRef, { 
        status: 'Concluída',
        effectiveDurationInSeconds: sessionTime,
      });
      room.disconnect();
    } catch (error) {
      console.error('Failed to update session status on leave:', error);
      toast({
        variant: 'destructive',
        title: 'Erro ao Finalizar Sessão',
        description: 'Não foi possível atualizar o status da sessão. Por favor, verifique seu histórico.',
      });
      room.disconnect();
    }
  };

  if (room.state !== ConnectionState.Connected) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="h-8 w-8 animate-spin" />
          <p className="text-muted-foreground">Conectando à sala...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 grid grid-cols-1 lg:grid-cols-4 gap-4 min-h-0">
      <div className="lg:col-span-3 h-full min-h-[400px] flex flex-col">
        <div className="flex-grow">
          <GridLayout />
        </div>
        <div className="h-[90px] relative">
          <div className="absolute top-[-40px] left-1/2 -translate-x-1/2 bg-muted text-muted-foreground px-3 py-1 rounded-md text-sm font-mono flex items-center gap-2">
            <Timer className="h-4 w-4" />
            <span>{formatTime(sessionTime)}</span>
          </div>
          <ControlBar onDisconnect={handleDisconnect}/>
        </div>
      </div>
      <div className="lg:col-span-1 flex flex-col min-h-0">
        <Tabs defaultValue="chat" className="h-full flex flex-col">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="chat"><MessageCircle className="h-4 w-4 mr-2" />Chat</TabsTrigger>
            <TabsTrigger value="notes"><NotebookPen className="h-4 w-4 mr-2" />Notas</TabsTrigger>
          </TabsList>
          <TabsContent value="chat" className="flex-grow min-h-0">
            <Chat />
          </TabsContent>
          <TabsContent value="notes" className="flex-grow min-h-0">
            <Card className="flex flex-col flex-1 h-full">
              <CardHeader className="p-4 border-b">
                <CardTitle className="text-base">Bloco de Notas (Privado)</CardTitle>
                <CardDescription className="text-xs">Essas notas são visíveis apenas para você.</CardDescription>
              </CardHeader>
              <CardContent className="p-4 flex-1 flex flex-col gap-4">
                <Textarea
                  placeholder="Anote aqui pontos importantes da sessão..."
                  className="flex-1 resize-none"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
                <Button onClick={handleSaveNotes} disabled={isSavingNotes}>
                  {isSavingNotes ? <Loader2 className="animate-spin" /> : "Salvar Anotações"}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

function SessionRoom({ roomName, userName, sessionId }: { roomName: string, userName: string, sessionId: string }) {
  const router = useRouter();
  const { toast } = useToast();

  const handleDisconnected = () => {
    toast({
      title: 'Sessão Encerrada',
      description: 'Você saiu da sala de sessão. O status foi atualizado para "Concluída".',
    });
    router.push('/dashboard-psychologist');
  };

  return (
    <LiveKitRoom
      video={true}
      audio={true}
      serverUrl={process.env.NEXT_PUBLIC_LIVEKIT_WS_URL}
      onDisconnected={handleDisconnected}
      token={async () => {
        try {
          const resp = await fetch(
            `/api/token?room=${roomName}&username=${userName}`
          );
          const data = await resp.json();
          if (data.error) {
            throw new Error(data.error);
          }
          return data.token;
        } catch (e: any) {
          console.error(e);
          toast({
            variant: 'destructive',
            title: 'Erro de Conexão',
            description: `Não foi possível conectar-se à sala: ${e.message}`
          });
          router.push('/dashboard-psychologist');
          return '';
        }
      }}
      data-lk-theme="default"
      className="flex-grow flex flex-col"
    >
      <RoomContent sessionId={sessionId} />
      <RoomAudioRenderer />
    </LiveKitRoom>
  );
}

export default function PsychologistSessionRoomPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const roomName = `session-${params.id}`;

  const { toast } = useToast();
  const { user, userData, loading } = useAuth();

  const [sessionData, setSessionData] = useState<any>(null);
  const [loadingSession, setLoadingSession] = useState(true);

  useEffect(() => {
    const fetchSessionData = async () => {
      if (user && params.id && db) {
        setLoadingSession(true);
        const sessionRef = doc(db, 'sessions', params.id as string);
        const sessionSnap = await getDoc(sessionRef);

        if (sessionSnap.exists() && sessionSnap.data().psychologistId === user.uid) {
          const data = sessionSnap.data();
          setSessionData(data);
        } else {
          toast({ variant: 'destructive', title: 'Erro', description: 'Sessão não encontrada ou acesso negado.' });
          router.push('/dashboard-psychologist');
        }
        setLoadingSession(false);
      } else {
          setLoadingSession(false);
      }
    };
    fetchSessionData();
  }, [user, params.id, router, toast]);

  if (loading || loadingSession || !user || !userData || !sessionData) {
    return (
      <div className="flex flex-col h-full max-h-[calc(100vh-8rem)] gap-4">
        <Skeleton className="h-12 w-1/2" />
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-4 gap-4 min-h-0">
          <Skeleton className="lg:col-span-3 h-full w-full rounded-lg" />
          <Skeleton className="h-full w-full rounded-lg" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full max-h-[calc(100vh-8rem)]">
      <header className="mb-4">
        <h1 className="text-2xl font-bold">
          Sessão com {sessionData.patientName}
        </h1>
        <p className="text-muted-foreground">ID da Sessão: {params.id}</p>
      </header>
      <SessionRoom roomName={roomName} userName={userData.name} sessionId={params.id as string} />
    </div>
  );
}
