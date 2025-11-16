-- Migration: Extract Data from JSON Blobs to Normalized Tables
-- Purpose: Migrate existing data from campaign_states and ads.setup_snapshot
-- Date: 2025-01-16
-- References:
--  - Supabase: https://supabase.com/docs/guides/database/json
--  - Backend Refactoring Plan V2

-- ============================================================================
-- PHASE 2: DATA MIGRATION FROM JSON BLOBS
-- ============================================================================

DO $$
DECLARE
  v_ad_record RECORD;
  v_creative_record RECORD;
  v_copy_record RECORD;
  v_location_record RECORD;
  v_creative_id UUID;
  v_copy_id UUID;
  v_migration_count INT := 0;
BEGIN
  RAISE NOTICE 'Starting data migration from JSON blobs...';

  -- ============================================================================
  -- MIGRATE AD CREATIVES FROM ads.setup_snapshot.creative
  -- ============================================================================
  RAISE NOTICE 'Migrating creative data...';
  
  FOR v_ad_record IN 
    SELECT 
      id,
      setup_snapshot->'creative' as creative_json
    FROM ads
    WHERE setup_snapshot IS NOT NULL
      AND setup_snapshot->'creative' IS NOT NULL
  LOOP
    -- Migrate base/selected creative image
    IF v_ad_record.creative_json->>'imageUrl' IS NOT NULL THEN
      INSERT INTO ad_creatives (
        ad_id,
        creative_format,
        image_url,
        creative_style,
        is_base_image,
        sort_order
      ) VALUES (
        v_ad_record.id,
        'feed', -- Default to feed format
        v_ad_record.creative_json->>'imageUrl',
        NULL,
        true,
        0
      )
      ON CONFLICT (ad_id, creative_format, sort_order) DO NOTHING
      RETURNING id INTO v_creative_id;
      
      -- Set this as selected creative
      UPDATE ads SET selected_creative_id = v_creative_id WHERE id = v_ad_record.id;
    END IF;
    
    -- Migrate creative variations if they exist
    IF v_ad_record.creative_json->'imageVariations' IS NOT NULL THEN
      FOR v_creative_record IN
        SELECT 
          value as image_url,
          (row_number() OVER ()) - 1 as idx
        FROM jsonb_array_elements_text(v_ad_record.creative_json->'imageVariations')
      LOOP
        -- Skip if this is the base image (already inserted)
        IF v_creative_record.image_url != COALESCE(v_ad_record.creative_json->>'imageUrl', '') THEN
          INSERT INTO ad_creatives (
            ad_id,
            creative_format,
            image_url,
            creative_style,
            is_base_image,
            sort_order,
            variation_label
          ) VALUES (
            v_ad_record.id,
            'feed',
            v_creative_record.image_url,
            NULL,
            false,
            v_creative_record.idx,
            'Variation ' || (v_creative_record.idx + 1)
          )
          ON CONFLICT (ad_id, creative_format, sort_order) DO NOTHING;
        END IF;
      END LOOP;
    END IF;
    
    v_migration_count := v_migration_count + 1;
  END LOOP;
  
  RAISE NOTICE 'Migrated creative data for % ads', v_migration_count;
  v_migration_count := 0;

  -- ============================================================================
  -- MIGRATE AD COPY FROM ads.setup_snapshot.copy
  -- ============================================================================
  RAISE NOTICE 'Migrating copy data...';
  
  FOR v_ad_record IN 
    SELECT 
      id,
      setup_snapshot->'copy' as copy_json
    FROM ads
    WHERE setup_snapshot IS NOT NULL
      AND setup_snapshot->'copy' IS NOT NULL
  LOOP
    -- Get selected copy index
    DECLARE
      v_selected_idx INT := COALESCE((v_ad_record.copy_json->>'selectedCopyIndex')::INT, 0);
    BEGIN
      -- Migrate copy variations
      IF v_ad_record.copy_json->'variations' IS NOT NULL THEN
        FOR v_copy_record IN
          SELECT 
            value as copy_data,
            (row_number() OVER ()) - 1 as idx
          FROM jsonb_array_elements(v_ad_record.copy_json->'variations')
        LOOP
          INSERT INTO ad_copy_variations (
            ad_id,
            headline,
            primary_text,
            description,
            cta_text,
            overlay_headline,
            overlay_offer,
            overlay_body,
            overlay_density,
            is_selected,
            sort_order
          ) VALUES (
            v_ad_record.id,
            COALESCE(v_copy_record.copy_data->>'headline', ''),
            COALESCE(v_copy_record.copy_data->>'primaryText', v_copy_record.copy_data->>'body', ''),
            v_copy_record.copy_data->>'description',
            COALESCE(v_copy_record.copy_data->>'cta', 'Learn More'),
            v_copy_record.copy_data->'overlay'->>'headline',
            v_copy_record.copy_data->'overlay'->>'offer',
            v_copy_record.copy_data->'overlay'->>'body',
            v_copy_record.copy_data->'overlay'->>'density',
            v_copy_record.idx = v_selected_idx,
            v_copy_record.idx
          )
          ON CONFLICT (ad_id, sort_order) DO NOTHING
          RETURNING id INTO v_copy_id;
          
          -- Set selected copy ID
          IF v_copy_record.idx = v_selected_idx THEN
            UPDATE ads SET selected_copy_id = v_copy_id WHERE id = v_ad_record.id;
          END IF;
        END LOOP;
      END IF;
    END;
    
    v_migration_count := v_migration_count + 1;
  END LOOP;
  
  RAISE NOTICE 'Migrated copy data for % ads', v_migration_count;
  v_migration_count := 0;

  -- ============================================================================
  -- MIGRATE LOCATIONS FROM ads.setup_snapshot.location
  -- ============================================================================
  RAISE NOTICE 'Migrating location data...';
  
  FOR v_ad_record IN 
    SELECT 
      id,
      setup_snapshot->'location' as location_json
    FROM ads
    WHERE setup_snapshot IS NOT NULL
      AND setup_snapshot->'location' IS NOT NULL
      AND setup_snapshot->'location'->'locations' IS NOT NULL
  LOOP
    -- Migrate location entries
    FOR v_location_record IN
      SELECT value as loc_data
      FROM jsonb_array_elements(v_ad_record.location_json->'locations')
    LOOP
      INSERT INTO ad_target_locations (
        ad_id,
        location_name,
        location_type,
        latitude,
        longitude,
        radius_km,
        inclusion_mode,
        meta_location_key
      ) VALUES (
        v_ad_record.id,
        COALESCE(v_location_record.loc_data->>'name', 'Unknown Location'),
        COALESCE(v_location_record.loc_data->>'type', 'city'),
        (v_location_record.loc_data->'coordinates'->>0)::NUMERIC,
        (v_location_record.loc_data->'coordinates'->>1)::NUMERIC,
        (v_location_record.loc_data->>'radius')::NUMERIC,
        COALESCE(v_location_record.loc_data->>'mode', 'include'),
        v_location_record.loc_data->>'id'
      )
      ON CONFLICT DO NOTHING;
      
      v_migration_count := v_migration_count + 1;
    END LOOP;
  END LOOP;
  
  RAISE NOTICE 'Migrated % location records', v_migration_count;
  v_migration_count := 0;

  -- ============================================================================
  -- MIGRATE DESTINATIONS FROM ads.setup_snapshot.destination
  -- ============================================================================
  RAISE NOTICE 'Migrating destination data...';
  
  FOR v_ad_record IN 
    SELECT 
      id,
      setup_snapshot->'destination' as dest_json
    FROM ads
    WHERE setup_snapshot IS NOT NULL
      AND setup_snapshot->'destination' IS NOT NULL
      AND setup_snapshot->'destination'->>'type' IS NOT NULL
  LOOP
    DECLARE
      v_dest_type TEXT := v_ad_record.dest_json->>'type';
    BEGIN
      IF v_dest_type = 'instant_form' THEN
        -- Instant form destination
        INSERT INTO ad_destinations (
          ad_id,
          destination_type,
          instant_form_id
        )
        SELECT
          v_ad_record.id,
          'instant_form',
          NULL -- Will need to create instant_forms first from form data
        WHERE NOT EXISTS (SELECT 1 FROM ad_destinations WHERE ad_id = v_ad_record.id);
        
      ELSIF v_dest_type = 'website_url' THEN
        -- Website URL destination
        INSERT INTO ad_destinations (
          ad_id,
          destination_type,
          website_url,
          display_link
        ) VALUES (
          v_ad_record.id,
          'website_url',
          v_ad_record.dest_json->'data'->>'websiteUrl',
          v_ad_record.dest_json->'data'->>'displayLink'
        )
        ON CONFLICT (ad_id) DO NOTHING;
        
      ELSIF v_dest_type = 'phone_number' THEN
        -- Phone number destination
        INSERT INTO ad_destinations (
          ad_id,
          destination_type,
          phone_number,
          phone_formatted
        ) VALUES (
          v_ad_record.id,
          'phone_number',
          v_ad_record.dest_json->'data'->>'phoneNumber',
          v_ad_record.dest_json->'data'->>'phoneFormatted'
        )
        ON CONFLICT (ad_id) DO NOTHING;
      END IF;
      
      v_migration_count := v_migration_count + 1;
    END;
  END LOOP;
  
  RAISE NOTICE 'Migrated destination data for % ads', v_migration_count;
  v_migration_count := 0;

  -- ============================================================================
  -- MIGRATE BUDGET FROM ads.setup_snapshot.budget + campaign_states.budget_data
  -- ============================================================================
  RAISE NOTICE 'Migrating budget data...';
  
  -- First, migrate campaign-level budget to campaigns table
  UPDATE campaigns c
  SET campaign_budget_cents = (
    SELECT (cs.budget_data->>'dailyBudget')::NUMERIC * 100
    FROM campaign_states cs
    WHERE cs.campaign_id = c.id
      AND cs.budget_data IS NOT NULL
      AND cs.budget_data->>'dailyBudget' IS NOT NULL
  )
  WHERE EXISTS (
    SELECT 1 FROM campaign_states cs
    WHERE cs.campaign_id = c.id
      AND cs.budget_data IS NOT NULL
      AND cs.budget_data->>'dailyBudget' IS NOT NULL
  );
  
  -- Then migrate per-ad budgets from setup_snapshot
  FOR v_ad_record IN 
    SELECT 
      id,
      setup_snapshot->'budget' as budget_json
    FROM ads
    WHERE setup_snapshot IS NOT NULL
      AND setup_snapshot->'budget' IS NOT NULL
      AND setup_snapshot->'budget'->>'dailyBudget' IS NOT NULL
  LOOP
    INSERT INTO ad_budgets (
      ad_id,
      daily_budget_cents,
      currency_code,
      timezone
    ) VALUES (
      v_ad_record.id,
      (v_ad_record.budget_json->>'dailyBudget')::NUMERIC * 100,
      COALESCE(v_ad_record.budget_json->>'currency', 'USD'),
      COALESCE(v_ad_record.budget_json->>'timezone', 'America/New_York')
    )
    ON CONFLICT (ad_id) DO NOTHING;
    
    v_migration_count := v_migration_count + 1;
  END LOOP;
  
  RAISE NOTICE 'Migrated budget data for % ads', v_migration_count;

  -- ============================================================================
  -- SUMMARY
  -- ============================================================================
  RAISE NOTICE '';
  RAISE NOTICE '=============================================================';
  RAISE NOTICE 'Data migration completed successfully!';
  RAISE NOTICE '=============================================================';
  RAISE NOTICE 'Summary:';
  RAISE NOTICE '  - Migrated creative data (images + variations)';
  RAISE NOTICE '  - Migrated copy data (headlines + variations)';
  RAISE NOTICE '  - Migrated location targeting';
  RAISE NOTICE '  - Migrated destination configurations';
  RAISE NOTICE '  - Migrated budget allocations';
  RAISE NOTICE '';
  RAISE NOTICE 'Next step: Verify data integrity and drop old tables';
END $$;

