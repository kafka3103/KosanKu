-- Migration: Add tenant_nik to rental_requests table

ALTER TABLE public.rental_requests
ADD COLUMN IF NOT EXISTS tenant_nik text;
