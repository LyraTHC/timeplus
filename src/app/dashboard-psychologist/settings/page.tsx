
"use client";

import React, { useState, useEffect, useRef } from 'react';
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from "@/components/ui/input";
import { Textarea } from '@/components/ui/textarea';
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { db, storage } from '@/lib/firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import { Camera, Loader2 } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ImageCropperDialog } from '@/components/ImageCropperDialog';


const weekDays = [
  { id: 'segunda', label: 'Segunda-feira' },
  { id: 'terca', label: 'Terça-feira' },
  { id: 'quarta', label: 'Quarta-feira' },
  { id: 'quinta', label: 'Quinta-feira' },
  { id: 'sexta', label: 'Sexta-feira' },
  { id: 'sabado', label: 'Sábado' },
  { id: 'domingo', label: 'Domingo' },
];

const defaultAvailability = {
    segunda: { enabled: true, start: '09:00', end: '18:00' },
    terca: { enabled: true, start: '09:00', end: '18:00' },
    quarta: { enabled: true, start: '09:00', end: '18:00' },
    quinta: { enabled: true, start: '09:00', end: '18:00' },
    sexta: { enabled: true, start: '09:00', end: '14:00' },
    sabado: { enabled: false, start: '09:00', end: '12:00' },
    domingo: { enabled: false, start: '09:00', end: '12:00' },
};

const countryCodes = [
  { value: '+55', label: '🇧🇷 +55' },
  { value: '+1', label: '🇺🇸 +1' },
  { value: '+351', label: '🇵🇹 +351' },
  { value: '+44', label: '🇬🇧 +44' },
];

const specialtyCategories = {
    "Abordagens Terapêuticas": [
        "TCC (Terapia Cognitivo-Comportamental)",
        "Psicanálise",
        "Gestalt-Terapia",
        "Terapia Humanista / Centrada na Pessoa",
        "Terapia Sistêmica (Familiar e Casal)",
        "Logoterapia",
        "Análise do Comportamento (ABA)",
        "Psicologia Existencial",
        "Psicologia Positiva",
        "Neuropsicologia",
        "Arteterapia",
        "Psicomotricidade"
    ],
    "Temas e Áreas de Foco": [
        "Ansiedade e Estresse",
        "Depressão e Transtornos de Humor",
        "Relacionamentos Afetivos",
        "Desenvolvimento de Carreira",
        "Traumas e TEPT",
        "Luto e Perdas",
        "Dependência Química",
        "Transtornos Alimentares",
        "Sexualidade e Gênero",
        "Conflitos Familiares",
        "Altas Habilidades / Superdotação"
    ],
    "Áreas de Atuação Específicas": [
        "Psicopedagogia",
        "Avaliação Psicológica",
        "Saúde (Hospitalar, Oncológica, Paliativa)",
        "Esportiva",
        "Organizacional e do Trabalho",
        "Jurídica e Forense",
        "Trânsito",
        "Social e Comunitária"
    ]
};


export default function SettingsPage() {
  const { toast } = useToast();
  const { user, userData, setUserData, loading: authLoading } = useAuth();

  // Profile State
  const [name, setName] = useState('');
  const [countryCode, setCountryCode] = useState('+55');
  const [localWhatsapp, setLocalWhatsapp] = useState('');
  const [crp, setCrp] = useState('');
  const [title, setTitle] = useState('');
  const [bio, setBio] = useState('');
  const [specialties, setSpecialties] = useState<string[]>([]);
  const [rate, setRate] = useState(150);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  
  // Avatar State
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [imageToCrop, setImageToCrop] = useState<string | null>(null);
  const [originalFile, setOriginalFile] = useState<File | null>(null);


  // Availability State
  const [availability, setAvailability] = useState(defaultAvailability);
  const [isSavingAvailability, setIsSavingAvailability] = useState(false);
  
  // Payout State
  const [bank, setBank] = useState('');
  const [agency, setAgency] = useState('');
  const [account, setAccount] = useState('');
  const [isSavingPayouts, setIsSavingPayouts] = useState(false);
  
  const loading = authLoading || !userData;

  useEffect(() => {
    if (userData) {
      setName(userData.name || '');
      if (userData.whatsapp) {
        const foundCode = countryCodes.find(c => userData.whatsapp.startsWith(c.value));
        if (foundCode) {
            setCountryCode(foundCode.value);
            setLocalWhatsapp(userData.whatsapp.substring(foundCode.value.length));
        } else {
            setCountryCode('+55');
            setLocalWhatsapp(userData.whatsapp.replace('+', ''));
        }
      } else {
        setCountryCode('+55');
        setLocalWhatsapp('');
      }
      // Profile
      setCrp(userData.professionalProfile?.crp || '');
      setTitle(userData.professionalProfile?.title || '');
      setBio(userData.professionalProfile?.bio || '');
      setSpecialties(userData.professionalProfile?.specialties || []);
      setRate(userData.professionalProfile?.rate || 150);
      // Availability
      if (userData.availability) {
        setAvailability(userData.availability);
      }
      // Payout
      setBank(userData.payoutInfo?.bank || '');
      setAgency(userData.payoutInfo?.agency || '');
      setAccount(userData.payoutInfo?.account || '');
    }
  }, [userData]);
  
  const handleAvailabilityChange = (day: string, field: string, value: string | boolean) => {
    setAvailability(prev => ({
      ...prev,
      [day]: {
        ...prev[day as keyof typeof prev],
        [field]: value,
      },
    }));
  };

  const handleSpecialtyChange = (specialty: string, checked: boolean) => {
    setSpecialties(prev => 
        checked ? [...prev, specialty] : prev.filter(s => s !== specialty)
    );
  };

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) { // 5MB limit
        toast({ variant: 'destructive', title: 'Arquivo muito grande', description: 'Por favor, selecione uma imagem com menos de 5MB.' });
        return;
    }
    
    setOriginalFile(file);
    const reader = new FileReader();
    reader.addEventListener('load', () => {
      setImageToCrop(reader.result as string);
    });
    reader.readAsDataURL(file);
    if (event.target) {
        event.target.value = '';
    }
  };

  const handleSaveCroppedImage = async (croppedBlob: Blob) => {
    if (!user || !storage || !originalFile || !db) return;

    setIsUploading(true);
    const storageRef = ref(storage, `avatars/${user.uid}/${originalFile.name}`);

    try {
        const snapshot = await uploadBytes(storageRef, croppedBlob);
        const downloadURL = await getDownloadURL(snapshot.ref);

        const userRef = doc(db, 'users', user.uid);
        await updateDoc(userRef, { avatarUrl: downloadURL });

        setUserData(prev => prev ? { ...prev, avatarUrl: downloadURL } : null);
        
        toast({ title: 'Avatar atualizado!', description: 'Sua nova foto de perfil foi salva.' });
    } catch (error: any) {
        console.error("Error uploading avatar:", error);
        let description = 'Não foi possível salvar sua nova foto.';
        if (error.code === 'storage/unauthorized') {
            description = 'Você não tem permissão para fazer o upload. Por favor, implante as regras do Storage e tente novamente.';
        } else if (error.code) {
            description = `Ocorreu um erro: ${error.code}`;
        }
        toast({ variant: 'destructive', title: 'Erro no Upload', description });
    } finally {
        setIsUploading(false);
        setImageToCrop(null);
        setOriginalFile(null);
    }
  };


  const handleSave = async (section: string, dataToSave: object, savingSetter: (isSaving: boolean) => void) => {
    if (!db || !user) {
        toast({ title: "Erro de Conexão", description: `Não foi possível salvar ${section}. Verifique sua conexão.` });
        return;
    }

    if (section === 'Perfil' && (!name.trim() || !localWhatsapp.trim() || !crp.trim() || !title.trim())) {
         toast({ variant: 'destructive', title: 'Campos Obrigatórios', description: 'Nome, WhatsApp, CRP e Título são obrigatórios.' });
         return;
    }

    savingSetter(true);
    try {
        const userRef = doc(db, 'users', user.uid);
        
        // Special handling for profile to merge nested objects correctly
        if (section === 'Perfil') {
            const fullWhatsapp = `${countryCode}${localWhatsapp.replace(/\D/g, '')}`;
            const data = {
                name,
                whatsapp: fullWhatsapp,
                professionalProfile: {
                    ...(userData?.professionalProfile || {}),
                    ...dataToSave
                }
            };
            await updateDoc(userRef, data);
            setUserData(prev => prev ? { ...prev, ...data } : null);
        } else {
            await updateDoc(userRef, dataToSave);
            setUserData(prev => prev ? { ...prev, ...dataToSave } : null);
        }

        toast({
            title: "Configurações Salvas!",
            description: `Suas alterações na seção de ${section} foram salvas com sucesso.`,
        });
    } catch (error) {
        console.error(`Error saving ${section}:`, error);
        toast({
            variant: "destructive",
            title: `Erro ao Salvar ${section}`,
            description: "Ocorreu um erro. Por favor, tente novamente.",
        });
    } finally {
        savingSetter(false);
    }
  };


  if (loading) {
    return (
        <div className='grid gap-6'>
            <div className="flex items-center mb-4">
                <h1 className="text-lg font-semibold md:text-2xl">Configurações</h1>
            </div>
            <Card>
                <CardHeader>
                    <Skeleton className='h-8 w-48' />
                    <Skeleton className='h-4 w-64' />
                </CardHeader>
                <CardContent className='space-y-4'>
                    <Skeleton className='h-10 w-full' />
                    <Skeleton className='h-10 w-full' />
                    <Skeleton className='h-10 w-full' />
                </CardContent>
                <CardFooter>
                    <Skeleton className='h-10 w-32' />
                </CardFooter>
            </Card>
        </div>
    );
  }

  return (
    <>
      <div className="flex items-center mb-4">
        <h1 className="text-lg font-semibold md:text-2xl">Configurações</h1>
      </div>
      <Tabs defaultValue="profile" className="w-full">
        <TabsList className="grid w-full max-w-xl grid-cols-4">
          <TabsTrigger value="profile">Perfil</TabsTrigger>
          <TabsTrigger value="availability">Disponibilidade</TabsTrigger>
          <TabsTrigger value="payouts">Recebimentos</TabsTrigger>
          <TabsTrigger value="notifications">Notificações</TabsTrigger>
        </TabsList>
        <TabsContent value="profile">
          <Card>
            <CardHeader>
              <CardTitle>Perfil Profissional</CardTitle>
              <CardDescription>
                Atualize seus dados públicos e informações profissionais.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
               <div className="flex items-center gap-6">
                <div className="relative group">
                    <Avatar className="h-24 w-24">
                        <AvatarImage src={userData?.avatarUrl} />
                        <AvatarFallback>{name.substring(0, 2).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <Button
                        size="icon"
                        variant="outline"
                        className="absolute bottom-0 right-0 rounded-full h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={handleAvatarClick}
                        disabled={isUploading}
                    >
                        {isUploading ? <Loader2 className="animate-spin" /> : <Camera className="h-4 w-4" />}
                    </Button>
                    <Input
                        type="file"
                        ref={fileInputRef}
                        className="hidden"
                        accept="image/png, image/jpeg"
                        onChange={handleFileChange}
                        disabled={isUploading}
                    />
                </div>
                <p className="text-sm text-muted-foreground flex-1">
                    Clique no ícone da câmera para alterar sua foto de perfil. Recomendamos uma imagem quadrada (1:1) de até 2MB.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="name">Nome Completo</Label>
                <Input id="name" value={name} onChange={e => setName(e.target.value)} disabled={isSavingProfile} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="whatsapp">WhatsApp</Label>
                <div className="flex items-center gap-2">
                    <Select value={countryCode} onValueChange={setCountryCode} disabled={isSavingProfile}>
                        <SelectTrigger className="w-[80px]">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            {countryCodes.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                        </SelectContent>
                    </Select>
                    <Input
                        id="whatsapp"
                        type="tel"
                        placeholder="(11) 99999-9999"
                        value={localWhatsapp}
                        onChange={(e) => setLocalWhatsapp(e.target.value)}
                        disabled={isSavingProfile}
                        className="flex-1"
                    />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="crp">CRP</Label>
                <Input id="crp" placeholder="00/00000" value={crp} onChange={e => setCrp(e.target.value)} disabled={isSavingProfile} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="title">Título Profissional</Label>
                <Input id="title" placeholder="Ex: Psicólogo Clínico" value={title} onChange={e => setTitle(e.target.value)} disabled={isSavingProfile} />
              </div>
               <div className="space-y-2">
                <Label htmlFor="bio">Biografia</Label>
                <Textarea id="bio" value={bio} onChange={e => setBio(e.target.value)} disabled={isSavingProfile} placeholder="Descreva sua abordagem, experiência e o que os pacientes podem esperar."/>
              </div>
              <div className="space-y-2">
                  <Label>Especialidades</Label>
                  <Card className='p-4 bg-muted/50 max-h-80 overflow-y-auto'>
                      <div className="space-y-4">
                        {Object.entries(specialtyCategories).map(([category, items]) => (
                          <div key={category}>
                            <h4 className="font-semibold mb-2">{category}</h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-4 gap-y-2">
                                {items.map(spec => (
                                    <div key={spec} className="flex items-center space-x-2">
                                        <Checkbox
                                            id={spec}
                                            checked={specialties.includes(spec)}
                                            onCheckedChange={(checked) => handleSpecialtyChange(spec, !!checked)}
                                            disabled={isSavingProfile}
                                        />
                                        <label
                                            htmlFor={spec}
                                            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                                        >
                                            {spec}
                                        </label>
                                    </div>
                                ))}
                            </div>
                          </div>
                        ))}
                      </div>
                  </Card>
              </div>
              <div className="space-y-2">
                <Label htmlFor="rate">Valor por Sessão (R$)</Label>
                <Input id="rate" type="number" value={rate} onChange={e => setRate(Number(e.target.value))} disabled={isSavingProfile} />
              </div>
            </CardContent>
            <CardFooter>
              <Button onClick={() => handleSave('Perfil', { crp, title, bio, rate, specialties }, setIsSavingProfile)} disabled={isSavingProfile}>
                {isSavingProfile ? <Loader2 className="animate-spin" /> : "Salvar Perfil"}
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>
        <TabsContent value="availability">
          <Card>
            <CardHeader>
              <CardTitle>Horários de Atendimento</CardTitle>
              <CardDescription>
                Defina seus horários de trabalho padrão. Os pacientes verão estes horários ao agendar.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {weekDays.map(day => {
                const dayKey = day.id as keyof typeof availability;
                const dayAvailability = availability[dayKey];
                return (
                  <div key={day.id} className="grid grid-cols-1 md:grid-cols-3 items-center gap-4">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id={day.id}
                        checked={dayAvailability.enabled}
                        onCheckedChange={(checked) => handleAvailabilityChange(day.id, 'enabled', !!checked)}
                        disabled={isSavingAvailability}
                      />
                      <Label htmlFor={day.id} className="font-semibold text-base">{day.label}</Label>
                    </div>
                    <div className="col-span-2 flex items-center gap-4">
                      <div className="w-full">
                          <Label htmlFor={`${day.id}-start`} className="text-xs text-muted-foreground">Início</Label>
                          <Input
                            id={`${day.id}-start`}
                            type="time"
                            value={dayAvailability.start}
                            onChange={(e) => handleAvailabilityChange(day.id, 'start', e.target.value)}
                            disabled={!dayAvailability.enabled || isSavingAvailability}
                          />
                      </div>
                      <div className="w-full">
                          <Label htmlFor={`${day.id}-end`} className="text-xs text-muted-foreground">Fim</Label>
                           <Input
                            id={`${day.id}-end`}
                            type="time"
                            value={dayAvailability.end}
                            onChange={(e) => handleAvailabilityChange(day.id, 'end', e.target.value)}
                            disabled={!dayAvailability.enabled || isSavingAvailability}
                          />
                      </div>
                    </div>
                  </div>
                )
              })}
            </CardContent>
            <CardFooter>
              <Button onClick={() => handleSave('Disponibilidade', { availability }, setIsSavingAvailability)} disabled={isSavingAvailability}>
                {isSavingAvailability ? <Loader2 className="animate-spin" /> : "Salvar Disponibilidade"}
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>
        <TabsContent value="payouts">
          <Card>
            <CardHeader>
              <CardTitle>Informações de Recebimento</CardTitle>
              <CardDescription>
                Gerencie sua conta bancária para receber pagamentos.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="bank">Banco</Label>
                 <Select value={bank} onValueChange={setBank} disabled={isSavingPayouts}>
                  <SelectTrigger id="bank">
                    <SelectValue placeholder="Selecione o banco" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="001">Banco do Brasil S.A. (001)</SelectItem>
                    <SelectItem value="237">Banco Bradesco S.A. (237)</SelectItem>
                    <SelectItem value="104">Caixa Econômica Federal (104)</SelectItem>
                    <SelectItem value="341">Itaú Unibanco S.A. (341)</SelectItem>
                    <SelectItem value="033">Banco Santander (Brasil) S.A. (033)</SelectItem>
                    <SelectItem value="260">Nu Pagamentos S.A. - Nubank (260)</SelectItem>
                    <SelectItem value="077">Banco Inter S.A. (077)</SelectItem>
                    <SelectItem value="336">Banco C6 S.A. (336)</SelectItem>
                    <SelectItem value="208">Banco BTG Pactual S.A. (208)</SelectItem>
                    <SelectItem value="212">Banco Original S.A. (212)</SelectItem>
                    <SelectItem value="735">Banco Neon S.A. (735)</SelectItem>
                    <SelectItem value="623">Banco Pan S.A. (623)</SelectItem>
                    <SelectItem value="380">PicPay (380)</SelectItem>
                    <SelectItem value="323">Mercado Pago (323)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="agency">Agência (sem dígito)</Label>
                <Input id="agency" value={agency} onChange={e => setAgency(e.target.value)} disabled={isSavingPayouts} />
              </div>
               <div className="space-y-2">
                <Label htmlFor="account">Conta Corrente (com dígito)</Label>
                <Input id="account" value={account} onChange={e => setAccount(e.target.value)} disabled={isSavingPayouts} />
              </div>
            </CardContent>
            <CardFooter>
              <Button onClick={() => handleSave('Recebimentos', { payoutInfo: { bank, agency, account } }, setIsSavingPayouts)} disabled={isSavingPayouts}>
                {isSavingPayouts ? <Loader2 className="animate-spin" /> : "Salvar Dados Bancários"}
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>
        <TabsContent value="notifications">
          <Card>
            <CardHeader>
              <CardTitle>Configurações de Notificação</CardTitle>
              <CardDescription>
                Gerencie como você recebe nossas comunicações.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                 <Label className="font-semibold">Canais de Comunicação</Label>
                  <div className="flex items-center space-x-2">
                    <Checkbox id="email-notifications-psy" defaultChecked />
                    <label htmlFor="email-notifications-psy" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                      Notificações por E-mail
                    </label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox id="whatsapp-notifications-psy" defaultChecked />
                    <label htmlFor="whatsapp-notifications-psy" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                      Notificações por WhatsApp
                    </label>
                  </div>
                   <div className="flex items-center space-x-2">
                    <Checkbox id="push-notifications-psy" />
                    <label htmlFor="push-notifications-psy" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                      Notificações Push
                    </label>
                  </div>
              </div>
               <div className="space-y-2">
                 <Label className="font-semibold">Tipos de Alerta</Label>
                 <div className="flex items-center space-x-2">
                    <Checkbox id="session-reminders-psy" defaultChecked />
                    <label htmlFor="session-reminders-psy" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                      Lembretes de sessão
                    </label>
                  </div>
                   <div className="flex items-center space-x-2">
                    <Checkbox id="schedule-changes-psy" defaultChecked />
                    <label htmlFor="schedule-changes-psy" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                      Novos agendamentos e cancelamentos
                    </label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox id="financial-alerts-psy" defaultChecked />
                    <label htmlFor="financial-alerts-psy" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                      Alertas financeiros (status de retiradas)
                    </label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox id="newsletter-psy" />
                    <label htmlFor="newsletter-psy" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                     Newsletter e atualizações do TimePlus
                    </label>
                  </div>
              </div>
            </CardContent>
            <CardFooter>
              <Button onClick={() => toast({ title: "Configurações Salvas!", description: "Suas preferências de notificação foram salvas."})}>
                Salvar Configurações
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>
      </Tabs>
      <ImageCropperDialog 
        imageSrc={imageToCrop}
        onClose={() => setImageToCrop(null)}
        onSave={handleSaveCroppedImage}
      />
    </>
  );
}
