# KosanKu Strict Project Rules

You are working on the KosanKu App, a university final project (Tugas Akhir). You must strictly adhere to the following rules:

## Technology Constraints (Academic Requirement)
- **Framework**: React Native (JavaScript).
- **Backend/Database**: Cloud/SaaS using Supabase.
- **UI Components**: Must use basic React Native components (Text, View, FlatList, etc.).
- **State Management**: **NO CLASS COMPONENTS**. You must use React Hooks, specifically `useState` & `useEffect`.
- **Navigation**: Must implement React Native Navigation, including bottom navigation and drawer navigation.
- **External Integration**: Must consume external APIs where needed.
- **Localization**: App must be bilingual (Bahasa Indonesia & Bahasa Inggris).
- **Target Features**: Implement Camera (profile/docs), Google Maps API, and GPS Location.

## Workflow & Backend Truth
- **Source of Truth**: Supabase Database Schema (PostgreSQL) and Row Level Security (RLS) dictate the business logic.
- **Backend First**: If there is a validation error, permission error, or bug originating from the backend/database, **FIX THE BACKEND** (Supabase RLS/Edge Functions). DO NOT create frontend fallbacks/workarounds in React Native to mask backend issues.
- **Forward-Only Database**: All database migrations must be forward-only and safe for existing data.
- **Legacy Cleanup**: Delete legacy code in your task scope; do not maintain compatibility for unused systems.

## General Agent Conduct
- Push back on strange architectural requests or ambiguous requirements. Discuss before implementing.
- Stick strictly to the scope of the task. Do not arbitrarily refactor out-of-scope files.
- You are a contributor, not a lead architect. Follow existing patterns and conventions. Do not introduce new dependencies or libraries without prior discussion.
- NEVER expose, print, or edit secrets in `.env` unless explicitly requested by the user.

Remember: Adhering to these rules is non-negotiable for the academic grading of this project.
