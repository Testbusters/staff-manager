-- ROLLBACK: ALTER TABLE collaborators DROP COLUMN IF EXISTS intestatario_pagamento;
ALTER TABLE collaborators ADD COLUMN IF NOT EXISTS intestatario_pagamento TEXT;
