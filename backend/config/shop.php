<?php

// App settings (Layer A of the config system — see .claude/workflows/config-and-seed.md).
return [
    'locales' => ['en', 'ro'],
    'default_locale' => 'en',
    'currency' => 'MDL', // bani-based money (1 MDL = 100 bani)
    'shipping_bani' => (int) env('SHOP_SHIPPING_BANI', 0),
    'featured_max' => 3,
    'page_size' => 12,
];
