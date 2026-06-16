# NombaBiz

NombaBiz is an invoice and payment tracking MVP for Nigerian small businesses.

## Hackathon

Nomba x DevCareer Hackathon 2026

Track: Build  
Focus Area: Integrations and Plugins

## Problem

Many Nigerian small businesses collect payments through bank transfers, cash, POS, and WhatsApp messages. This makes it difficult to track who has paid, who is owing, and which payment belongs to which customer.

## Solution

NombaBiz gives merchants a simple dashboard to create invoices, share payment requests through WhatsApp, track paid and unpaid invoices, and later confirm payments automatically through Nomba Checkout and Webhooks.

## Current MVP Features

- Create customer invoices
- Track paid and unpaid invoices
- Format amounts in Nigerian Naira
- Share invoice/payment request through WhatsApp
- Store prototype data in browser local storage
- Mobile-friendly dashboard
- Simple hackathon pitch section

## Planned Nomba Integration

- Generate Nomba Checkout payment links for invoices
- Store payment reference for each invoice
- Receive webhook events from Nomba
- Verify payment status server-side
- Automatically mark invoice as paid after confirmed payment

## Tech Stack

- React
- Vite
- JavaScript
- CSS
- LocalStorage for prototype data

## Running Locally

`powershell
npm install
npm run dev

