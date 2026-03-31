-- ═══════════════════════════════════════════════════════════════
-- FAZ 0 — FK CONSTRAINTS + PERFORMANCE INDEXES
-- ═══════════════════════════════════════════════════════════════
--
-- Tarih: 30 Mart 2026
-- Amaç: Veritabanı bütünlüğü ve performans altyapısı
--
-- BU DOSYA 3 BÖLÜMDEN OLUŞUR:
--   BÖLÜM 1: Orphan kayıt tespit ve temizliği (SELECT sorgularıyla kontrol)
--   BÖLÜM 2: FK Constraints (ALTER TABLE ADD CONSTRAINT)
--   BÖLÜM 3: Performance Indexes (CREATE INDEX CONCURRENTLY)
--
-- ÇALIŞTIRMA TALİMATI:
--   1. ÖNCE Bölüm 1'deki SELECT sorgularını çalıştır → orphan var mı kontrol et
--   2. Orphan varsa DELETE sorgularını çalıştır (yorum satırından çıkar)
--   3. Bölüm 2'deki FK constraint'leri ekle
--   4. Bölüm 3'teki index'leri ekle
--
-- ⚠️ DİKKAT:
--   - Production'da index oluşturmak için CONCURRENTLY kullan (tablo kilitlemez)
--   - FK constraint eklemeden ÖNCE orphan temizliği YAPILMALI
--   - Her bölümü ayrı transaction olarak çalıştır
-- ═══════════════════════════════════════════════════════════════


-- ═══════════════════════════════════════════════════════════════
-- BÖLÜM 1: ORPHAN KAYIT TESPİT VE TEMİZLİĞİ
-- ═══════════════════════════════════════════════════════════════
-- Bu sorguları çalıştırarak FK eklemeden önce bozuk veriyi tespit et.
-- Eğer sonuç dönerse, orphan kayıtları temizle (DELETE sorgularını aç).

-- 1.1 links → nodes (source_id ve target_id geçerli mi?)
SELECT l.id, l.source_id, l.target_id
FROM links l
WHERE l.source_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM nodes n WHERE n.id = l.source_id);

SELECT l.id, l.source_id, l.target_id
FROM links l
WHERE l.target_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM nodes n WHERE n.id = l.target_id);

-- 1.2 evidence_archive → nodes + links
SELECT ea.id, ea.node_id, ea.link_id
FROM evidence_archive ea
WHERE ea.node_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM nodes n WHERE n.id = ea.node_id);

SELECT ea.id, ea.node_id, ea.link_id
FROM evidence_archive ea
WHERE ea.link_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM links l WHERE l.id = ea.link_id);

-- 1.3 investigations → networks
SELECT i.id, i.network_id
FROM investigations i
WHERE i.network_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM networks n WHERE n.id = i.network_id);

-- 1.4 investigation_steps → investigations
SELECT s.id, s.investigation_id
FROM investigation_steps s
WHERE s.investigation_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM investigations i WHERE i.id = s.investigation_id);

-- 1.5 investigation_votes → investigations
SELECT v.id, v.investigation_id
FROM investigation_votes v
WHERE v.investigation_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM investigations i WHERE i.id = v.investigation_id);

-- 1.6 user_badges → networks
SELECT ub.id, ub.network_id
FROM user_badges ub
WHERE ub.network_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM networks n WHERE n.id = ub.network_id);

-- 1.7 badge_nominations → networks
SELECT bn.id, bn.network_id
FROM badge_nominations bn
WHERE bn.network_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM networks n WHERE n.id = bn.network_id);

-- 1.8 documents → networks
SELECT d.id, d.network_id
FROM documents d
WHERE d.network_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM networks n WHERE n.id = d.network_id);

-- 1.9 document_network_mappings → documents + networks
SELECT dnm.id, dnm.document_id, dnm.network_id
FROM document_network_mappings dnm
WHERE dnm.document_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM documents d WHERE d.id = dnm.document_id);

SELECT dnm.id, dnm.document_id, dnm.network_id
FROM document_network_mappings dnm
WHERE dnm.network_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM networks n WHERE n.id = dnm.network_id);

-- 1.10 document_derived_items → documents
SELECT ddi.id, ddi.document_id
FROM document_derived_items ddi
WHERE ddi.document_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM documents d WHERE d.id = ddi.document_id);

-- 1.11 data_quarantine → documents
SELECT dq.id, dq.document_id
FROM data_quarantine dq
WHERE dq.document_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM documents d WHERE d.id = dq.document_id);

-- 1.12 quarantine_reviews → data_quarantine
SELECT qr.id, qr.quarantine_id
FROM quarantine_reviews qr
WHERE qr.quarantine_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM data_quarantine dq WHERE dq.id = qr.quarantine_id);

-- 1.13 entity_resolution_log → data_quarantine + nodes
SELECT erl.id, erl.quarantine_id
FROM entity_resolution_log erl
WHERE erl.quarantine_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM data_quarantine dq WHERE dq.id = erl.quarantine_id);

-- 1.14 investigation_tasks → networks + documents + data_quarantine + document_derived_items
SELECT it.id, it.network_id
FROM investigation_tasks it
WHERE it.network_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM networks n WHERE n.id = it.network_id);

SELECT it.id, it.source_document_id
FROM investigation_tasks it
WHERE it.source_document_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM documents d WHERE d.id = it.source_document_id);

SELECT it.id, it.source_quarantine_id
FROM investigation_tasks it
WHERE it.source_quarantine_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM data_quarantine dq WHERE dq.id = it.source_quarantine_id);

SELECT it.id, it.source_derived_item_id
FROM investigation_tasks it
WHERE it.source_derived_item_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM document_derived_items ddi WHERE ddi.id = it.source_derived_item_id);

-- 1.15 task_assignments → investigation_tasks
SELECT ta.id, ta.task_id
FROM task_assignments ta
WHERE ta.task_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM investigation_tasks it WHERE it.id = ta.task_id);

-- 1.16 collective_dms_shards → collective_dms
SELECT cds.id, cds.collective_dms_id
FROM collective_dms_shards cds
WHERE cds.collective_dms_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM collective_dms cd WHERE cd.id = cds.collective_dms_id);

-- 1.17 collective_alerts → collective_dms
SELECT ca.id, ca.collective_dms_id
FROM collective_alerts ca
WHERE ca.collective_dms_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM collective_dms cd WHERE cd.id = ca.collective_dms_id);

-- 1.18 proposed_link_evidence → proposed_links
SELECT ple.id, ple.proposed_link_id
FROM proposed_link_evidence ple
WHERE ple.proposed_link_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM proposed_links pl WHERE pl.id = ple.proposed_link_id);

-- 1.19 proposed_link_votes → proposed_links
SELECT plv.id, plv.proposed_link_id
FROM proposed_link_votes plv
WHERE plv.proposed_link_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM proposed_links pl WHERE pl.id = plv.proposed_link_id);

-- 1.20 node_query_stats → nodes
SELECT nqs.node_id
FROM node_query_stats nqs
WHERE nqs.node_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM nodes n WHERE n.id = nqs.node_id);

-- ─────────────────────────────────────────────────────────────
-- ORPHAN TEMİZLİK (Yukarıdaki SELECT'ler sonuç dönerse aç)
-- ─────────────────────────────────────────────────────────────
-- ⚠️ Bu DELETE sorgularını sadece orphan tespit EDİLDİKTEN SONRA çalıştır!
-- Her birini yorum satırından çıkararak tek tek çalıştır.

-- DELETE FROM links WHERE source_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM nodes n WHERE n.id = links.source_id);
-- DELETE FROM links WHERE target_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM nodes n WHERE n.id = links.target_id);
-- DELETE FROM evidence_archive WHERE node_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM nodes n WHERE n.id = evidence_archive.node_id);
-- DELETE FROM evidence_archive WHERE link_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM links l WHERE l.id = evidence_archive.link_id);
-- DELETE FROM investigation_steps WHERE NOT EXISTS (SELECT 1 FROM investigations i WHERE i.id = investigation_steps.investigation_id);
-- DELETE FROM investigation_votes WHERE NOT EXISTS (SELECT 1 FROM investigations i WHERE i.id = investigation_votes.investigation_id);
-- DELETE FROM user_badges WHERE network_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM networks n WHERE n.id = user_badges.network_id);
-- DELETE FROM badge_nominations WHERE network_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM networks n WHERE n.id = badge_nominations.network_id);
-- DELETE FROM document_network_mappings WHERE NOT EXISTS (SELECT 1 FROM documents d WHERE d.id = document_network_mappings.document_id);
-- DELETE FROM document_network_mappings WHERE network_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM networks n WHERE n.id = document_network_mappings.network_id);
-- DELETE FROM document_derived_items WHERE NOT EXISTS (SELECT 1 FROM documents d WHERE d.id = document_derived_items.document_id);
-- DELETE FROM data_quarantine WHERE document_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM documents d WHERE d.id = data_quarantine.document_id);
-- DELETE FROM quarantine_reviews WHERE NOT EXISTS (SELECT 1 FROM data_quarantine dq WHERE dq.id = quarantine_reviews.quarantine_id);
-- DELETE FROM entity_resolution_log WHERE quarantine_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM data_quarantine dq WHERE dq.id = entity_resolution_log.quarantine_id);
-- DELETE FROM task_assignments WHERE NOT EXISTS (SELECT 1 FROM investigation_tasks it WHERE it.id = task_assignments.task_id);
-- DELETE FROM collective_dms_shards WHERE NOT EXISTS (SELECT 1 FROM collective_dms cd WHERE cd.id = collective_dms_shards.collective_dms_id);
-- DELETE FROM collective_alerts WHERE NOT EXISTS (SELECT 1 FROM collective_dms cd WHERE cd.id = collective_alerts.collective_dms_id);
-- DELETE FROM proposed_link_evidence WHERE NOT EXISTS (SELECT 1 FROM proposed_links pl WHERE pl.id = proposed_link_evidence.proposed_link_id);
-- DELETE FROM proposed_link_votes WHERE NOT EXISTS (SELECT 1 FROM proposed_links pl WHERE pl.id = proposed_link_votes.proposed_link_id);
-- DELETE FROM node_query_stats WHERE NOT EXISTS (SELECT 1 FROM nodes n WHERE n.id = node_query_stats.node_id);


-- ═══════════════════════════════════════════════════════════════
-- BÖLÜM 2: FK CONSTRAINTS
-- ═══════════════════════════════════════════════════════════════
-- Her constraint IF NOT EXISTS benzeri bir kontrol ile güvenli hale getirildi.
-- Supabase Dashboard SQL Editor'de çalıştırılabilir.
--
-- Strateji:
--   - Core tablolar (networks, nodes): root — başkalarına referans vermez
--   - Child tablolar: ON DELETE CASCADE (silinen parent → child de silinir)
--   - Kontekst tablolar (investigations→networks): ON DELETE SET NULL (network silinse bile soruşturma kalır)
--   - Audit tablolar (data_provenance, transparency_log): FK YOK (append-only, referansları uygulama seviyesinde)

-- ─────────────────────────────────────────────────────────────
-- 2.1 CORE GRAPH: links → nodes
-- ─────────────────────────────────────────────────────────────
-- links tablosunun source_id ve target_id'si nodes'a referans vermeli
-- Strateji: CASCADE — node silinirse bağlantıları da silinir

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'fk_links_source_node' AND table_name = 'links'
  ) THEN
    ALTER TABLE links
      ADD CONSTRAINT fk_links_source_node
      FOREIGN KEY (source_id) REFERENCES nodes(id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'fk_links_target_node' AND table_name = 'links'
  ) THEN
    ALTER TABLE links
      ADD CONSTRAINT fk_links_target_node
      FOREIGN KEY (target_id) REFERENCES nodes(id) ON DELETE CASCADE;
  END IF;
END $$;

-- ─────────────────────────────────────────────────────────────
-- 2.2 EVIDENCE: evidence_archive → nodes + links
-- ─────────────────────────────────────────────────────────────

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'fk_evidence_node' AND table_name = 'evidence_archive'
  ) THEN
    ALTER TABLE evidence_archive
      ADD CONSTRAINT fk_evidence_node
      FOREIGN KEY (node_id) REFERENCES nodes(id) ON DELETE SET NULL;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'fk_evidence_link' AND table_name = 'evidence_archive'
  ) THEN
    ALTER TABLE evidence_archive
      ADD CONSTRAINT fk_evidence_link
      FOREIGN KEY (link_id) REFERENCES links(id) ON DELETE SET NULL;
  END IF;
END $$;

-- ─────────────────────────────────────────────────────────────
-- 2.3 INVESTIGATIONS → networks (SET NULL — soruşturma kalır)
-- ─────────────────────────────────────────────────────────────

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'fk_investigations_network' AND table_name = 'investigations'
  ) THEN
    ALTER TABLE investigations
      ADD CONSTRAINT fk_investigations_network
      FOREIGN KEY (network_id) REFERENCES networks(id) ON DELETE SET NULL;
  END IF;
END $$;

-- investigations self-referential (parent_id)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'fk_investigations_parent' AND table_name = 'investigations'
  ) THEN
    ALTER TABLE investigations
      ADD CONSTRAINT fk_investigations_parent
      FOREIGN KEY (parent_id) REFERENCES investigations(id) ON DELETE SET NULL;
  END IF;
END $$;

-- investigation_steps → investigations (CASCADE)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'fk_inv_steps_investigation' AND table_name = 'investigation_steps'
  ) THEN
    ALTER TABLE investigation_steps
      ADD CONSTRAINT fk_inv_steps_investigation
      FOREIGN KEY (investigation_id) REFERENCES investigations(id) ON DELETE CASCADE;
  END IF;
END $$;

-- investigation_votes → investigations (CASCADE)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'fk_inv_votes_investigation' AND table_name = 'investigation_votes'
  ) THEN
    ALTER TABLE investigation_votes
      ADD CONSTRAINT fk_inv_votes_investigation
      FOREIGN KEY (investigation_id) REFERENCES investigations(id) ON DELETE CASCADE;
  END IF;
END $$;

-- ─────────────────────────────────────────────────────────────
-- 2.4 NODE STATS → nodes (CASCADE)
-- ─────────────────────────────────────────────────────────────

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'fk_node_stats_node' AND table_name = 'node_query_stats'
  ) THEN
    ALTER TABLE node_query_stats
      ADD CONSTRAINT fk_node_stats_node
      FOREIGN KEY (node_id) REFERENCES nodes(id) ON DELETE CASCADE;
  END IF;
END $$;

-- ─────────────────────────────────────────────────────────────
-- 2.5 BADGE & REPUTATION → networks
-- ─────────────────────────────────────────────────────────────

-- user_badges → networks (CASCADE — ağ silinirse badge'ler de)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'fk_user_badges_network' AND table_name = 'user_badges'
  ) THEN
    ALTER TABLE user_badges
      ADD CONSTRAINT fk_user_badges_network
      FOREIGN KEY (network_id) REFERENCES networks(id) ON DELETE CASCADE;
  END IF;
END $$;

-- user_badges → badge_tiers
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'fk_user_badges_tier' AND table_name = 'user_badges'
  ) THEN
    ALTER TABLE user_badges
      ADD CONSTRAINT fk_user_badges_tier
      FOREIGN KEY (badge_tier) REFERENCES badge_tiers(id);
  END IF;
END $$;

-- user_global_badges → badge_tiers
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'fk_user_global_badges_tier' AND table_name = 'user_global_badges'
  ) THEN
    ALTER TABLE user_global_badges
      ADD CONSTRAINT fk_user_global_badges_tier
      FOREIGN KEY (badge_tier) REFERENCES badge_tiers(id);
  END IF;
END $$;

-- badge_nominations → networks (CASCADE)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'fk_badge_nominations_network' AND table_name = 'badge_nominations'
  ) THEN
    ALTER TABLE badge_nominations
      ADD CONSTRAINT fk_badge_nominations_network
      FOREIGN KEY (network_id) REFERENCES networks(id) ON DELETE CASCADE;
  END IF;
END $$;

-- reputation_transactions → networks (SET NULL — itibar geçmişi kalır)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'fk_reputation_network' AND table_name = 'reputation_transactions'
  ) THEN
    ALTER TABLE reputation_transactions
      ADD CONSTRAINT fk_reputation_network
      FOREIGN KEY (network_id) REFERENCES networks(id) ON DELETE SET NULL;
  END IF;
END $$;

-- ─────────────────────────────────────────────────────────────
-- 2.6 DOCUMENTS → networks
-- ─────────────────────────────────────────────────────────────

-- documents → networks (SET NULL — belge kalır, ağ referansı null olur)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'fk_documents_network' AND table_name = 'documents'
  ) THEN
    ALTER TABLE documents
      ADD CONSTRAINT fk_documents_network
      FOREIGN KEY (network_id) REFERENCES networks(id) ON DELETE SET NULL;
  END IF;
END $$;

-- document_network_mappings → documents (CASCADE)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'fk_doc_mappings_document' AND table_name = 'document_network_mappings'
  ) THEN
    ALTER TABLE document_network_mappings
      ADD CONSTRAINT fk_doc_mappings_document
      FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE;
  END IF;
END $$;

-- document_network_mappings → networks (CASCADE)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'fk_doc_mappings_network' AND table_name = 'document_network_mappings'
  ) THEN
    ALTER TABLE document_network_mappings
      ADD CONSTRAINT fk_doc_mappings_network
      FOREIGN KEY (network_id) REFERENCES networks(id) ON DELETE CASCADE;
  END IF;
END $$;

-- document_derived_items → documents (CASCADE)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'fk_derived_items_document' AND table_name = 'document_derived_items'
  ) THEN
    ALTER TABLE document_derived_items
      ADD CONSTRAINT fk_derived_items_document
      FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE;
  END IF;
END $$;

-- document_scan_queue → documents (CASCADE)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'fk_scan_queue_document' AND table_name = 'document_scan_queue'
  ) THEN
    ALTER TABLE document_scan_queue
      ADD CONSTRAINT fk_scan_queue_document
      FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE;
  END IF;
END $$;

-- ─────────────────────────────────────────────────────────────
-- 2.7 QUARANTINE → documents + data_quarantine
-- ─────────────────────────────────────────────────────────────

-- data_quarantine → documents (CASCADE)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'fk_quarantine_document' AND table_name = 'data_quarantine'
  ) THEN
    ALTER TABLE data_quarantine
      ADD CONSTRAINT fk_quarantine_document
      FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE;
  END IF;
END $$;

-- quarantine_reviews → data_quarantine (CASCADE)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'fk_qreview_quarantine' AND table_name = 'quarantine_reviews'
  ) THEN
    ALTER TABLE quarantine_reviews
      ADD CONSTRAINT fk_qreview_quarantine
      FOREIGN KEY (quarantine_id) REFERENCES data_quarantine(id) ON DELETE CASCADE;
  END IF;
END $$;

-- entity_resolution_log → data_quarantine (CASCADE) + nodes (SET NULL)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'fk_entity_res_quarantine' AND table_name = 'entity_resolution_log'
  ) THEN
    ALTER TABLE entity_resolution_log
      ADD CONSTRAINT fk_entity_res_quarantine
      FOREIGN KEY (quarantine_id) REFERENCES data_quarantine(id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'fk_entity_res_node' AND table_name = 'entity_resolution_log'
  ) THEN
    ALTER TABLE entity_resolution_log
      ADD CONSTRAINT fk_entity_res_node
      FOREIGN KEY (matched_node_id) REFERENCES nodes(id) ON DELETE SET NULL;
  END IF;
END $$;

-- ─────────────────────────────────────────────────────────────
-- 2.8 PROPOSED LINKS → proposed_links
-- ─────────────────────────────────────────────────────────────

-- proposed_link_evidence → proposed_links (CASCADE)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'fk_pl_evidence_link' AND table_name = 'proposed_link_evidence'
  ) THEN
    ALTER TABLE proposed_link_evidence
      ADD CONSTRAINT fk_pl_evidence_link
      FOREIGN KEY (proposed_link_id) REFERENCES proposed_links(id) ON DELETE CASCADE;
  END IF;
END $$;

-- proposed_link_votes → proposed_links (CASCADE)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'fk_pl_votes_link' AND table_name = 'proposed_link_votes'
  ) THEN
    ALTER TABLE proposed_link_votes
      ADD CONSTRAINT fk_pl_votes_link
      FOREIGN KEY (proposed_link_id) REFERENCES proposed_links(id) ON DELETE CASCADE;
  END IF;
END $$;

-- ─────────────────────────────────────────────────────────────
-- 2.9 COLLECTIVE DMS (Shamir)
-- ─────────────────────────────────────────────────────────────

-- collective_dms_shards → collective_dms (CASCADE)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'fk_shards_collective' AND table_name = 'collective_dms_shards'
  ) THEN
    ALTER TABLE collective_dms_shards
      ADD CONSTRAINT fk_shards_collective
      FOREIGN KEY (collective_dms_id) REFERENCES collective_dms(id) ON DELETE CASCADE;
  END IF;
END $$;

-- proof_of_life_chain → collective_dms (SET NULL — zincir kaydı kalır)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'fk_pol_collective' AND table_name = 'proof_of_life_chain'
  ) THEN
    ALTER TABLE proof_of_life_chain
      ADD CONSTRAINT fk_pol_collective
      FOREIGN KEY (collective_dms_id) REFERENCES collective_dms(id) ON DELETE SET NULL;
  END IF;
END $$;

-- collective_alerts → collective_dms (CASCADE)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'fk_alerts_collective' AND table_name = 'collective_alerts'
  ) THEN
    ALTER TABLE collective_alerts
      ADD CONSTRAINT fk_alerts_collective
      FOREIGN KEY (collective_dms_id) REFERENCES collective_dms(id) ON DELETE CASCADE;
  END IF;
END $$;

-- ─────────────────────────────────────────────────────────────
-- 2.10 GAME (Sprint G1) → networks + documents + quarantine
-- ─────────────────────────────────────────────────────────────

-- investigation_tasks → networks (SET NULL)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'fk_inv_tasks_network' AND table_name = 'investigation_tasks'
  ) THEN
    ALTER TABLE investigation_tasks
      ADD CONSTRAINT fk_inv_tasks_network
      FOREIGN KEY (network_id) REFERENCES networks(id) ON DELETE SET NULL;
  END IF;
END $$;

-- investigation_tasks → documents (SET NULL — görev kalır, belge referansı null)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'fk_inv_tasks_document' AND table_name = 'investigation_tasks'
  ) THEN
    ALTER TABLE investigation_tasks
      ADD CONSTRAINT fk_inv_tasks_document
      FOREIGN KEY (source_document_id) REFERENCES documents(id) ON DELETE SET NULL;
  END IF;
END $$;

-- investigation_tasks → data_quarantine (SET NULL)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'fk_inv_tasks_quarantine' AND table_name = 'investigation_tasks'
  ) THEN
    ALTER TABLE investigation_tasks
      ADD CONSTRAINT fk_inv_tasks_quarantine
      FOREIGN KEY (source_quarantine_id) REFERENCES data_quarantine(id) ON DELETE SET NULL;
  END IF;
END $$;

-- investigation_tasks → document_derived_items (SET NULL)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'fk_inv_tasks_derived' AND table_name = 'investigation_tasks'
  ) THEN
    ALTER TABLE investigation_tasks
      ADD CONSTRAINT fk_inv_tasks_derived
      FOREIGN KEY (source_derived_item_id) REFERENCES document_derived_items(id) ON DELETE SET NULL;
  END IF;
END $$;

-- task_assignments → investigation_tasks (CASCADE)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'fk_task_assign_task' AND table_name = 'task_assignments'
  ) THEN
    ALTER TABLE task_assignments
      ADD CONSTRAINT fk_task_assign_task
      FOREIGN KEY (task_id) REFERENCES investigation_tasks(id) ON DELETE CASCADE;
  END IF;
END $$;

-- ─────────────────────────────────────────────────────────────
-- 2.11 LINK EVIDENCE TIMELINE → links
-- ─────────────────────────────────────────────────────────────

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'fk_let_link' AND table_name = 'link_evidence_timeline'
  ) THEN
    ALTER TABLE link_evidence_timeline
      ADD CONSTRAINT fk_let_link
      FOREIGN KEY (link_id) REFERENCES links(id) ON DELETE CASCADE;
  END IF;
END $$;

-- ─────────────────────────────────────────────────────────────
-- 2.12 EVIDENCE PROVENANCE → evidence_archive
-- ─────────────────────────────────────────────────────────────

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'fk_provenance_evidence' AND table_name = 'evidence_provenance'
  ) THEN
    ALTER TABLE evidence_provenance
      ADD CONSTRAINT fk_provenance_evidence
      FOREIGN KEY (evidence_id) REFERENCES evidence_archive(id) ON DELETE CASCADE;
  END IF;
END $$;

-- ─────────────────────────────────────────────────────────────
-- 2.13 CROSS REFERENCES → networks
-- ─────────────────────────────────────────────────────────────

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'fk_crossref_source_network' AND table_name = 'cross_references'
  ) THEN
    ALTER TABLE cross_references
      ADD CONSTRAINT fk_crossref_source_network
      FOREIGN KEY (source_network_id) REFERENCES networks(id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'fk_crossref_target_network' AND table_name = 'cross_references'
  ) THEN
    ALTER TABLE cross_references
      ADD CONSTRAINT fk_crossref_target_network
      FOREIGN KEY (target_network_id) REFERENCES networks(id) ON DELETE CASCADE;
  END IF;
END $$;


-- ═══════════════════════════════════════════════════════════════
-- BÖLÜM 3: PERFORMANCE INDEXES
-- ═══════════════════════════════════════════════════════════════
-- CONCURRENTLY kullanarak tablo kilit olmadan index oluşturur.
-- ⚠️ Supabase Dashboard'da CONCURRENTLY çalışmayabilir —
--    Bu durumda CONCURRENTLY kelimesini kaldırıp normal CREATE INDEX yap.

-- ─────────────────────────────────────────────────────────────
-- 3.0 GEREKLİ EXTENSION'LAR
-- ─────────────────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- ─────────────────────────────────────────────────────────────
-- 3.1 TIER 1 — KRİTİK (En çok sorgulanan tablolar)
-- ─────────────────────────────────────────────────────────────

-- nodes: network_id + tier (3D sahne yükleme)
CREATE INDEX IF NOT EXISTS idx_nodes_network_tier
  ON nodes(network_id, tier);

-- nodes: name text search (arama)
CREATE INDEX IF NOT EXISTS idx_nodes_name_trgm
  ON nodes USING gin(name gin_trgm_ops);
-- ⚠️ Yukarıdaki trigram index için: CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- links: source + target (graph traversal)
CREATE INDEX IF NOT EXISTS idx_links_source_target
  ON links(source_id, target_id);

-- links: evidence metadata (epistemolojik katman)
CREATE INDEX IF NOT EXISTS idx_links_evidence_type
  ON links(evidence_type) WHERE evidence_type IS NOT NULL;

-- evidence_archive: link_id + created_at (kanıt panel)
CREATE INDEX IF NOT EXISTS idx_evidence_link_created
  ON evidence_archive(link_id, created_at DESC);

-- evidence_archive: node_id (node üzerinden ağa erişim)
CREATE INDEX IF NOT EXISTS idx_evidence_node
  ON evidence_archive(node_id);

-- investigations: network + created_at (feed listeleme)
CREATE INDEX IF NOT EXISTS idx_investigations_network_created
  ON investigations(network_id, created_at DESC);

-- investigation_steps: investigation_id + step_order (replay)
CREATE INDEX IF NOT EXISTS idx_inv_steps_order
  ON investigation_steps(investigation_id, step_order ASC);

-- ─────────────────────────────────────────────────────────────
-- 3.2 TIER 2 — YÜKSEK ÖNCELİK (Sık sorgulanan)
-- ─────────────────────────────────────────────────────────────

-- user_badges: fingerprint + network (badge lookup)
CREATE INDEX IF NOT EXISTS idx_user_badges_fp_network
  ON user_badges(user_fingerprint, network_id);

-- badge_nominations: nominee + status (nomination kuyruğu)
CREATE INDEX IF NOT EXISTS idx_nominations_nominee_status
  ON badge_nominations(nominee_fingerprint, status);

-- reputation_transactions: user + created_at (itibar geçmişi)
CREATE INDEX IF NOT EXISTS idx_reputation_user_created
  ON reputation_transactions(user_fingerprint, created_at DESC);

-- proposed_links: nodes + status (hayalet ip filtreleme)
CREATE INDEX IF NOT EXISTS idx_proposed_source_target_status
  ON proposed_links(source_id, target_id, status);

-- documents: network + scan_status (belge arşiv paneli)
CREATE INDEX IF NOT EXISTS idx_documents_network_status
  ON documents(network_id, scan_status);

-- documents: source_type (kaynak bazlı filtreleme)
CREATE INDEX IF NOT EXISTS idx_documents_source_type
  ON documents(source_type);

-- document_derived_items: document + status
CREATE INDEX IF NOT EXISTS idx_derived_doc_status
  ON document_derived_items(document_id, status);

-- ─────────────────────────────────────────────────────────────
-- 3.3 TIER 3 — ORTA ÖNCELİK (Destekleyici sorgular)
-- ─────────────────────────────────────────────────────────────

-- data_quarantine: verification_status (karantina kuyruğu)
CREATE INDEX IF NOT EXISTS idx_quarantine_status
  ON data_quarantine(verification_status);

-- data_quarantine: network_id + verification_status
CREATE INDEX IF NOT EXISTS idx_quarantine_network_status
  ON data_quarantine(network_id, verification_status);

-- investigation_tasks: network + status (görev kuyruğu)
CREATE INDEX IF NOT EXISTS idx_inv_tasks_network_status
  ON investigation_tasks(network_id, status);

-- task_assignments: user_fingerprint (profilim sayfası)
CREATE INDEX IF NOT EXISTS idx_task_assign_user
  ON task_assignments(user_fingerprint);

-- collective_dms: owner (benim kalkanlarım)
CREATE INDEX IF NOT EXISTS idx_collective_dms_owner
  ON collective_dms(owner_fingerprint);

-- dead_man_switches: user (DMS paneli)
CREATE INDEX IF NOT EXISTS idx_dms_user
  ON dead_man_switches(user_id);

-- cross_references: source + target networks
CREATE INDEX IF NOT EXISTS idx_crossref_networks
  ON cross_references(source_network_id, target_network_id);

-- node_verifications: node_id
CREATE INDEX IF NOT EXISTS idx_node_verifications_node
  ON node_verifications(node_id);

-- link_evidence_timeline: link_id + date
CREATE INDEX IF NOT EXISTS idx_let_link_date
  ON link_evidence_timeline(link_id, event_date);

-- proposed_link_evidence: proposed_link_id
CREATE INDEX IF NOT EXISTS idx_pl_evidence_link
  ON proposed_link_evidence(proposed_link_id);

-- proposed_link_votes: proposed_link_id
CREATE INDEX IF NOT EXISTS idx_pl_votes_link
  ON proposed_link_votes(proposed_link_id);

-- transparency_log: network_id + created_at (şeffaflık paneli)
CREATE INDEX IF NOT EXISTS idx_transparency_network_created
  ON transparency_log(network_id, created_at DESC);

-- disputes: network_id + status
CREATE INDEX IF NOT EXISTS idx_disputes_network_status
  ON disputes(network_id, status);


-- ═══════════════════════════════════════════════════════════════
-- BÖLÜM 4: DOĞRULAMA (Eklenen constraint'leri kontrol et)
-- ═══════════════════════════════════════════════════════════════

-- FK constraint sayısını kontrol et
SELECT
  tc.table_name,
  tc.constraint_name,
  tc.constraint_type,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu
  ON tc.constraint_name = kcu.constraint_name
LEFT JOIN information_schema.constraint_column_usage ccu
  ON tc.constraint_name = ccu.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_schema = 'public'
ORDER BY tc.table_name, tc.constraint_name;

-- Index sayısını kontrol et
SELECT
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE schemaname = 'public'
ORDER BY tablename, indexname;


-- ═══════════════════════════════════════════════════════════════
-- NOTLAR VE KARARLAR
-- ═══════════════════════════════════════════════════════════════
--
-- FK EKLENMEYENLER (bilinçli karar):
--
-- 1. data_provenance — Append-only denetim izi. entity_id UUID kontekst referans,
--    FK eklemek silme işlemlerini engelleyebilir. Uygulama seviyesinde kontrol.
--
-- 2. transparency_log — Append-only şeffaflık kaydı. Aynı gerekçe.
--    network_id referansı var ama silme durumunda log kaybolmamalı.
--
-- 3. fingerprint alanları (20+ tablo) — TEXT tipi, kullanıcı henüz anonim
--    (fingerprint hash). Auth geçişi tamamlanınca truth_users tablosuna FK eklenecek.
--
-- 4. collective_dms.network_id — TEXT tipi (bug). UUID'ye çevirmek data migration
--    gerektirir. Ayrı bir migration olarak planlandı.
--
-- 5. proposed_links.source_id/target_id — TEXT tipi (node name olarak kullanılıyor,
--    UUID değil). API seviyesinde doğrulama yapılıyor.
--
-- ON DELETE STRATEJİSİ:
--   CASCADE: Child kayıt parent olmadan anlamsız (steps, votes, shards, reviews)
--   SET NULL: Child kayıt bağımsız değerli (investigations, reputation, documents)
--   NO ACTION: Audit log, provenance (asla silinmemeli)
--
-- ═══════════════════════════════════════════════════════════════
