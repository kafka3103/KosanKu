-- KosanKu Initial Database Schema
-- Run this in the Supabase SQL Editor

-- 1. Profiles Table (extends auth.users)
CREATE TYPE user_role AS ENUM ('owner', 'tenant');

CREATE TABLE profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    role user_role NOT NULL,
    full_name TEXT NOT NULL,
    phone_number TEXT UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Properties Table
CREATE TABLE properties (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    owner_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    address TEXT NOT NULL,
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    description TEXT,
    rules TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Rooms Table
CREATE TYPE room_status AS ENUM ('available', 'pending', 'occupied', 'maintenance');

CREATE TABLE rooms (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    property_id UUID REFERENCES properties(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL, -- e.g. "Kamar A1", "Tipe Standar"
    size TEXT, -- e.g. "3x3 m"
    monthly_price DECIMAL(12,2) NOT NULL,
    status room_status DEFAULT 'available' NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. Room Facilities (Fasilitas Opsional per Kamar - RB-13)
CREATE TABLE room_facilities (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    room_id UUID REFERENCES rooms(id) ON DELETE CASCADE NOT NULL,
    facility_name TEXT NOT NULL, -- e.g. "AC", "WiFi", "Kamar Mandi Dalam"
    has_extra_cost BOOLEAN DEFAULT false,
    extra_cost_amount DECIMAL(10,2) DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 5. Contracts (Sewa)
CREATE TYPE contract_status AS ENUM ('pending', 'active', 'completed', 'cancelled');

CREATE TABLE contracts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    room_id UUID REFERENCES rooms(id) ON DELETE CASCADE NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE,
    status contract_status DEFAULT 'pending' NOT NULL,
    ktp_image_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 6. Invoices (Tagihan Bulanan)
CREATE TYPE invoice_status AS ENUM ('unpaid', 'paid', 'overdue');

CREATE TABLE invoices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    contract_id UUID REFERENCES contracts(id) ON DELETE CASCADE NOT NULL,
    period_month INTEGER NOT NULL,
    period_year INTEGER NOT NULL,
    base_amount DECIMAL(12,2) NOT NULL,
    additional_amount DECIMAL(12,2) DEFAULT 0,
    total_amount DECIMAL(12,2) NOT NULL,
    due_date DATE NOT NULL,
    status invoice_status DEFAULT 'unpaid' NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 7. Payments
CREATE TYPE payment_status AS ENUM ('pending', 'success', 'failed');

CREATE TABLE payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    invoice_id UUID REFERENCES invoices(id) ON DELETE CASCADE NOT NULL,
    amount DECIMAL(12,2) NOT NULL,
    payment_method TEXT, -- e.g. 'bank_transfer', 'gopay', 'qris'
    payment_gateway_ref TEXT, -- e.g. Midtrans order_id
    status payment_status DEFAULT 'pending' NOT NULL,
    paid_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- RLS (Row Level Security) Setup
-- Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE room_facilities ENABLE ROW LEVEL SECURITY;
ALTER TABLE contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

-- Profiles: Users can read their own profile
CREATE POLICY "Users can view own profile" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);

-- Properties: Anyone can read, only owners can create/update their own
CREATE POLICY "Anyone can view properties" ON properties FOR SELECT USING (true);
CREATE POLICY "Owners can manage own properties" ON properties FOR ALL USING (auth.uid() = owner_id);

-- Rooms: Anyone can read, only owners can create/update
CREATE POLICY "Anyone can view rooms" ON rooms FOR SELECT USING (true);
CREATE POLICY "Owners can manage rooms" ON rooms FOR ALL USING (
    auth.uid() IN (SELECT owner_id FROM properties WHERE id = property_id)
);

-- Room Facilities: Anyone can read, only owners can manage
CREATE POLICY "Anyone can view room facilities" ON room_facilities FOR SELECT USING (true);
CREATE POLICY "Owners can manage room facilities" ON room_facilities FOR ALL USING (
    auth.uid() IN (
        SELECT p.owner_id FROM properties p
        JOIN rooms r ON r.property_id = p.id
        WHERE r.id = room_id
    )
);

-- Contracts: Tenant can view own, Owner can view contracts for their rooms
CREATE POLICY "Tenants can view own contracts" ON contracts FOR SELECT USING (auth.uid() = tenant_id);
CREATE POLICY "Tenants can create contracts" ON contracts FOR INSERT WITH CHECK (auth.uid() = tenant_id);
CREATE POLICY "Owners can view their room contracts" ON contracts FOR SELECT USING (
    auth.uid() IN (
        SELECT p.owner_id FROM properties p
        JOIN rooms r ON r.property_id = p.id
        WHERE r.id = room_id
    )
);
CREATE POLICY "Owners can update their room contracts" ON contracts FOR UPDATE USING (
    auth.uid() IN (
        SELECT p.owner_id FROM properties p
        JOIN rooms r ON r.property_id = p.id
        WHERE r.id = room_id
    )
);
