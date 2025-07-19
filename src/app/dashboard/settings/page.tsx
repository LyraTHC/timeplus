
"use client";

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useToast } from "@/hooks/use-toast";
import { Camera, Loader2 } from "lucide-react";
import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from "@/hooks/useAuth";
import { db, storage, isFirebaseConfigured } from "@/lib/firebase";
import { doc, updateDoc } from 'firebase/firestore';
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { ImageCropperDialog } from "@/components/ImageCropperDialog";

const countryCodes = [
  { value: '+55', label: '🇧🇷 +55' },
  { value: '+1', label: '🇺🇸 +1' },
  { value: '+351', label: '🇵🇹 +351' },
  { value: '+44', label: '🇬🇧 +44' },
];

export default function SettingsPage() {
  const { toast } = useToast();
  const { user, userData, setUserData, loading: authLoading } = useAuth();
  
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [countryCode, setCountryCode] = useState('+55');
  const [localWhatsapp, setLocalWhatsapp] = useState('');

  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  
  const [imageToCrop, setImageToCrop] = useState<string | null>(null);
  const [originalFile, setOriginalFile] = useState<File | null>(null);

  const loading = authLoading || !userData;

  useEffect(() => {
    if (userData) {
      setName(userData.name || '');
      setEmail(userData.email || '');
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
    }
  }, [userData]);
  
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

  const handleSaveProfile = () => {
    if (!isFirebaseConfigured || !user || !db) {
        toast({ title: "Modo Demonstração", description: `As alterações foram salvas localmente.` });
        return;
    }
    if (!name.trim() || !email.trim() || !localWhatsapp.trim()) {
        toast({ variant: 'destructive', title: "Campos Obrigatórios", description: "Nome, e-mail e WhatsApp não podem estar vazios." });
        return;
    }
    setIsSavingProfile(true);
    const userRef = doc(db, 'users', user.uid);
    const fullWhatsapp = `${countryCode}${localWhatsapp.replace(/\D/g, '')}`;

    updateDoc(userRef, { name, email, whatsapp: fullWhatsapp }).then(() => {
        toast({ title: "Perfil Salvo!", description: "Seus dados foram atualizados." });
        setUserData(prev => prev ? { ...prev, name, email, whatsapp: fullWhatsapp } : null);
    }).catch(err => {
        console.error(err);
        toast({ variant: 'destructive', title: 'Erro', description: 'Não foi possível salvar seu perfil.' });
    }).finally(() => setIsSavingProfile(false));
  };
    
  const handleAction = (feature: string) => {
    toast({
      title: "Funcionalidade em Desenvolvimento",
      description: `A funcionalidade de ${feature} ainda não foi implementada.`,
    });
  }

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
        <TabsList className="grid w-full max-w-lg grid-cols-2">
          <TabsTrigger value="profile">Perfil</TabsTrigger>
          <TabsTrigger value="notifications">Notificações</TabsTrigger>
        </TabsList>
        <TabsContent value="profile">
          <Card>
            <CardHeader>
              <CardTitle>Informações do Perfil</CardTitle>
              <CardDescription>
                Atualize seus dados pessoais e foto de perfil aqui.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex justify-center">
                <div className="relative group">
                    <Avatar className="h-32 w-32">
                        <AvatarImage src={userData?.avatarUrl} />
                        <AvatarFallback>{name.substring(0, 2).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <Button
                        size="icon"
                        variant="outline"
                        className="absolute bottom-0 right-0 rounded-full h-10 w-10 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={handleAvatarClick}
                        disabled={isUploading}
                    >
                        {isUploading ? <Loader2 className="animate-spin" /> : <Camera />}
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
              </div>
              <div className="space-y-2">
                <Label htmlFor="name">Nome Completo</Label>
                <Input id="name" value={name} onChange={e => setName(e.target.value)} disabled={isSavingProfile} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" value={email} onChange={e => setEmail(e.target.value)} disabled={isSavingProfile}/>
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
            </CardContent>
            <CardFooter>
              <Button onClick={handleSaveProfile} disabled={isSavingProfile}>
                {isSavingProfile ? <Loader2 className="animate-spin" /> : "Salvar Alterações"}
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
            <CardContent className="space-y-4">
              <div className="space-y-2">
                 <Label className="font-semibold">Canais de Comunicação</Label>
                  <div className="flex items-center space-x-2">
                    <Checkbox id="email-notifications" defaultChecked />
                    <label
                      htmlFor="email-notifications"
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                    >
                      Notificações por E-mail
                    </label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox id="whatsapp-notifications" defaultChecked />
                    <label
                      htmlFor="whatsapp-notifications"
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                    >
                      Notificações por WhatsApp
                    </label>
                  </div>
                   <div className="flex items-center space-x-2">
                    <Checkbox id="push-notifications" />
                    <label
                      htmlFor="push-notifications"
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                    >
                      Notificações Push
                    </label>
                  </div>
              </div>
               <div className="space-y-2">
                 <Label className="font-semibold">Tipos de Alerta</Label>
                 <div className="flex items-center space-x-2">
                    <Checkbox id="session-reminders" defaultChecked />
                    <label
                      htmlFor="session-reminders"
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                    >
                      Lembretes de sessão (1 dia e 1 hora antes)
                    </label>
                  </div>
                   <div className="flex items-center space-x-2">
                    <Checkbox id="schedule-changes" defaultChecked />
                    <label
                      htmlFor="schedule-changes"
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                    >
                      Alterações no agendamento
                    </label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox id="newsletter" />
                    <label
                      htmlFor="newsletter"
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                    >
                     Newsletter e atualizações do TimePlus
                    </label>
                  </div>
              </div>
            </CardContent>
            <CardFooter>
              <Button onClick={() => handleAction('Salvar Notificações')}>Salvar Configurações</Button>
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
