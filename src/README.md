
# Guia de Configuração e Implantação Final - TimePlus

Este guia contém os passos finais e essenciais para configurar e implantar a plataforma TimePlus corretamente.

**O objetivo está quase completo: unificar toda a plataforma (frontend e backend) no projeto Firebase `timeplus-m6gaz`.**

---

### **Passo 1: Configurar o Ambiente do Backend (Cloud Functions)**

As Cloud Functions (o nosso backend) precisam de suas próprias variáveis de ambiente. Elas **não** leem o arquivo `.env`.

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

### **Passo 3: Configurar o Usuário Administrador**

Após a implantação, a plataforma estará no ar, mas o banco de dados `timeplus-m6gaz` não tem um administrador. Siga estes passos **no Console do Firebase para o projeto `timeplus-m6gaz`** para criar o seu acesso de administrador.

#### **3.1: Criar o Usuário Administrador na Autenticação**

1.  Navegue até a seção **Authentication**.
2.  Clique na aba **Users** e em **Add user**.
3.  Crie o usuário abaixo. **Copie o UID dele**, você precisará logo em seguida.

    *   **Usuário Administrador:**
        *   **Email:** `lyratradingandholding@gmail.com`
        *   **Senha:** `123456`

#### **3.2: Criar o Documento do Administrador no Firestore**

1.  Navegue até a seção **Firestore Database**.
2.  Clique em **+ Start collection**. Para o **Collection ID**, digite `users`.

**Documento do Administrador:**
*   **Document ID:** Cole o **UID do Admin** que você copiou no passo anterior.
*   Adicione os campos:
    *   `name` (string): `Admin TimePlus`
    *   `email` (string): `lyratradingandholding@gmail.com`
    *   `role` (string): `Admin`
    *   `createdAt` (timestamp): `(current time)`

---

Após seguir todos os passos, sua plataforma estará completamente configurada.

**As contas de pacientes e psicólogos devem ser criadas diretamente na página de login e cadastro da plataforma.**
