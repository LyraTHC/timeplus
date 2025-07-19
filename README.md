
# Guia de Configuração e Implantação Final - TimePlus

Este guia contém os passos finais e essenciais para configurar e implantar a plataforma TimePlus corretamente.

**O objetivo está quase completo: unificar toda a plataforma (frontend e backend) no projeto Firebase `timeplus-m6gaz`.**

---

### **Passo 1: Configurar o Ambiente do Backend (Cloud Functions)**

As Cloud Functions (o nosso backend) precisam de suas próprias variáveis de ambiente. Elas **não** leem o arquivo `.env` do projeto principal.

Para configurar, você deve usar o CLI do Firebase para definir as variáveis de ambiente necessárias. Use os comandos abaixo como modelo, substituindo os valores de exemplo pelas suas chaves reais.

**NÃO COLOQUE SUAS CHAVES DIRETAMENTE NO CÓDIGO OU EM ARQUIVOS DE README.**

```bash
# Exemplo de como configurar as chaves (use suas próprias chaves aqui)
firebase functions:config:set sendgrid.key="SUA_CHAVE_SENDGRID"
firebase functions:config:set sendgrid.from_email="SEU_EMAIL_DE_ENVIO"
firebase functions:config:set twilio.sid="SEU_TWILIO_SID"
firebase functions:config:set twilio.token="SEU_TWILIO_TOKEN"
firebase functions:config:set twilio.phone_number="SEU_NUMERO_TWILIO"
```

---

### **Passo 2: Implantar as Funções do Backend**

Agora que o backend está configurado, implante as funções no Firebase.

```bash
npm run deploy:functions
```

Com o plano Blaze ativado e as configurações acima, a implantação deve ser concluída com sucesso.

---

### **Passo 3: Configurar o Banco de Dados Inicial (Firestore)**

Após a implantação, a plataforma estará no ar, mas o banco de dados `timeplus-m6gaz` está vazio. Siga estes passos **no Console do Firebase para o projeto `timeplus-m6gaz`** para criar os dados iniciais.

#### **3.1: Criar Usuários de Teste na Autenticação**

1.  Navegue até a seção **Authentication**.
2.  Clique na aba **Users** e em **Add user**.
3.  Crie os três usuários abaixo. **Copie o UID de cada um**, você precisará deles logo em seguida.

    *   **Usuário 1 (Administrador):**
        *   **Email:** `admin@timeplus.com`
        *   **Senha:** `admin123`

    *   **Usuário 2 (Psicólogo):**
        *   **Email:** `psico@timeplus.com`
        *   **Senha:** `psico123`

    *   **Usuário 3 (Paciente):**
        *   **Email:** `paciente@timeplus.com`
        *   **Senha:** `paciente123`

#### **3.2: Criar a Coleção `users` no Firestore**

1.  Navegue até a seção **Firestore Database**.
2.  Clique em **+ Start collection**. Para o **Collection ID**, digite `users`.

**Documento do Administrador:**
*   **Document ID:** Cole o **UID do Admin**.
*   Adicione os campos:
    *   `name` (string): `Admin TimePlus`
    *   `email` (string): `admin@timeplus.com`
    *   `role` (string): `Admin`
    *   `createdAt` (timestamp): `(current time)`

**Documento do Psicólogo:**
*   **Document ID:** Cole o **UID do Psicólogo**.
*   Adicione os campos:
    *   `name` (string): `Dra. Eleanor Vance`
    *   `email` (string): `psico@timeplus.com`
    *   `role` (string): `Psicólogo`
    *   `createdAt` (timestamp): `(current time)`
    *   `whatsapp` (string): `+5511988888888`
    *   `professionalProfile` (map):
        *   `bio` (string): `Psicóloga com foco em Terapia Cognitivo-Comportamental, especializada em ansiedade e estresse.`
        *   `crp` (string): `06/00000`
        *   `rate` (number): `150`
        *   `specialties` (array): (Strings) `TCC`, `Ansiedade`, `Depressão`
        *   `title` (string): `Psicóloga Clínica`
    *   `availability` (map): (Adicione cada dia como um mapa aninhado)
        *   `segunda` (map): `enabled` (boolean): `true`, `start` (string): `09:00`, `end` (string): `18:00`
        *   `terca` (map): `enabled` (boolean): `true`, `start` (string): `09:00`, `end` (string): `18:00`
        *   `quarta` (map): `enabled` (boolean): `true`, `start` (string): `09:00`, `end` (string): `18:00`
        *   `quinta` (map): `enabled` (boolean): `true`, `start` (string): `09:00`, `end` (string): `18:00`
        *   `sexta` (map): `enabled` (boolean): `true`, `start` (string): `09:00`, `end` (string): `14:00`
        *   `sabado` (map): `enabled` (boolean): `false`, `start` (string): `09:00`, `end` (string): `12:00`
        *   `domingo` (map): `enabled` (boolean): `false`, `start` (string): `09:00`, `end` (string): `12:00`

**Documento do Paciente:**
*   **Document ID:** Cole o **UID do Paciente**.
*   Adicione os campos:
    *   `name` (string): `Carlos Oliveira`
    *   `email` (string): `paciente@timeplus.com`
    *   `role` (string): `Paciente`
    *   `createdAt` (timestamp): `(current time)`
    *   `whatsapp` (string): `+5511999999999`

---

Após seguir todos os passos, sua plataforma estará completamente configurada, implantada e funcional no projeto `timeplus-m6gaz`.
