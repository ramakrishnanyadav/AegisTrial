# AegisTrial — Frontend State Management Architecture

This document defines state ownership boundaries across AegisTrial's React 19 frontend application.

---

## State Ownership Boundaries

| Layer | Library / Tool | State Responsibilities |
| :--- | :--- | :--- |
| **Server State** | TanStack Query (`@tanstack/react-query`) | Fetches, caches, invalidates, and synchronizes all API resources (`/api/protocols`, `/api/screenings`, `/api/aims/stream`). |
| **Transient UI State** | React `useState` / `useReducer` | Form inputs, modal open/close states, active tab selection, and component hover/active states. |
| **Auth State** | React Auth Context (`useAuth()`) | User identity, ID tokens, and Firebase authentication status. |

---

## Architectural Rationale

AegisTrial refrains from adding speculative global state libraries (e.g. Redux Toolkit or Zustand) because TanStack Query already acts as the single source of truth for all asynchronous server data. Global client state is limited strictly to cross-cutting identity in React Auth Context, preventing duplicate state stores and synchronization bugs.
