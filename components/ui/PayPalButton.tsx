import { PayPalButtons, PayPalScriptProvider } from '@paypal/react-paypal-js';
import toast from 'react-hot-toast';
import Spinner from './Spinner';

// Monedas soportadas por PayPal (lista oficial, ver:
// https://developer.paypal.com/docs/integration/direct/rest/currency-codes/)
const PAYPAL_SUPPORTED_CURRENCIES = new Set([
  'AUD', 'BRL', 'CAD', 'CNY', 'CZK', 'DKK', 'EUR', 'HKD', 'HUF',
  'ILS', 'JPY', 'MYR', 'MXN', 'TWD', 'NZD', 'NOK', 'PHP', 'PLN',
  'GBP', 'RUB', 'SGD', 'SEK', 'CHF', 'THB', 'USD',
]);

interface PayPalButtonProps {
  clientId: string;
  currency?: string;
  amount: number;
  description: string;
  onApprove: (data: any) => Promise<void>;
}

export default function PayPalButton({
  clientId,
  currency = 'USD',
  amount,
  description,
  onApprove,
}: PayPalButtonProps) {
  const currencyUpper = currency.toUpperCase();

  if (!PAYPAL_SUPPORTED_CURRENCIES.has(currencyUpper)) {
    console.error(
      `PayPal no soporta la moneda "${currencyUpper}". ` +
      `Usa una moneda soportada (p. ej. USD) o convierte el monto antes de pasarlo a este componente.`
    );
    return (
      <div style={{ padding: 12, fontSize: 13, color: '#b91c1c', background: '#fee2e2', borderRadius: 8 }}>
        El pago con PayPal no está disponible en {currencyUpper}. Por favor selecciona otro método de pago.
      </div>
    );
  }

  return (
    <PayPalScriptProvider options={{ clientId, currency: currencyUpper }}>
      <PayPalButtons
        style={{ layout: 'vertical', shape: 'rect', label: 'pay' }}
        createOrder={async (data, actions) => {
          const orderID = await actions.order.create({
            intent: 'CAPTURE',
            purchase_units: [
              {
                description,
                amount: { value: amount.toFixed(2), currency_code: currencyUpper },
              },
            ],
          });
          return orderID;
        }}
        onApprove={async (data, actions) => {
          if (!actions.order) return;
          try {
            await actions.order.capture();
            await onApprove(data);
            toast.success('Pago completado exitosamente!');
          } catch (err) {
            toast.error('Error al capturar el pago');
            console.error(err);
          }
        }}
        onError={(err) => {
          console.error('PayPal Error:', err);
          toast.error('Error al procesar el pago');
        }}
      >
        <Spinner className="w-6 h-6" />
      </PayPalButtons>
    </PayPalScriptProvider>
  );
}