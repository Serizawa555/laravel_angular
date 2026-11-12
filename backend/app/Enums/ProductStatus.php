<?php

declare(strict_types=1);

namespace App\Enums;

/**
 * Product lifecycle (PROMPT §4): draft -> published <-> unpublished -> (soft-deleted) -> restored.
 */
enum ProductStatus: string
{
    case Draft = 'draft';
    case Published = 'published';
    case Unpublished = 'unpublished';
}
