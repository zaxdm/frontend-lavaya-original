export const TASA_CAMBIO_PEN_USD = 3.75; // PEN por 1 USD — actualizar manualmente

export function convertirPenAUsd(montoPen: number): number {
  return Number((montoPen / TASA_CAMBIO_PEN_USD).toFixed(2));
}
