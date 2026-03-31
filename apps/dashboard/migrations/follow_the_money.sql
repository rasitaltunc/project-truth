-- ============================================
-- PROJECT TRUTH - FOLLOW THE MONEY
-- Finansal Takip Veritabanı Şeması
-- ============================================

-- Financial Accounts (Banka hesapları, offshore hesaplar, vs.)
CREATE TABLE IF NOT EXISTS financial_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entity_id UUID NOT NULL REFERENCES entities(id) ON DELETE CASCADE,
    account_type VARCHAR(50) NOT NULL DEFAULT 'unknown',
    account_name VARCHAR(255),
    bank_name VARCHAR(255),
    account_number VARCHAR(100),  -- Kısmen gizli tutulabilir
    country VARCHAR(100) NOT NULL DEFAULT 'Unknown',
    currency VARCHAR(10) NOT NULL DEFAULT 'USD',
    is_offshore BOOLEAN DEFAULT FALSE,
    is_shell_company BOOLEAN DEFAULT FALSE,
    estimated_balance DECIMAL(20, 2),
    first_seen DATE,
    last_activity DATE,
    source_documents TEXT[] DEFAULT '{}',
    confidence INTEGER DEFAULT 50 CHECK (confidence >= 0 AND confidence <= 100),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Financial Transactions (Para transferleri)
CREATE TABLE IF NOT EXISTS financial_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    from_entity_id UUID REFERENCES entities(id) ON DELETE SET NULL,
    from_account_id UUID REFERENCES financial_accounts(id) ON DELETE SET NULL,
    to_entity_id UUID REFERENCES entities(id) ON DELETE SET NULL,
    to_account_id UUID REFERENCES financial_accounts(id) ON DELETE SET NULL,
    transaction_type VARCHAR(50) NOT NULL DEFAULT 'unknown',
    amount DECIMAL(20, 2) NOT NULL,
    currency VARCHAR(10) NOT NULL DEFAULT 'USD',
    amount_usd DECIMAL(20, 2),  -- USD karşılığı (karşılaştırma için)
    date DATE,
    date_precision VARCHAR(20) DEFAULT 'approximate',
    description TEXT,
    purpose TEXT,
    is_suspicious BOOLEAN DEFAULT FALSE,
    red_flags TEXT[] DEFAULT '{}',
    source_documents TEXT[] DEFAULT '{}',
    confidence INTEGER DEFAULT 50 CHECK (confidence >= 0 AND confidence <= 100),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Assets (Varlıklar - uçaklar, yatlar, gayrimenkuller)
CREATE TABLE IF NOT EXISTS assets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entity_id UUID NOT NULL REFERENCES entities(id) ON DELETE CASCADE,
    asset_type VARCHAR(50) NOT NULL DEFAULT 'other',
    name VARCHAR(255) NOT NULL,
    description TEXT,
    identifier VARCHAR(100),  -- N-number, plaka, vs.
    location VARCHAR(255),
    purchase_date DATE,
    purchase_price DECIMAL(20, 2),
    current_value DECIMAL(20, 2),
    currency VARCHAR(10) DEFAULT 'USD',
    source_documents TEXT[] DEFAULT '{}',
    confidence INTEGER DEFAULT 50 CHECK (confidence >= 0 AND confidence <= 100),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_financial_accounts_entity ON financial_accounts(entity_id);
CREATE INDEX IF NOT EXISTS idx_financial_accounts_offshore ON financial_accounts(is_offshore) WHERE is_offshore = TRUE;
CREATE INDEX IF NOT EXISTS idx_financial_accounts_shell ON financial_accounts(is_shell_company) WHERE is_shell_company = TRUE;

CREATE INDEX IF NOT EXISTS idx_transactions_from ON financial_transactions(from_entity_id);
CREATE INDEX IF NOT EXISTS idx_transactions_to ON financial_transactions(to_entity_id);
CREATE INDEX IF NOT EXISTS idx_transactions_date ON financial_transactions(date);
CREATE INDEX IF NOT EXISTS idx_transactions_suspicious ON financial_transactions(is_suspicious) WHERE is_suspicious = TRUE;
CREATE INDEX IF NOT EXISTS idx_transactions_amount ON financial_transactions(amount_usd DESC);

CREATE INDEX IF NOT EXISTS idx_assets_entity ON assets(entity_id);
CREATE INDEX IF NOT EXISTS idx_assets_type ON assets(asset_type);

-- ============================================
-- RPC Functions
-- ============================================

-- Get financial network (entities connected through money)
CREATE OR REPLACE FUNCTION get_financial_network(
    center_entity_id UUID,
    max_depth INTEGER DEFAULT 2
)
RETURNS TABLE (
    entity_id UUID,
    depth INTEGER,
    connection_type TEXT
) AS $$
WITH RECURSIVE network AS (
    -- Base: center entity
    SELECT
        center_entity_id AS entity_id,
        0 AS depth,
        'center'::TEXT AS connection_type

    UNION

    -- Recursive: entities connected through transactions
    SELECT DISTINCT
        CASE
            WHEN ft.from_entity_id = n.entity_id THEN ft.to_entity_id
            ELSE ft.from_entity_id
        END AS entity_id,
        n.depth + 1 AS depth,
        'financial'::TEXT AS connection_type
    FROM network n
    JOIN financial_transactions ft ON (
        ft.from_entity_id = n.entity_id OR
        ft.to_entity_id = n.entity_id
    )
    WHERE n.depth < max_depth
      AND (
          (ft.from_entity_id = n.entity_id AND ft.to_entity_id IS NOT NULL) OR
          (ft.to_entity_id = n.entity_id AND ft.from_entity_id IS NOT NULL)
      )
)
SELECT DISTINCT entity_id, MIN(depth) AS depth, 'financial' AS connection_type
FROM network
WHERE entity_id IS NOT NULL
GROUP BY entity_id;
$$ LANGUAGE SQL STABLE;

-- Get entity financial summary
CREATE OR REPLACE FUNCTION get_entity_financial_summary(target_entity_id UUID)
RETURNS TABLE (
    total_inflow DECIMAL,
    total_outflow DECIMAL,
    net_flow DECIMAL,
    transaction_count BIGINT,
    suspicious_count BIGINT,
    account_count BIGINT,
    asset_count BIGINT,
    asset_value DECIMAL
) AS $$
SELECT
    COALESCE((SELECT SUM(amount_usd) FROM financial_transactions WHERE to_entity_id = target_entity_id), 0) AS total_inflow,
    COALESCE((SELECT SUM(amount_usd) FROM financial_transactions WHERE from_entity_id = target_entity_id), 0) AS total_outflow,
    COALESCE((SELECT SUM(amount_usd) FROM financial_transactions WHERE to_entity_id = target_entity_id), 0) -
    COALESCE((SELECT SUM(amount_usd) FROM financial_transactions WHERE from_entity_id = target_entity_id), 0) AS net_flow,
    (SELECT COUNT(*) FROM financial_transactions WHERE from_entity_id = target_entity_id OR to_entity_id = target_entity_id) AS transaction_count,
    (SELECT COUNT(*) FROM financial_transactions WHERE (from_entity_id = target_entity_id OR to_entity_id = target_entity_id) AND is_suspicious = TRUE) AS suspicious_count,
    (SELECT COUNT(*) FROM financial_accounts WHERE entity_id = target_entity_id) AS account_count,
    (SELECT COUNT(*) FROM assets WHERE entity_id = target_entity_id) AS asset_count,
    COALESCE((SELECT SUM(current_value) FROM assets WHERE entity_id = target_entity_id), 0) AS asset_value;
$$ LANGUAGE SQL STABLE;

-- ============================================
-- Views
-- ============================================

-- Top money movers
CREATE OR REPLACE VIEW top_money_movers AS
SELECT
    e.id,
    e.name,
    e.type,
    COALESCE(inflow.total, 0) AS total_inflow,
    COALESCE(outflow.total, 0) AS total_outflow,
    COALESCE(inflow.total, 0) + COALESCE(outflow.total, 0) AS total_volume,
    COALESCE(suspicious.count, 0) AS suspicious_transaction_count
FROM entities e
LEFT JOIN (
    SELECT to_entity_id AS entity_id, SUM(amount_usd) AS total
    FROM financial_transactions
    GROUP BY to_entity_id
) inflow ON inflow.entity_id = e.id
LEFT JOIN (
    SELECT from_entity_id AS entity_id, SUM(amount_usd) AS total
    FROM financial_transactions
    GROUP BY from_entity_id
) outflow ON outflow.entity_id = e.id
LEFT JOIN (
    SELECT
        CASE WHEN from_entity_id IS NOT NULL THEN from_entity_id ELSE to_entity_id END AS entity_id,
        COUNT(*) AS count
    FROM financial_transactions
    WHERE is_suspicious = TRUE
    GROUP BY 1
) suspicious ON suspicious.entity_id = e.id
WHERE COALESCE(inflow.total, 0) + COALESCE(outflow.total, 0) > 0
ORDER BY total_volume DESC;

-- Suspicious patterns view
CREATE OR REPLACE VIEW suspicious_patterns AS
SELECT
    ft.*,
    from_e.name AS from_entity_name,
    to_e.name AS to_entity_name,
    fa_from.is_offshore AS from_offshore,
    fa_to.is_offshore AS to_offshore,
    fa_from.is_shell_company AS from_shell,
    fa_to.is_shell_company AS to_shell
FROM financial_transactions ft
LEFT JOIN entities from_e ON ft.from_entity_id = from_e.id
LEFT JOIN entities to_e ON ft.to_entity_id = to_e.id
LEFT JOIN financial_accounts fa_from ON ft.from_account_id = fa_from.id
LEFT JOIN financial_accounts fa_to ON ft.to_account_id = fa_to.id
WHERE ft.is_suspicious = TRUE
   OR fa_from.is_offshore = TRUE
   OR fa_to.is_offshore = TRUE
   OR fa_from.is_shell_company = TRUE
   OR fa_to.is_shell_company = TRUE
ORDER BY ft.amount_usd DESC NULLS LAST;

-- Financial stats view
CREATE OR REPLACE VIEW financial_stats AS
SELECT
    (SELECT COUNT(*) FROM financial_accounts) AS total_accounts,
    (SELECT COUNT(*) FROM financial_accounts WHERE is_offshore = TRUE) AS offshore_accounts,
    (SELECT COUNT(*) FROM financial_accounts WHERE is_shell_company = TRUE) AS shell_companies,
    (SELECT COUNT(*) FROM financial_transactions) AS total_transactions,
    (SELECT COUNT(*) FROM financial_transactions WHERE is_suspicious = TRUE) AS suspicious_transactions,
    (SELECT COALESCE(SUM(amount_usd), 0) FROM financial_transactions) AS total_volume_tracked,
    (SELECT COUNT(*) FROM assets) AS total_assets,
    (SELECT COALESCE(SUM(current_value), 0) FROM assets) AS total_asset_value;

-- ============================================
-- Triggers
-- ============================================

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_financial_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_financial_accounts_timestamp ON financial_accounts;
CREATE TRIGGER update_financial_accounts_timestamp
    BEFORE UPDATE ON financial_accounts
    FOR EACH ROW
    EXECUTE FUNCTION update_financial_timestamp();

DROP TRIGGER IF EXISTS update_financial_transactions_timestamp ON financial_transactions;
CREATE TRIGGER update_financial_transactions_timestamp
    BEFORE UPDATE ON financial_transactions
    FOR EACH ROW
    EXECUTE FUNCTION update_financial_timestamp();

DROP TRIGGER IF EXISTS update_assets_timestamp ON assets;
CREATE TRIGGER update_assets_timestamp
    BEFORE UPDATE ON assets
    FOR EACH ROW
    EXECUTE FUNCTION update_financial_timestamp();

-- ============================================
-- Sample Data (Epstein Network Financial Data)
-- ============================================

-- Bu kısım gerçek verilerle doldurulacak
-- Şimdilik örnek yapı gösteriliyor

-- ÖRNEK: Jeffrey Epstein'ın bilinen hesapları
-- INSERT INTO financial_accounts (entity_id, account_type, bank_name, country, currency, is_offshore)
-- SELECT id, 'bank_account', 'JPMorgan Chase', 'United States', 'USD', FALSE
-- FROM entities WHERE name ILIKE '%Jeffrey Epstein%' LIMIT 1;
