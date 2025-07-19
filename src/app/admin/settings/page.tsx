
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
import { Slider } from "@/components/ui/slider";
import React from "react";

export default function AdminSettingsPage() {
  const { toast } = useToast();
  const [commission, setCommission] = React.useState([15]);

  const handleSave = (section: string) => {
    toast({
      title: "Configurações Salvas!",
      description: `Suas alterações na seção de ${section} foram salvas.`,
    });
  };

  return (
    <>
      <div className="flex items-center mb-4">
        <h1 className="text-lg font-semibold md:text-2xl">Configurações da Plataforma</h1>
      </div>
      <Tabs defaultValue="commission" className="w-full">
        <TabsList className="grid w-full max-w-lg grid-cols-2">
          <TabsTrigger value="commission">Taxas & Comissões</TabsTrigger>
          <TabsTrigger value="payouts">Conta de Recebimento</TabsTrigger>
        </TabsList>
        <TabsContent value="commission">
          <Card>
            <CardHeader>
              <CardTitle>Comissão da Plataforma</CardTitle>
              <CardDescription>
                Defina a porcentagem de comissão sobre o valor de cada sessão paga na plataforma.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="commission-value">Valor da Comissão: <span className="text-primary font-bold">{commission[0]}%</span></Label>
                <Slider
                    id="commission-value"
                    defaultValue={commission}
                    max={50}
                    step={1}
                    onValueChange={setCommission}
                />
              </div>
               <p className="text-sm text-muted-foreground">
                Exemplo: Para uma sessão de R$100,00, uma comissão de {commission[0]}% resultará em um lucro de R${(100 * commission[0] / 100).toFixed(2).replace('.',',')} para a plataforma. O psicólogo receberá R${(100 - (100 * commission[0] / 100)).toFixed(2).replace('.',',')}.
              </p>
            </CardContent>
            <CardFooter>
              <Button onClick={() => handleSave('Comissões')}>Salvar Comissão</Button>
            </CardFooter>
          </Card>
        </TabsContent>
        <TabsContent value="payouts">
          <Card>
            <CardHeader>
              <CardTitle>Conta Bancária da Plataforma</CardTitle>
              <CardDescription>
                Configure a conta bancária para onde o lucro da plataforma será transferido.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
               <div className="space-y-2">
                <Label htmlFor="bank-name">Nome do Titular</Label>
                <Input id="bank-name" defaultValue="TimePlus Plataforma LTDA" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="bank-document">CNPJ</Label>
                <Input id="bank-document" defaultValue="00.000.000/0001-00" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="bank">Banco</Label>
                 <Select defaultValue="077">
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
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label htmlFor="agency">Agência (sem dígito)</Label>
                    <Input id="agency" defaultValue="0001" />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="account">Conta Corrente (com dígito)</Label>
                    <Input id="account" defaultValue="9876543-2" />
                </div>
              </div>
            </CardContent>
            <CardFooter>
              <Button onClick={() => handleSave('Conta de Recebimento')}>Salvar Dados Bancários</Button>
            </CardFooter>
          </Card>
        </TabsContent>
      </Tabs>
    </>
  );
}
