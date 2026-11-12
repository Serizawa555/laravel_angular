<?php

declare(strict_types=1);

namespace App\Payments;

use Illuminate\Support\Str;

/**
 * Deterministic mock (PROMPT §6):
 *   4242 4242 4242 4242 -> success
 *   4000 0000 0000 0002 -> declined
 *   any other valid-looking number -> success
 */
class MockPaymentGateway implements PaymentGateway
{
    public function charge(int $amountBani, array $card): PaymentResult
    {
        $number = preg_replace('/\D/', '', $card['number'] ?? '');
        $last4 = $number ? substr($number, -4) : null;
        $reference = 'MOCK-'.strtoupper(Str::random(6));

        $declined = $number === '4000000000000002';

        return new PaymentResult(
            success: ! $declined,
            status: $declined ? 'declined' : 'succeeded',
            reference: $reference,
            cardLast4: $last4,
        );
    }
}
