import { NextRequest, NextResponse } from 'next/server';
import { MercadoPagoConfig, Preference } from 'mercadopago';

const client = new MercadoPagoConfig({
  accessToken: process.env.MP_ACCESS_TOKEN!,
});

const preference = new Preference(client);

export async function POST(request: NextRequest) {
  try {
    const { plan_type, userData } = await request.json();

    console.log("📦 Datos recibidos:");
    console.log("Plan:", plan_type);
    console.log("Usuario:", userData);

    // Definir planes
    const plans = {
      basic: { title: "Plan Básico", price: 10 },
      premium: { title: "Plan Premium", price: 5000 },
      enterprise: { title: "Plan Enterprise", price: 100000 }
    };

    const selectedPlan = plans[plan_type as keyof typeof plans] || plans.basic;

    // ✅ Crear preferencia con los datos del usuario en metadata
    const preferenceData = {
      items: [
        {
          id: `plan_${Date.now()}`,
          title: selectedPlan.title,
          unit_price: selectedPlan.price,
          quantity: 1,
        },
      ],
      back_urls: {
        success: `${process.env.NEXT_PUBLIC_SITE_URL}/success`,
        failure: `${process.env.NEXT_PUBLIC_SITE_URL}/failure`,
        pending: `${process.env.NEXT_PUBLIC_SITE_URL}/pending`,
      },
      //auto_return: "approved" as const,
      notification_url: `${process.env.NEXT_PUBLIC_SITE_URL}/api/mercadopago/webhook`,
      
      // ✅ GUARDAR DATOS DEL USUARIO EN METADATA
      metadata: {
        email: userData.email,
        password: userData.password,
        nombre: userData.nombre,
        apellido: userData.apellido,
        nombreOrganizacion: userData.nombreOrganizacion,
        plan: plan_type
      }
    };

    console.log("✅ Creando preferencia con metadata:", preferenceData.metadata);

    const result = await preference.create({ body: preferenceData });
    
    console.log("✅ Preferencia creada con ID:", result.id);
    
    return NextResponse.json({ 
      id: result.id,
      plan: selectedPlan 
    });

  } catch (error: any) {
    console.error("❌ Error creando preferencia:", error);
    console.error("Details:", error.message);
    
    return NextResponse.json(
      { 
        error: "Error creando preferencia",
        details: error.message
      },
      { status: 500 }
    );
  }
}