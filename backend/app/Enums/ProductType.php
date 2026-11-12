<?php

declare(strict_types=1);

namespace App\Enums;

/**
 * The product bundle. Decides which attribute_definitions (spec schema) apply (PROMPT §3.1).
 */
enum ProductType: string
{
    case Phone = 'phone';
    case PhoneCase = 'case';
    case BluetoothHeadset = 'headset_bt';
    case WiredHeadset = 'headset_wired';

    /** Types that carry RAM/storage/color variants vs colour-only. */
    public function hasStorageVariants(): bool
    {
        return $this === self::Phone;
    }
}
