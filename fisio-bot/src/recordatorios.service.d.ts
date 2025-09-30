export declare function procesarRecordatoriosPendientes(
  enviarMensaje: (telefono: string, mensaje: string) => Promise<any>
): Promise<{
  procesadas: number
  enviadas: number
  fallidas: number
}>

export declare function iniciarSistemaRecordatorios(
  enviarMensaje: (telefono: string, mensaje: string) => Promise<any>
): void