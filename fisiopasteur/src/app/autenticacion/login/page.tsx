import Head from "next/head";
import Image from "next/image";

export default function LoginPage() {
  return (
    <>
      <Head>
        <title>Login - Fisiopasteur</title>
      </Head>

      <div className="bg-white h-screen flex">
        {/* Lado Izquierdo - Formulario */}
        <div className="w-full md:w-1/2 flex items-center justify-center p-4">
          <div className="w-full max-w-sm"> {/* más chico que max-w-md */}
            <h2 className="text-lg font-medium text-gray-700">Bienvenido/a a</h2>
            <h1 className="text-3xl font-bold text-red-700 mb-8">Fisiopasteur</h1>

            <form className="space-y-6">
              {/* Email */}
              <div>
                <label
                  htmlFor="email"
                  className="block text-sm font-medium text-gray-600"
                >
                  Correo electrónico
                </label>
                <input
                  id="email"
                  type="email"
                  placeholder="Ej. francosaltierra"
                  className="mt-1 w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                />
              </div>

              {/* Contraseña */}
              <div>
                <label
                  htmlFor="password"
                  className="block text-sm font-medium text-gray-600"
                >
                  Contraseña
                </label>
                <input
                  id="password"
                  type="password"
                  placeholder="12345"
                  className="mt-1 w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                />
              </div>

              {/* Botón */}
              <button
                type="submit"
                className="w-full bg-red-600 text-white py-2 rounded-lg font-semibold hover:bg-red-700 transition-colors"
              >
                Iniciar Sesión
              </button>

              {/* Link */}
              <div className="text-center">
                <a
                  href="#"
                  className="text-sm text-red-600 hover:underline"
                >
                  ¿Olvidaste tu contraseña?
                </a>
              </div>
            </form>
          </div>
        </div>

        {/* Lado Derecho - Logo */}
        <div className="hidden md:flex w-1/2 bg-white relative overflow-hidden items-center justify-center">
          {/* Logo principal */}
          <div className="relative z-10">
            <Image
              src="/favicon.svg"
              alt="Logo principal Fisiopasteur"
              width={800}
              height={192}
            />
          </div>
        </div>
      </div>
    </>
  );
}