
import { NextRequest, NextResponse } from 'next/server';
import { MercadoPagoConfig, Preference } from 'mercadopago';

export async function POST(req: NextRequest) {
  const accessToken = process.env.MERCADO_PAGO_ACCESS_TOKEN;

  if (!accessToken || accessToken === "YOUR_MERCADO_PAGO_ACCESS_TOKEN") {
    console.error("Mercado Pago access token is not configured.");
    return NextResponse.json(
      { message: "A integração de pagamento não está configurada corretamente no servidor. Por favor, contate o suporte." },
      { status: 500 }
    );
  }
  
  if (req.method !== 'POST') {
    return NextResponse.json({ message: 'Method not allowed' }, { status: 405 });
  }

  try {
    const body = await req.json();
    const { psychologistName, rate, psychologistId, sessionTimestampMillis, payerEmail, patientId } = body;

    if (!psychologistName || typeof rate !== 'number' || rate <= 0 || !psychologistId || !sessionTimestampMillis || !payerEmail || !patientId) {
      return NextResponse.json({ message: 'Dados da sessão inválidos para o pagamento (todos os campos são obrigatórios).' }, { status: 400 });
    }

    const client = new MercadoPagoConfig({ accessToken });
    const preference = new Preference(client);

    // Use the explicit public URL for the Firebase Studio environment. This is robust.
    const notificationUrl = `https://studio--timeplus-m6gaz.us-central1.hosted.app/api/mp-webhook`;

    // The external reference will now contain all the data needed for the webhook to create the session
    const externalReference = `sid_${psychologistId}_${sessionTimestampMillis}_uid_${patientId}`;

    const result = await preference.create({
      body: {
        items: [
          {
            id: `session-${psychologistId}-${sessionTimestampMillis}`,
            title: `Sessão de Terapia com ${psychologistName}`,
            description: `Agendamento de sessão para ${new Date(sessionTimestampMillis).toLocaleString('pt-BR')}`,
            quantity: 1,
            unit_price: rate,
            currency_id: 'BRL',
          },
        ],
        payer: {
          email: payerEmail,
        },
        back_urls: {
            success: `https://studio--timeplus-m6gaz.us-central1.hosted.app/dashboard`,
            failure: `https://studio--timeplus-m6gaz.us-central1.hosted.app/dashboard`,
            pending: `https://studio--timeplus-m6gaz.us-central1.hosted.app/dashboard`,
        },
        auto_return: 'approved',
        external_reference: externalReference,
        notification_url: notificationUrl,
      },
    });

    return NextResponse.json({ preferenceId: result.id });
  } catch (error: any) {
    console.error("Error creating Mercado Pago preference:", error);
    const errorMessage = error.cause?.message || error.message || "Falha ao criar a preferência de pagamento.";
    return NextResponse.json(
      { message: errorMessage },
      { status: 500 }
    );
  }
}
