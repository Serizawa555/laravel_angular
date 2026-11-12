<?php

declare(strict_types=1);

namespace App\Payments;

readonly class PaymentResult
{
    public function __construct(
        public bool $success,
        public string $status,       // succeeded | declined
        public string $reference,
        public ?string $cardLast4 = null,
    ) {}
}
