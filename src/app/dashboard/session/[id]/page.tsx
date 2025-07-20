
"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter, useParams } from 'next/navigation';
import '@livekit/components-styles';
import {
  LiveKitRoom,
  RoomAudioRenderer,
  ControlBar,
  GridLayout,
  Chat,
  useRoomContext,
  useRemoteParticipants,
} from '@livekit/components-react';
import { ConnectionState } from 'livekit-client';

import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { Loader2, Timer } from 'lucide-react';
import { db } from '@/lib/firebase';
import { doc, updateDoc } from 'firebase/firestore';

function formatTime(seconds: number) {
  const mins = Math.floor(seconds / 60).toString().padStart(2, '0');
  const secs = (seconds % 60).toString().padStart(2, '0');
  return `${mins}:${secs}`;
}

function RoomContent({ sessionId }: { sessionId: string }) {
  const room = useRoomContext();
  const router = useRouter();
  const { toast } = useToast();
  const remoteParticipants = useRemoteParticipants();
  const [sessionTime, setSessionTime] = useState(0);

  const isPsychologistPresent = useMemo(() => {
    return remoteParticipants.length > 0;
  }, [remoteParticipants]);

  useEffect(() => {
    let interval: NodeJS.Timeout | undefined;
    if (room.state === 'connected' && isPsychologistPresent) {
      interval = setInterval(() => {
        setSessionTime(prevTime => prevTime + 1);
      }, 1000);
    }
    return () => {
        if(interval) clearInterval(interval);
    };
  }, [room.state, isPsychologistPresent]);

  const handleDisconnect = async () => {
    if (db) {
        try {
            const sessionRef = doc(db, 'sessions', sessionId);
            await updateDoc(sessionRef, {
                effectiveDurationInSeconds: sessionTime,
            });
        } catch (error) {
            console.error('Failed to update session duration on patient leave:', error);
            // Non-critical, so we don't bother the user with a toast here.
        }
    }
    toast({
        title: "Sessão Encerrada",
        description: "Você saiu da sala de sessão.",
    });
    router.push('/dashboard');
    room.disconnect();
  }

  if (room.state !== 'connected') {
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
    <div className="grid grid-cols-1 md:grid-cols-4 h-full gap-4">
      <div className="md:col-span-3 h-full flex flex-col">
        <div className="flex-grow">
          <GridLayout />
        </div>
        <div className="h-[90px] relative">
          <div className="absolute top-[-40px] left-1/2 -translate-x-1/2 bg-muted text-muted-foreground px-3 py-1 rounded-md text-sm font-mono flex items-center gap-2">
            <Timer className="h-4 w-4" />
            <span>{formatTime(sessionTime)}</span>
          </div>
          <ControlBar onDisconnect={handleDisconnect} />
        </div>
      </div>
      <div className="md:col-span-1 h-full">
        <Chat />
      </div>
    </div>
  );
}

function SessionRoom({ roomName, userName, sessionId }: { roomName: string, userName: string, sessionId: string }) {
  const router = useRouter();
  const { toast } = useToast();

  return (
    <LiveKitRoom
      video={true}
      audio={true}
      serverUrl={process.env.NEXT_PUBLIC_LIVEKIT_WS_URL}
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
            description: `Não foi possível conectar-se à sala: ${e.message}`,
          });
          router.push('/dashboard');
          return '';
        }
      }}
      data-lk-theme="default"
      className="h-full"
    >
      <RoomContent sessionId={sessionId} />
      <RoomAudioRenderer />
    </LiveKitRoom>
  );
}

export default function SessionRoomPage() {
  const params = useParams<{ id: string }>();
  const roomName = `session-${params.id}`;
  const { user, userData, loading } = useAuth();

  if (loading || !user || !userData) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="flex flex-col items-center gap-2">
            <Loader2 className="h-8 w-8 animate-spin" />
            <p className="ml-2 text-muted-foreground">Autenticando e preparando a sala...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full max-h-[calc(100vh-8rem)]">
      <SessionRoom roomName={roomName} userName={userData.name} sessionId={params.id as string} />
    </div>
  );
}

    