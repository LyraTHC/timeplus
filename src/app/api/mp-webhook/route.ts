
import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { MercadoPagoConfig, Payment } from 'mercadopago';
import * as admin from "firebase-admin";

// This webhook creates a session document ONLY after payment is confirmed.
// It receives the necessary data via the external_reference field.

export async function POST(req: NextRequest) {
    const body = await req.json();

    if (body.type === 'payment') {
        const paymentId = body.data.id;

        const accessToken = process.env.MERCADO_PAGO_ACCESS_TOKEN;
        if (!accessToken) {
            console.error("Mercado Pago access token is not configured for webhook.");
            return NextResponse.json({ error: "Internal server configuration error." }, { status: 500 });
        }

        try {
            const client = new MercadoPagoConfig({ accessToken });
            const payment = new Payment(client);
            const paymentInfo = await payment.get({ id: paymentId });
            
            // Proceed only if the payment is approved and we have our external reference
            if (paymentInfo && paymentInfo.status === 'approved' && paymentInfo.external_reference) {
                const { external_reference, transaction_amount } = paymentInfo;

                // --- Begin Session Creation Logic ---
                // Reference format: `sid_${psychologistId}_${sessionTimestampMillis}_uid_${patientId}`
                const refParts = external_reference.split('_');
                if (refParts.length < 5 || refParts[0] !== 'sid' || refParts[3] !== 'uid') {
                    console.error(`Webhook Error: Invalid external_reference format: ${external_reference}`);
                    return NextResponse.json({ error: 'Invalid external reference format.' }, { status: 400 });
                }

                const psychologistId = refParts[1];
                const sessionTimestampMillis = parseInt(refParts[2], 10);
                const patientId = refParts[4];
                
                const sessionDocId = `session-${psychologistId}-${sessionTimestampMillis}`;
                const sessionRef = adminDb.collection('sessions').doc(sessionDocId);

                // --- Robustness Check: Prevent Duplicate Session Creation ---
                const sessionDoc = await sessionRef.get();
                if (sessionDoc.exists) {
                    console.log(`Webhook: Session ${sessionDocId} already exists. Ignoring duplicate notification.`);
                    return NextResponse.json({ success: true, message: "Session already processed." });
                }

                const [patientDoc, psychologistDoc] = await Promise.all([
                    adminDb.collection("users").doc(patientId).get(),
                    adminDb.collection("users").doc(psychologistId).get(),
                ]);

                if (!patientDoc.exists || !psychologistDoc.exists) {
                    throw new Error(`Patient or psychologist not found for session ${sessionDocId}`);
                }

                const patientData = patientDoc.data();
                const psychologistData = psychologistDoc.data();

                const sessionData = {
                    participantIds: [patientId, psychologistId],
                    patientId,
                    patientName: patientData?.name,
                    psychologistId,
                    psychologistName: psychologistData?.name,
                    sessionTimestamp: admin.firestore.Timestamp.fromMillis(sessionTimestampMillis),
                    createdAt: admin.firestore.FieldValue.serverTimestamp(),
                    status: 'Pago',
                    rate: transaction_amount,
                    paymentDetails: {
                        id: paymentId,
                        status: 'approved',
                        paymentMethod: 'pix',
                    },
                    reviewed: false,
                    effectiveDurationInSeconds: 0,
                };
                
                await sessionRef.set(sessionData);
                console.log(`Webhook: Session ${sessionDocId} created successfully.`);
                // --- End Session Creation Logic ---
            } else {
                 console.log(`Webhook: Payment ${paymentId} status is not 'approved' yet or no external_reference found.`);
            }

            return NextResponse.json({ success: true, received: true });
        } catch (error) {
            console.error(`Webhook Error: Failed to process payment ${paymentId}.`, error);
            return NextResponse.json({ error: 'Failed to process payment update.' }, { status: 500 });
        }
    }
    
    // Acknowledge other types of notifications without processing
    return NextResponse.json({ success: true, received: true });
}
