
"use client";

import React, { useState, useMemo, useEffect } from 'react';
import Image from "next/image";
import Link from "next/link";
import { getFunctions, httpsCallable } from "firebase/functions";
import {
  ListFilter,
  Search,
  Star,
  ArrowDownUp,
  AlertCircle,
  Loader2
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { app } from '@/lib/firebase';

const dayIndexToKey = ['domingo', 'segunda', 'terca', 'quarta', 'quinta', 'sexta', 'sabado'];

const isPsychologistAvailableNow = (availability: any) => {
    if (!availability) return false;

    // Get current time in Brasília timezone
    const nowBrasilia = new Date(new Date().toLocaleString("en-US", { timeZone: "America/Sao_Paulo" }));
    const dayKey = dayIndexToKey[nowBrasilia.getDay()];
    const availabilityForToday = availability[dayKey];

    if (!availabilityForToday || !availabilityForToday.enabled) {
        return false;
    }

    const [startHour, startMinute] = availabilityForToday.start.split(':').map(Number);
    const [endHour, endMinute] = availabilityForToday.end.split(':').map(Number);
    
    const currentHour = nowBrasilia.getHours();
    const currentMinute = nowBrasilia.getMinutes();

    const startTimeInMinutes = startHour * 60 + startMinute;
    const endTimeInMinutes = endHour * 60 + endMinute;
    const currentTimeInMinutes = currentHour * 60 + currentMinute;
    
    return currentTimeInMinutes >= startTimeInMinutes && currentTimeInMinutes < endTimeInMinutes;
};


export default function PsychologistsPage() {
  const [psychologists, setPsychologists] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSpecialties, setSelectedSpecialties] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState('rating');
  const { toast } = useToast();
  
  useEffect(() => {
    const fetchPsychologists = async () => {
      setLoading(true);
      setError(null);
      if (!app) {
        setError("Firebase não está configurado. Não é possível buscar psicólogos.");
        setLoading(false);
        return;
      }
      try {
        const functions = getFunctions(app);
        const getPsychologistsFn = httpsCallable(functions, 'getPsychologists');
        const result = await getPsychologistsFn();
        const data = result.data as { psychologists?: any[], error?: string };

        if (data.error) {
            throw new Error(data.error);
        }
        
        setPsychologists(data.psychologists || []);
      } catch (err: any) {
        console.error("--- DETAILED PSYCHOLOGIST FETCH ERROR ---", err);
        const userFriendlyMessage = err.message || "Não foi possível carregar a lista de psicólogos. Verifique sua conexão e tente novamente.";
        setError(userFriendlyMessage);
        toast({
          variant: 'destructive',
          title: 'Erro ao Carregar Psicólogos',
          description: userFriendlyMessage,
        });
      } finally {
        setLoading(false);
      }
    };

    fetchPsychologists();
  }, [toast]);
  
  const allSpecialties = useMemo(() => {
    if (!psychologists) return [];
    return [...new Set(psychologists.flatMap(p => p.specialties || []))].sort();
  }, [psychologists]);

  const filteredAndSortedPsychologists = useMemo(() => {
    if (!psychologists) return [];
    let filtered = psychologists;

    if (searchQuery) {
        const lowercasedQuery = searchQuery.toLowerCase();
        filtered = filtered.filter(p => 
            p.name.toLowerCase().includes(lowercasedQuery) || 
            (p.specialties || []).some((s: string) => s.toLowerCase().includes(lowercasedQuery))
        );
    }
    
    if (selectedSpecialties.length > 0) {
        filtered = filtered.filter(p => 
            (p.specialties || []).some((s: string) => selectedSpecialties.includes(s))
        );
    }

    const sorted = [...filtered];

    switch (sortBy) {
        case 'price-asc':
            sorted.sort((a, b) => a.rate - b.rate);
            break;
        case 'price-desc':
            sorted.sort((a, b) => b.rate - a.rate);
            break;
        case 'rating':
        default:
             sorted.sort((a, b) => (b.rating || 0) - (a.rating || 0));
            break;
    }

    return sorted;
  }, [searchQuery, selectedSpecialties, sortBy, psychologists]);

  const availableNowPsychologists = useMemo(() => {
    return filteredAndSortedPsychologists.filter(p => isPsychologistAvailableNow(p.availability));
  }, [filteredAndSortedPsychologists]);


  const handleSpecialtyChange = (specialty: string, checked: boolean) => {
    setSelectedSpecialties(prev => {
        if (checked) {
            return [...prev, specialty];
        } else {
            return prev.filter(s => s !== specialty);
        }
    });
  };
  
  const PsychologistList = ({ list } : { list: any[] }) => {
    if (list.length > 0) {
      return (
        <div className="grid gap-4 md:grid-cols-2 md:gap-8 lg:grid-cols-3 xl:grid-cols-4 mt-4">
          {list.map((p) => (
            <Card key={p.id}>
              <Link href={`/dashboard/psychologists/${p.id}`} className="flex flex-col h-full">
                <CardHeader className="p-0">
                  <Image
                    src={p.image}
                    alt={p.name}
                    data-ai-hint={p.imageHint}
                    width={400}
                    height={400}
                    className="aspect-square w-full rounded-t-lg object-cover"
                  />
                </CardHeader>
                <CardContent className="p-4 grid gap-2 flex-grow">
                   <h3 className="text-lg font-semibold">{p.name}</h3>
                    {p.reviewsCount > 0 ? (
                        <div className="flex items-center gap-1 text-sm">
                            <Star className="w-4 h-4 fill-primary text-primary" />
                            <span>{p.rating.toFixed(1)}</span>
                            <span className="text-muted-foreground">({p.reviewsCount} {p.reviewsCount === 1 ? 'avaliação' : 'avaliações'})</span>
                        </div>
                    ) : (
                        <div className="text-sm text-muted-foreground h-5 flex items-center">Sem avaliações</div>
                    )}
                  <div className="flex gap-1.5 flex-wrap">
                    {(p.specialties || []).map((s: string) => <Badge variant="secondary" key={s}>{s}</Badge>)}
                  </div>
                </CardContent>
                <CardFooter className="p-4 pt-0 mt-auto">
                  <div className="text-lg font-bold w-full text-right">R${p.rate}<span className="text-sm font-normal text-muted-foreground">/h</span></div>
                </CardFooter>
              </Link>
            </Card>
          ))}
        </div>
      );
    }
    return (
      <div className="text-center py-16">
        <p className="text-lg text-muted-foreground">Nenhum psicólogo encontrado.</p>
        <p className="text-sm text-muted-foreground">Tente ajustar sua busca ou filtros.</p>
      </div>
    );
  };

  const renderSkeletons = () => (
    <div className="grid gap-4 md:grid-cols-2 md:gap-8 lg:grid-cols-3 xl:grid-cols-4">
      {Array.from({ length: 8 }).map((_, index) => (
        <Card key={index}>
          <CardHeader className="p-0">
            <Skeleton className="aspect-square w-full rounded-t-lg" />
          </CardHeader>
          <CardContent className="p-4 grid gap-3">
            <Skeleton className="h-6 w-3/4" />
            <Skeleton className="h-5 w-1/4" />
            <Skeleton className="h-4 w-24" />
            <div className="flex gap-1.5 flex-wrap">
              <Skeleton className="h-5 w-12 rounded-full" />
              <Skeleton className="h-5 w-16 rounded-full" />
            </div>
          </CardContent>
          <CardFooter className="p-4 pt-0">
            <Skeleton className="h-7 w-1/4 ml-auto" />
          </CardFooter>
        </Card>
      ))}
    </div>
  );

  return (
    <Tabs defaultValue="all">
      <div className="flex items-center">
        <TabsList>
          <TabsTrigger value="all">Todos</TabsTrigger>
          <TabsTrigger value="available">Disponíveis agora</TabsTrigger>
          <TabsTrigger value="recommended" disabled>Recomendados</TabsTrigger>
        </TabsList>
        <div className="ml-auto flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-8 gap-1">
                <ArrowDownUp className="h-3.5 w-3.5" />
                <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">
                  Ordenar
                </span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Ordenar por</DropdownMenuLabel>
              <DropdownMenuRadioGroup value={sortBy} onValueChange={setSortBy}>
                <DropdownMenuRadioItem value="rating">Melhores Avaliações</DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="price-asc">Preço: do Menor para o Maior</DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="price-desc">Preço: do Maior para o Menor</DropdownMenuRadioItem>
              </DropdownMenuRadioGroup>
            </DropdownMenuContent>
          </DropdownMenu>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-8 gap-1">
                <ListFilter className="h-3.5 w-3.5" />
                <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">
                  Filtrar
                </span>
                {selectedSpecialties.length > 0 && (
                    <Badge variant="secondary" className="rounded-sm px-1 font-normal">
                        {selectedSpecialties.length}
                    </Badge>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Filtrar por Especialidade</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {allSpecialties.map(specialty => (
                <DropdownMenuCheckboxItem
                  key={specialty}
                  checked={selectedSpecialties.includes(specialty)}
                  onCheckedChange={(checked) => handleSpecialtyChange(specialty, !!checked)}
                >
                  {specialty}
                </DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          <div className="relative ml-auto flex-1 md:grow-0">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Busque por nome ou especialidade..."
              className="w-full rounded-lg bg-background pl-8 md:w-[200px] lg:w-[320px]"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>
      </div>
      <TabsContent value="all">
        {loading && renderSkeletons()}
        {!loading && error && (
            <Alert variant="destructive" className="mt-4">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Erro ao Carregar Psicólogos</AlertTitle>
                <AlertDescription>
                    {error}
                </AlertDescription>
            </Alert>
        )}
        {!loading && !error && <PsychologistList list={filteredAndSortedPsychologists} />}
      </TabsContent>
      <TabsContent value="available">
        {loading && renderSkeletons()}
        {!loading && error && (
            <Alert variant="destructive" className="mt-4">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Erro ao Carregar Psicólogos</AlertTitle>
                <AlertDescription>
                    {error}
                </AlertDescription>
            </Alert>
        )}
        {!loading && !error && <PsychologistList list={availableNowPsychologists} />}
      </TabsContent>
    </Tabs>
  );
}
