import Image from 'next/image';

export default function ClientsSection() {
  const clients = [
    { name: "Sheltter", img: "/Sheltter.png", bgColor: "#afcca7" },
    { name: "FisioPasteur", img: "/FisioPasteur.jpg", bgColor: "#ffffff" },
  ];

  return (
    <section id="clients" className="py-10 bg-blue-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-10">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            Nuestros clientes
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Empresas que confían en nuestra plataforma
          </p>
        </div>
        <div className="flex flex-wrap justify-center items-center gap-16">
          {clients.map((client, idx) => (
            <div 
              key={idx} 
              className="rounded-lg shadow-md p-8 flex items-center justify-center transition-all duration-300 hover:scale-105 w-80 h-48"
              style={{ backgroundColor: client.bgColor }}
            >
              <Image
                src={client.img}
                alt={`Logo de ${client.name}`}
                width={200}
                height={128}
                className="object-contain max-h-32 w-auto"
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}