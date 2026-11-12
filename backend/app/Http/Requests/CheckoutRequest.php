<?php

declare(strict_types=1);

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class CheckoutRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /** @return array<string, mixed> */
    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'email', 'max:255'],
            'phone' => ['nullable', 'string', 'max:50'],
            'shipping_address' => ['nullable', 'array'],
            'shipping_address.line1' => ['nullable', 'string', 'max:255'],
            'shipping_address.city' => ['nullable', 'string', 'max:255'],
            'shipping_address.country' => ['nullable', 'string', 'max:255'],
            'card' => ['required', 'array'],
            'card.number' => ['required', 'string', 'min:12', 'max:25'],
            'card.exp' => ['nullable', 'string', 'max:10'],
            'card.cvc' => ['nullable', 'string', 'max:5'],
        ];
    }
}
