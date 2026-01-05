-- ===== VENDORS & PAYMENTS SCHEMA =====
-- Run this in Supabase SQL Editor to add vendor and payment tracking

-- Create vendor type enum
DO $$ BEGIN
    CREATE TYPE vendor_type AS ENUM (
        'videographer',
        'photographer', 
        'editor',
        'animator',
        'graphic_designer',
        'sound_engineer',
        'voice_artist',
        'equipment_rental',
        'studio_rental',
        'drone_operator',
        'makeup_artist',
        'talent',
        'location_scout',
        'production_assistant',
        'other'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create payment frequency enum
DO $$ BEGIN
    CREATE TYPE payment_frequency AS ENUM (
        'one_time',
        'weekly',
        'monthly',
        'per_project',
        'recurring'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create payment status enum
DO $$ BEGIN
    CREATE TYPE payment_status AS ENUM (
        'pending',
        'scheduled',
        'processing',
        'completed',
        'failed',
        'cancelled'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Vendors table
CREATE TABLE IF NOT EXISTS vendors (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    vendor_type vendor_type NOT NULL,
    phone TEXT,
    email TEXT,
    upi_id TEXT,
    bank_account_number TEXT,
    bank_ifsc_code TEXT,
    bank_account_name TEXT,
    address TEXT,
    
    -- Tracking
    total_projects_worked INTEGER DEFAULT 0,
    total_amount_paid DECIMAL(15, 2) DEFAULT 0,
    average_rating DECIMAL(3, 2), -- e.g., 4.5 out of 5
    
    -- Work frequency
    work_frequency payment_frequency,
    last_worked_date DATE,
    
    -- Notes
    notes TEXT,
    skills TEXT[], -- Array of skills/specialties
    
    -- Status
    is_active BOOLEAN DEFAULT true,
    preferred_vendor BOOLEAN DEFAULT false, -- Mark favorites
    
    -- Metadata
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Vendor payments table
CREATE TABLE IF NOT EXISTS vendor_payments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    vendor_id UUID REFERENCES vendors(id) ON DELETE CASCADE,
    project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
    
    -- Payment details
    amount DECIMAL(15, 2) NOT NULL,
    payment_date DATE,
    scheduled_date DATE,
    status payment_status DEFAULT 'pending',
    
    -- Payment method
    payment_method TEXT, -- 'UPI', 'Bank Transfer', 'Cash', 'Cheque'
    transaction_id TEXT,
    
    -- Description
    description TEXT NOT NULL,
    payment_reason TEXT, -- What service/work this payment is for
    
    -- Invoice/Receipt
    invoice_number TEXT,
    receipt_url TEXT, -- Link to receipt/proof of payment
    
    -- Metadata
    paid_by UUID REFERENCES users(id),
    approved_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Vendor project assignments (track which vendors worked on which projects)
CREATE TABLE IF NOT EXISTS vendor_project_assignments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    vendor_id UUID REFERENCES vendors(id) ON DELETE CASCADE,
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    
    -- Assignment details
    role TEXT, -- Specific role in this project
    rate DECIMAL(15, 2), -- Rate for this project
    estimated_hours DECIMAL(8, 2),
    actual_hours DECIMAL(8, 2),
    
    -- Status
    status TEXT DEFAULT 'assigned', -- 'assigned', 'in_progress', 'completed'
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    feedback TEXT,
    
    -- Dates
    start_date DATE,
    end_date DATE,
    
    -- Metadata
    assigned_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    
    UNIQUE(vendor_id, project_id, role) -- Prevent duplicate assignments
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_vendors_type ON vendors(vendor_type);
CREATE INDEX IF NOT EXISTS idx_vendors_active ON vendors(is_active);
CREATE INDEX IF NOT EXISTS idx_vendor_payments_vendor ON vendor_payments(vendor_id);
CREATE INDEX IF NOT EXISTS idx_vendor_payments_project ON vendor_payments(project_id);
CREATE INDEX IF NOT EXISTS idx_vendor_payments_status ON vendor_payments(status);
CREATE INDEX IF NOT EXISTS idx_vendor_payments_date ON vendor_payments(payment_date);
CREATE INDEX IF NOT EXISTS idx_vendor_assignments_vendor ON vendor_project_assignments(vendor_id);
CREATE INDEX IF NOT EXISTS idx_vendor_assignments_project ON vendor_project_assignments(project_id);

-- Enable RLS
ALTER TABLE vendors ENABLE ROW LEVEL SECURITY;
ALTER TABLE vendor_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE vendor_project_assignments ENABLE ROW LEVEL SECURITY;

-- RLS Policies for vendors
DROP POLICY IF EXISTS "Allow authenticated users to view vendors" ON vendors;
CREATE POLICY "Allow authenticated users to view vendors"
    ON vendors FOR SELECT
    USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Allow admins to manage vendors" ON vendors;
CREATE POLICY "Allow admins to manage vendors"
    ON vendors FOR ALL
    USING (
        auth.uid() IN (
            SELECT id FROM users WHERE role = 'admin'
        )
    )
    WITH CHECK (
        auth.uid() IN (
            SELECT id FROM users WHERE role = 'admin'
        )
    );

-- RLS Policies for vendor_payments
DROP POLICY IF EXISTS "Allow authenticated users to view payments" ON vendor_payments;
CREATE POLICY "Allow authenticated users to view payments"
    ON vendor_payments FOR SELECT
    USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Allow admins to create payments" ON vendor_payments;
CREATE POLICY "Allow admins to create payments"
    ON vendor_payments FOR INSERT
    WITH CHECK (
        auth.uid() IN (
            SELECT id FROM users WHERE role = 'admin'
        )
    );

DROP POLICY IF EXISTS "Allow admins to update payments" ON vendor_payments;
CREATE POLICY "Allow admins to update payments"
    ON vendor_payments FOR UPDATE
    USING (
        auth.uid() IN (
            SELECT id FROM users WHERE role = 'admin'
        )
    )
    WITH CHECK (
        auth.uid() IN (
            SELECT id FROM users WHERE role = 'admin'
        )
    );

DROP POLICY IF EXISTS "Allow admins to delete payments" ON vendor_payments;
CREATE POLICY "Allow admins to delete payments"
    ON vendor_payments FOR DELETE
    USING (
        auth.uid() IN (
            SELECT id FROM users WHERE role = 'admin'
        )
    );

-- RLS Policies for vendor_project_assignments
DROP POLICY IF EXISTS "Allow authenticated users to view assignments" ON vendor_project_assignments;
CREATE POLICY "Allow authenticated users to view assignments"
    ON vendor_project_assignments FOR SELECT
    USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Allow admins to manage assignments" ON vendor_project_assignments;
CREATE POLICY "Allow admins to manage assignments"
    ON vendor_project_assignments FOR ALL
    USING (
        auth.uid() IN (
            SELECT id FROM users WHERE role = 'admin'
        )
    )
    WITH CHECK (
        auth.uid() IN (
            SELECT id FROM users WHERE role = 'admin'
        )
    );

-- Create triggers for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = TIMEZONE('utc'::text, NOW());
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_vendors_updated_at ON vendors;
CREATE TRIGGER update_vendors_updated_at
    BEFORE UPDATE ON vendors
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_vendor_payments_updated_at ON vendor_payments;
CREATE TRIGGER update_vendor_payments_updated_at
    BEFORE UPDATE ON vendor_payments
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_vendor_assignments_updated_at ON vendor_project_assignments;
CREATE TRIGGER update_vendor_assignments_updated_at
    BEFORE UPDATE ON vendor_project_assignments
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Function to update vendor stats when payment is made
CREATE OR REPLACE FUNCTION update_vendor_stats()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'completed' AND (OLD IS NULL OR OLD.status != 'completed') THEN
        UPDATE vendors
        SET total_amount_paid = total_amount_paid + NEW.amount
        WHERE id = NEW.vendor_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_vendor_stats_on_payment ON vendor_payments;
CREATE TRIGGER update_vendor_stats_on_payment
    AFTER INSERT OR UPDATE ON vendor_payments
    FOR EACH ROW
    EXECUTE FUNCTION update_vendor_stats();
