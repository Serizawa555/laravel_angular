import { Routes } from '@angular/router';
import { authGuard, guestGuard, langGuard, roleGuard } from './core/guards';
import { DEFAULT_LANG, detectLang } from './core/locale';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: () => `/${detectLang()}` },
  {
    path: ':lang',
    canActivateChild: [langGuard],
    children: [
      { path: '', loadComponent: () => import('./features/home/home').then((m) => m.Home) },
      {
        path: 'phones',
        loadComponent: () => import('./features/catalog/listing').then((m) => m.Listing),
        data: { presetType: 'phone' },
      },
      {
        path: 'cases',
        loadComponent: () => import('./features/catalog/listing').then((m) => m.Listing),
        data: { presetType: 'case' },
      },
      {
        path: 'headsets',
        loadComponent: () => import('./features/catalog/listing').then((m) => m.Listing),
        data: { presetType: 'headset_bt,headset_wired' },
      },
      {
        path: 'p/:slug',
        loadComponent: () => import('./features/product/product').then((m) => m.ProductPage),
      },
      {
        path: 'cart',
        loadComponent: () => import('./features/cart/cart-page').then((m) => m.CartPage),
      },
      {
        path: 'favorites',
        loadComponent: () => import('./features/favorites/favorites-page').then((m) => m.FavoritesPage),
      },
      {
        path: 'checkout',
        loadComponent: () => import('./features/checkout/checkout-page').then((m) => m.CheckoutPage),
      },
      {
        path: 'order/:number',
        loadComponent: () => import('./features/checkout/confirmation-page').then((m) => m.ConfirmationPage),
      },
      {
        path: 'orders',
        canActivate: [authGuard],
        loadComponent: () => import('./features/account/orders-page').then((m) => m.OrdersPage),
      },
      {
        path: 'admin',
        canActivate: [roleGuard('editor', 'admin', 'superadmin')],
        loadComponent: () => import('./admin/admin-shell').then((m) => m.AdminShell),
        children: [
          { path: '', pathMatch: 'full', redirectTo: 'products' },
          { path: 'products', loadComponent: () => import('./admin/admin-products').then((m) => m.AdminProducts) },
          { path: 'products/new', loadComponent: () => import('./admin/admin-product-form').then((m) => m.AdminProductForm) },
          { path: 'products/:id', loadComponent: () => import('./admin/admin-product-form').then((m) => m.AdminProductForm) },
          { path: 'featured', loadComponent: () => import('./admin/admin-featured').then((m) => m.AdminFeatured) },
          { path: 'orders', loadComponent: () => import('./admin/admin-orders').then((m) => m.AdminOrders) },
          { path: 'orders/:number', loadComponent: () => import('./admin/admin-order').then((m) => m.AdminOrder) },
          { path: 'users', loadComponent: () => import('./admin/admin-users').then((m) => m.AdminUsers) },
          { path: 'taxonomies', loadComponent: () => import('./admin/admin-taxonomies').then((m) => m.AdminTaxonomies) },
          { path: 'attributes', loadComponent: () => import('./admin/admin-attributes').then((m) => m.AdminAttributes) },
          { path: 'activity', loadComponent: () => import('./admin/admin-activity').then((m) => m.AdminActivity) },
        ],
      },
      {
        path: 'login',
        canActivate: [guestGuard],
        loadComponent: () => import('./features/auth/login').then((m) => m.Login),
      },
      {
        path: 'register',
        canActivate: [guestGuard],
        loadComponent: () => import('./features/auth/register').then((m) => m.Register),
      },
      {
        path: 'account',
        canActivate: [authGuard],
        loadComponent: () => import('./features/account/account').then((m) => m.Account),
      },
    ],
  },
  { path: '**', redirectTo: `/${DEFAULT_LANG}` },
];
