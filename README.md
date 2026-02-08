# Poropick

Smart parcel delivery powered by people. Peer-to-peer delivery connecting senders with travelers in Finland.

## Tech stack

- **Frontend:** React, TypeScript, Vite, Tailwind CSS
- **Backend / Auth / DB:** Firebase (Authentication, Firestore)

## Setup

1. `cp .env.example .env` and add your Firebase config (from Firebase Console). `.env` is gitignored; never commit it.
2. `npm install`
3. `npm run dev`
4. `npm run build`

## Project structure

- `src/pages/` – main app screens (Index, Send Parcel, Become Traveler, Login, Tracking)
- `src/components/` – shared UI and layout (Navigation, Footer, MatchButton, ui/)
- `src/integrations/firebase/` – Firebase client, auth, and Firestore helpers
- `src/lib/` – utilities and tracking helpers
