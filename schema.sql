-- 1. Hives Table
CREATE TABLE IF NOT EXISTS hives (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    business_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
    apiary_location TEXT NOT NULL,
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    colony_type TEXT,
    installation_date DATE,
    status TEXT DEFAULT 'Active', -- Active, Inactive, Maintenance
    queen_status TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Hive Sensor Readings (IoT Simulation)
CREATE TABLE IF NOT EXISTS hive_sensor_readings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    hive_id UUID REFERENCES hives(id) ON DELETE CASCADE,
    temperature DOUBLE PRECISION,
    humidity DOUBLE PRECISION,
    weight DOUBLE PRECISION,
    activity_level TEXT,
    battery_level DOUBLE PRECISION,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Honey Harvests
CREATE TABLE IF NOT EXISTS honey_harvests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    hive_id UUID REFERENCES hives(id) ON DELETE CASCADE,
    harvest_date DATE NOT NULL,
    honey_type TEXT,
    quantity DOUBLE PRECISION,
    unit TEXT DEFAULT 'kg',
    location TEXT,
    quality_grade TEXT,
    moisture_percentage DOUBLE PRECISION,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Honey Batches
CREATE TABLE IF NOT EXISTS honey_batches (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    batch_id TEXT UNIQUE NOT NULL, -- e.g., HC-2026-0001
    harvest_id UUID REFERENCES honey_harvests(id) ON DELETE CASCADE,
    hive_id UUID REFERENCES hives(id) ON DELETE CASCADE,
    product_name TEXT,
    honey_variety TEXT,
    quantity DOUBLE PRECISION,
    harvest_date DATE,
    processing_date DATE,
    packaging_date DATE,
    expiry_date DATE,
    quality_info TEXT,
    status TEXT DEFAULT 'Harvested', -- Harvested, Processing, Packaged, Available, Sold
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Blockchain Records
CREATE TABLE IF NOT EXISTS blockchain_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    batch_id TEXT REFERENCES honey_batches(batch_id) ON DELETE CASCADE,
    event_type TEXT NOT NULL,
    event_data JSONB,
    previous_hash TEXT,
    current_hash TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Extending Existing Tables
ALTER TABLE products ADD COLUMN IF NOT EXISTS batch_id TEXT REFERENCES honey_batches(batch_id) ON DELETE SET NULL;
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS batch_id TEXT REFERENCES honey_batches(batch_id) ON DELETE SET NULL;
