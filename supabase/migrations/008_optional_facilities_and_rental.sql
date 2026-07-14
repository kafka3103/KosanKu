-- ============================================================
-- KosanKu — Migration 008: Master Fasilitas Opsional & Transaksi Sewa Fasilitas Tambahan
-- Supabase PostgreSQL
-- Deskripsi: Membuat tabel contract_facilities untuk transaksi fasilitas
--            opsional di tengah masa sewa, memperbarui fungsi billing bulanan,
--            dan menambahkan RPC add_facility_to_contract dengan Smart Check.
-- ============================================================

-- ============================================================
-- 1. TABEL: contract_facilities
-- Menyimpan fasilitas opsional yang disewa pada kontrak hunian aktif
-- ============================================================

CREATE TABLE IF NOT EXISTS public.contract_facilities (
  id                   UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  contract_id          UUID NOT NULL REFERENCES public.contracts(id) ON DELETE CASCADE,
  facility_id          UUID REFERENCES public.facility_master(id) ON DELETE SET NULL,
  custom_facility_name TEXT,               -- Nama khusus jika fasilitas opsional custom
  price_per_month      DECIMAL(12,2) NOT NULL CHECK (price_per_month >= 0),
  status               TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'requested', 'cancelled')),
  start_date           DATE NOT NULL DEFAULT CURRENT_DATE,
  end_date             DATE,               -- Tanggal selesai berlangganan jika diberhentikan
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_contract_facilities_contract_id ON public.contract_facilities(contract_id);
CREATE INDEX IF NOT EXISTS idx_contract_facilities_status ON public.contract_facilities(status);

-- Trigger auto update updated_at
CREATE TRIGGER trigger_update_contract_facilities_updated_at
  BEFORE UPDATE ON public.contract_facilities
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- 2. ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================

ALTER TABLE public.contract_facilities ENABLE ROW LEVEL SECURITY;

-- Owner dari properti dapat mengelola (ALL) fasilitas kontrak
CREATE POLICY "Owner can manage contract facilities for their properties"
  ON public.contract_facilities
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.contracts c
      WHERE c.id = contract_facilities.contract_id
        AND c.owner_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.contracts c
      WHERE c.id = contract_facilities.contract_id
        AND c.owner_id = auth.uid()
    )
  );

-- Tenant dapat melihat (SELECT) fasilitas pada kontraknya sendiri
CREATE POLICY "Tenant can view facilities on their own contracts"
  ON public.contract_facilities
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.contracts c
      WHERE c.id = contract_facilities.contract_id
        AND c.tenant_id = auth.uid()
    )
  );

-- Tenant dapat mengajukan (INSERT) fasilitas baru pada kontrak aktif dengan status 'requested'
CREATE POLICY "Tenant can request optional facilities"
  ON public.contract_facilities
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.contracts c
      WHERE c.id = contract_facilities.contract_id
        AND c.tenant_id = auth.uid()
        AND c.status = 'active'
    ) AND status = 'requested'
  );

-- ============================================================
-- 3. FUNCTION UPDATE: generate_monthly_billing_for_property
-- Memastikan generate billing bulanan otomatis menyertakan fasilitas opsional aktif
-- ============================================================

CREATE OR REPLACE FUNCTION generate_monthly_billing_for_property(target_property_id UUID)
RETURNS INTEGER AS $$
DECLARE
  billing_config RECORD;
  active_contract RECORD;
  current_billing_period DATE;
  new_invoice_id UUID;
  invoices_created INTEGER := 0;
  total_invoice_amount DECIMAL(12,2);
  active_facility RECORD;
BEGIN
  -- Ambil konfigurasi billing properti
  SELECT billing_generate_day, billing_due_days
  INTO billing_config
  FROM public.properties
  WHERE id = target_property_id AND is_active = TRUE AND is_deleted = FALSE;

  IF NOT FOUND THEN
    RETURN 0;
  END IF;

  -- Hitung periode billing saat ini (tanggal 1 bulan ini)
  current_billing_period := DATE_TRUNC('month', CURRENT_DATE);

  -- Loop semua kontrak aktif untuk properti ini
  FOR active_contract IN
    SELECT c.id, c.room_id, c.tenant_id, c.owner_id, c.monthly_rate
    FROM public.contracts c
    JOIN public.rooms r ON r.id = c.room_id
    WHERE r.property_id = target_property_id
      AND c.status = 'active'
      AND c.start_date <= CURRENT_DATE
      AND c.end_date >= CURRENT_DATE
  LOOP
    -- Cek apakah tagihan untuk periode ini sudah ada
    IF NOT EXISTS (
      SELECT 1 FROM public.invoices
      WHERE contract_id = active_contract.id
        AND billing_period = current_billing_period
    ) THEN
      -- Hitung total tagihan awal (sewa kamar)
      total_invoice_amount := active_contract.monthly_rate;

      -- Tambahkan biaya dari semua fasilitas opsional yang aktif
      FOR active_facility IN
        SELECT cf.id, cf.price_per_month, COALESCE(cf.custom_facility_name, fm.name, 'Fasilitas Tambahan') AS facility_name
        FROM public.contract_facilities cf
        LEFT JOIN public.facility_master fm ON fm.id = cf.facility_id
        WHERE cf.contract_id = active_contract.id
          AND cf.status = 'active'
          AND cf.start_date <= CURRENT_DATE
          AND (cf.end_date IS NULL OR cf.end_date >= CURRENT_DATE)
      LOOP
        total_invoice_amount := total_invoice_amount + active_facility.price_per_month;
      END LOOP;

      -- Buat invoice baru
      INSERT INTO public.invoices (
        contract_id, room_id, tenant_id, owner_id,
        invoice_number, billing_period, due_date, total_amount, status
      ) VALUES (
        active_contract.id,
        active_contract.room_id,
        active_contract.tenant_id,
        active_contract.owner_id,
        generate_invoice_number(current_billing_period),
        current_billing_period,
        current_billing_period + billing_config.billing_due_days,
        total_invoice_amount,
        'unpaid'
      )
      RETURNING id INTO new_invoice_id;

      -- Buat invoice item untuk sewa pokok
      INSERT INTO public.invoice_items (
        invoice_id, name, quantity, unit_price, total_price, is_mandatory
      ) VALUES (
        new_invoice_id,
        'Sewa Kamar',
        1,
        active_contract.monthly_rate,
        active_contract.monthly_rate,
        TRUE
      );

      -- Buat invoice items untuk fasilitas opsional yang aktif
      FOR active_facility IN
        SELECT cf.id, cf.price_per_month, COALESCE(cf.custom_facility_name, fm.name, 'Fasilitas Tambahan') AS facility_name
        FROM public.contract_facilities cf
        LEFT JOIN public.facility_master fm ON fm.id = cf.facility_id
        WHERE cf.contract_id = active_contract.id
          AND cf.status = 'active'
          AND cf.start_date <= CURRENT_DATE
          AND (cf.end_date IS NULL OR cf.end_date >= CURRENT_DATE)
      LOOP
        INSERT INTO public.invoice_items (
          invoice_id, name, description, quantity, unit_price, total_price, is_mandatory
        ) VALUES (
          new_invoice_id,
          active_facility.facility_name,
          'Fasilitas opsional bulanan',
          1,
          active_facility.price_per_month,
          active_facility.price_per_month,
          FALSE
        );
      END LOOP;

      invoices_created := invoices_created + 1;
    END IF;
  END LOOP;

  RETURN invoices_created;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- 4. FUNCTION RPC: add_facility_to_contract
-- Menambahkan fasilitas opsional ke kontrak dengan Smart Billing Check
-- ============================================================

CREATE OR REPLACE FUNCTION add_facility_to_contract(
  p_contract_id UUID,
  p_facility_id UUID DEFAULT NULL,
  p_custom_name TEXT DEFAULT NULL,
  p_price_per_month DECIMAL(12,2) DEFAULT 0,
  p_billing_mode TEXT DEFAULT 'next_invoice' -- 'next_invoice' (or 'auto'), 'bill_immediately'
)
RETURNS JSON AS $$
DECLARE
  v_contract RECORD;
  v_facility_name TEXT;
  v_new_cf_id UUID;
  v_open_invoice RECORD;
  v_new_invoice_id UUID;
  v_result JSON;
BEGIN
  -- 1. Verifikasi kontrak ada dan aktif
  SELECT id, room_id, tenant_id, owner_id, status
  INTO v_contract
  FROM public.contracts
  WHERE id = p_contract_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Kontrak tidak ditemukan dengan ID %', p_contract_id;
  END IF;

  IF v_contract.status != 'active' THEN
    RAISE EXCEPTION 'Kontrak sudah tidak aktif (status: %)', v_contract.status;
  END IF;

  -- 2. Tentukan nama fasilitas untuk log/item tagihan
  IF p_facility_id IS NOT NULL THEN
    SELECT name INTO v_facility_name FROM public.facility_master WHERE id = p_facility_id;
  END IF;
  v_facility_name := COALESCE(p_custom_name, v_facility_name, 'Fasilitas Tambahan');

  -- 3. Masukkan record ke contract_facilities
  INSERT INTO public.contract_facilities (
    contract_id, facility_id, custom_facility_name, price_per_month, status, start_date
  ) VALUES (
    p_contract_id, p_facility_id, p_custom_name, p_price_per_month, 'active', CURRENT_DATE
  ) RETURNING id INTO v_new_cf_id;

  -- 4. Logika Smart Billing
  IF p_billing_mode = 'bill_immediately' THEN
    -- Buat invoice baru khusus fasilitas ini
    INSERT INTO public.invoices (
      contract_id, room_id, tenant_id, owner_id,
      invoice_number, billing_period, due_date, total_amount, status
    ) VALUES (
      p_contract_id, v_contract.room_id, v_contract.tenant_id, v_contract.owner_id,
      generate_invoice_number(CURRENT_DATE), CURRENT_DATE, CURRENT_DATE + INTERVAL '7 days', p_price_per_month, 'unpaid'
    ) RETURNING id INTO v_new_invoice_id;

    INSERT INTO public.invoice_items (
      invoice_id, name, description, quantity, unit_price, total_price, is_mandatory
    ) VALUES (
      v_new_invoice_id, v_facility_name, 'Tagihan langsung fasilitas tambahan', 1, p_price_per_month, p_price_per_month, FALSE
    );

    -- Notifikasi dikirim dari FE via notificationService.js setelah RPC berhasil
    -- (menghindari RLS violation karena INSERT dari SECURITY DEFINER memerlukan policy tambahan)
    v_result := json_build_object(
      'success', true,
      'contract_facility_id', v_new_cf_id,
      'billing_action', 'invoice_created',
      'invoice_id', v_new_invoice_id,
      'tenant_id', v_contract.tenant_id,
      'facility_name', v_facility_name,
      'message', format('Fasilitas %s berhasil ditambahkan dan invoice baru dibuat.', v_facility_name)
    );


  ELSE
    -- Smart Check: Cari apakah ada invoice UNPAID pada bulan berjalan / aktif
    SELECT id, total_amount INTO v_open_invoice
    FROM public.invoices
    WHERE contract_id = p_contract_id AND status = 'unpaid'
    ORDER BY billing_period DESC LIMIT 1;

    IF FOUND THEN
      -- Inject ke invoice unpaid saat ini
      INSERT INTO public.invoice_items (
        invoice_id, name, description, quantity, unit_price, total_price, is_mandatory
      ) VALUES (
        v_open_invoice.id, v_facility_name, 'Tambahan fasilitas bulan berjalan', 1, p_price_per_month, p_price_per_month, FALSE
      );

      UPDATE public.invoices
      SET total_amount = total_amount + p_price_per_month
      WHERE id = v_open_invoice.id;

      v_result := json_build_object(
        'success', true,
        'contract_facility_id', v_new_cf_id,
        'billing_action', 'merged_to_unpaid_invoice',
        'invoice_id', v_open_invoice.id,
        'message', format('Fasilitas %s berhasil disatukan dengan tagihan kos yang belum dibayar.', v_facility_name)
      );
    ELSE
      -- Tidak ada invoice unpaid (sudah lunas) → masuk otomatis di tagihan bulan depan
      v_result := json_build_object(
        'success', true,
        'contract_facility_id', v_new_cf_id,
        'billing_action', 'next_invoice',
        'message', format('Fasilitas %s berhasil diaktifkan dan akan ditagih pada tagihan kos berikutnya.', v_facility_name)
      );
    END IF;
  END IF;

  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- 5. FUNCTION RPC: update_contract_facility_status
-- Mengubah status fasilitas tambahan (misal berhenti berlangganan)
-- ============================================================

CREATE OR REPLACE FUNCTION update_contract_facility_status(
  p_contract_facility_id UUID,
  p_new_status TEXT,
  p_end_date DATE DEFAULT CURRENT_DATE
)
RETURNS JSON AS $$
DECLARE
  v_cf RECORD;
BEGIN
  SELECT * INTO v_cf
  FROM public.contract_facilities
  WHERE id = p_contract_facility_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Record fasilitas tidak ditemukan';
  END IF;

  UPDATE public.contract_facilities
  SET status = p_new_status,
      end_date = CASE WHEN p_new_status IN ('inactive', 'cancelled') THEN p_end_date ELSE end_date END,
      updated_at = NOW()
  WHERE id = p_contract_facility_id;

  RETURN json_build_object(
    'success', true,
    'id', p_contract_facility_id,
    'new_status', p_new_status
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

