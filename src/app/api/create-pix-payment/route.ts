
import { NextRequest, NextResponse } from 'next/server';
import { MercadoPagoConfig, Payment } from 'mercadopago';
import { v4 as uuidv4 } from 'uuid';

export async function POST(req: NextRequest) {
  const accessToken = process.env.MERCADO_PAGO_ACCESS_TOKEN;

  if (!accessToken || accessToken === "YOUR_MERCADO_PAGO_ACCESS_TOKEN") {
    console.error("Mercado Pago access token is not configured.");
    return NextResponse.json(
      { message: "A integração de pagamento não está configurada corretamente no servidor." },
      { status: 500 }
    );
  }

  try {
    const body = await req.json();
    // Added psychologistId, patientId to pass to webhook
    const { rate, description, payerEmail, psychologistId, sessionTimestampMillis, patientId } = body;

    if (!rate || typeof rate !== 'number' || rate <= 0 || !description || !payerEmail || !psychologistId || !sessionTimestampMillis || !patientId) {
      return NextResponse.json({ message: 'Dados da transação inválidos (todos os campos são obrigatórios).' }, { status: 400 });
    }

    const client = new MercadoPagoConfig({ accessToken });
    const payment = new Payment(client);
    const idempotencyKey = uuidv4();

    // Use the explicit public URL for the Firebase Studio environment. This is robust.
    const notificationUrl = `https://studio--timeplus-m6gaz.us-central1.hosted.app/api/mp-webhook`;
    
    // The external reference will now contain all the data needed for the webhook to create the session
    const externalReference = `sid_${psychologistId}_${sessionTimestampMillis}_uid_${patientId}`;

    const paymentResponse = await payment.create({
      body: {
        transaction_amount: rate,
        description: description,
        payment_method_id: 'pix',
        payer: {
          email: payerEmail,
        },
        external_reference: externalReference,
        notification_url: notificationUrl,
      },
      requestOptions: {
        idempotencyKey,
      }
    });

    return NextResponse.json({ 
      paymentId: paymentResponse.id,
      qrCode: paymentResponse.point_of_interaction?.transaction_data?.qr_code,
      qrCodeBase64: paymentResponse.point_of_interaction?.transaction_data?.qr_code_base64,
    });

  } catch (error: any) {
    console.error("Error creating Mercado Pago PIX payment:", error);
    const errorMessage = error.cause?.message || error.message || "Falha ao criar o pagamento PIX.";
    return NextResponse.json(
      { message: errorMessage },
      { status: 500 }
    );
  }
}
