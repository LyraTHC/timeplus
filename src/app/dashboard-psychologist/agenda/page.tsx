
"use client";

import React, { useState, useMemo, useEffect } from 'react';
import { format, isSameDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/hooks/useAuth';
import { db } from '@/lib/firebase';
import { collection, getDocs, query, where } from 'firebase/firestore';

type Appointment = {
  id: string;
  patient: string;
  date: Date;
};

export default function AgendaPage() {
    const [date, setDate] = useState<Date | undefined>(new Date());
    const [appointments, setAppointments] = useState<Appointment[]>([]);
    const [loading, setLoading] = useState(true);
    const { user } = useAuth();
    
    useEffect(() => {
        const fetchAppointments = async () => {
          if (!user || !db) {
            setLoading(false);
            setAppointments([]);
            return;
          }
          setLoading(true);
          try {
              const sessionsCollection = collection(db, "sessions");
              const q = query(sessionsCollection, where("participantIds", "array-contains", user.uid));
              const querySnapshot = await getDocs(q);
              
              const fetchedAppointments: Appointment[] = querySnapshot.docs.map(doc => {
                const data = doc.data();
                return {
                  id: doc.id,
                  patient: data.patientName,
                  date: data.sessionTimestamp.toDate(),
                };
              });
  
              setAppointments(fetchedAppointments);
          } catch (error) {
              console.error("Error fetching appointments:", error);
          } finally {
              setLoading(false);
          }
        };

        fetchAppointments();
    }, [user]);

    const appointmentDates = useMemo(() => {
        return appointments.map(a => a.date);
    }, [appointments]);

    const appointmentsForSelectedDay = useMemo(() => {
        if (!date) return [];
        return appointments
            .filter(a => isSameDay(a.date, date))
            .sort((a, b) => a.date.getTime() - b.date.getTime());
    }, [date, appointments]);

  return (
    <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-3">
      <div className="lg:col-span-2">
        <Card>
            <CardHeader>
            <CardTitle>Calendário de Sessões</CardTitle>
            <CardDescription>
                Visualize seus agendamentos. Dias com sessões estão marcados.
            </CardDescription>
            </CardHeader>
            <CardContent className="flex justify-center">
            {loading ? (
              <Skeleton className="w-[350px] h-[375px] rounded-md border" />
            ) : (
              <Calendar
                  mode="single"
                  selected={date}
                  onSelect={setDate}
                  className="rounded-md border"
                  locale={ptBR}
                  modifiers={{ booked: appointmentDates }}
                  modifiersStyles={{
                      booked: { 
                          borderColor: "hsl(var(--primary))",
                          borderWidth: "2px",
                      }
                  }}
              />
            )}
            </CardContent>
        </Card>
      </div>
      <div className="lg:col-span-1">
         <Card>
            <CardHeader>
                <CardTitle>
                    Agenda para {date ? format(date, 'PPP', { locale: ptBR }) : <Skeleton className="h-6 w-40 inline-block"/>}
                </CardTitle>
                {loading ? (
                  <Skeleton className="h-4 w-32" />
                ) : (
                  <CardDescription>
                    {`${appointmentsForSelectedDay.length} sessão(ões) agendada(s).`}
                  </CardDescription>
                )}
            </CardHeader>
            <CardContent>
                {loading ? (
                    <div className="space-y-4">
                      {[...Array(2)].map((_, i) => (
                        <div key={i} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                            <div>
                                <Skeleton className="h-5 w-24 mb-1" />
                                <Skeleton className="h-4 w-20" />
                            </div>
                            <Skeleton className="h-6 w-12 rounded-full" />
                        </div>
                      ))}
                    </div>
                ) : (
                  appointmentsForSelectedDay.length > 0 ? (
                      <div className="space-y-4">
                          {appointmentsForSelectedDay.map(apt => (
                              <div key={apt.id} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                                  <div>
                                      <p className="font-semibold">{apt.patient}</p>
                                      <p className="text-sm text-muted-foreground">Sessão Online</p>
                                  </div>
                                  <Badge variant="default">{format(apt.date, 'HH:mm')}</Badge>
                              </div>
                          ))}
                      </div>
                  ) : (
                      <p className="text-sm text-muted-foreground text-center py-8">
                          Nenhuma sessão agendada para este dia.
                      </p>
                  )
              )}
            </CardContent>
         </Card>
      </div>
    </div>
  );
}
