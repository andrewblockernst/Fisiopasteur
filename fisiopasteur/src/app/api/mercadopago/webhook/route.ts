import { NextRequest, NextResponse } from 'next/server';
import { MercadoPagoConfig, Payment } from 'mercadopago';

const client = new MercadoPagoConfig({
  accessToken: process.env.MP_ACCESS_TOKEN!,
});

const payment = new Payment(client);

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { type, data } = body;

    console.log("📨 Webhook recibido:");
    console.log("Tipo:", type);
    console.log("Data:", data);

    // Solo procesar pagos aprobados
    if (type === "payment" && data?.id) {
      const paymentId = data.id;
      
      // Esperar un poco para que MP procese
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      try {
        // Obtener detalles del pago
        const paymentDetails = await payment.get({ id: paymentId });
        
        console.log("💳 Detalles del pago:");
        console.log("Status:", paymentDetails.status);
        console.log("Metadata:", paymentDetails.metadata);

        // ✅ SOLO SI EL PAGO ESTÁ APROBADO
        if (paymentDetails.status === 'approved') {
          const metadata = paymentDetails.metadata as any;
          
          console.log("🚀 Creando usuario con datos:");
          console.log("Email:", metadata.email);
          console.log("Nombre:", metadata.nombre);
          console.log("Apellido:", metadata.apellido);
          console.log("Organización:", metadata.nombreOrganizacion);
          
          // ✅ LLAMAR AL ENDPOINT DE REGISTRO QUE YA TENÉS
          const registerResponse = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL}/api/onboarding/register`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              email: metadata.email,
              password: metadata.password,
              nombre: metadata.nombre,
              apellido: metadata.apellido,
              nombreOrganizacion: metadata.nombreOrganizacion,
              plan: metadata.plan,
              paymentId: paymentDetails.id?.toString()
            })
          });

          const registerData = await registerResponse.json();
          
          if (registerData.success) {
            console.log("✅ Usuario creado exitosamente!");
            console.log("Usuario ID:", registerData.data?.usuario?.id);
            console.log("Organización ID:", registerData.data?.organizacion?.id);
          } else {
            console.error("❌ Error al crear usuario:", registerData.error);
          }
        } else {
          console.log("⚠️ Pago no aprobado, status:", paymentDetails.status);
        }
        
      } catch (paymentError: any) {
        console.error("❌ Error procesando pago:", paymentError.message);
      }
    }

    return NextResponse.json({ received: true });
    
  } catch (error: any) {
    console.error("❌ Error en webhook:", error);
    return NextResponse.json(
      { error: "Error en webhook" },
      { status: 500 }
    );
  }
}