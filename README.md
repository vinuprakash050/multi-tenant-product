# Multi Vendor React Storefront

A responsive React + Vite starter for a reusable product-selling website that supports multiple vendors from the same shared UI.

## Included

- Home page
- Products page
- Product detail page
- Cart page
- Admin page
- Shared navigation
- Firebase Firestore integration with local fallback
- Order workflow without online payment

## Setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Copy the Firebase example file:

   ```bash
   cp .env.example .env
   ```

3. Fill in your Firebase values in `.env`

4. Start the app:

   ```bash
   npm run dev
   ```

## Firebase Collections

- `products`
- `orders`
- `users`

If Firebase is not configured yet, the app falls back to local demo data and local storage so you can still test the flow.
