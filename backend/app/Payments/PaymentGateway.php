<?php

declare(strict_types=1);

namespace App\Payments;

/**
 * Payment abstraction so a real provider (MAIB / Paynet / Stripe) can replace the mock later
 * (PROMPT §6). Bound to MockPaymentGateway in AppServiceProvider.
 */
interface PaymentGateway
{
    /** @param array{number?: string, exp?: string, cvc?: string} $card */
    public function charge(int $amountBani, array $card): PaymentResult;
}
