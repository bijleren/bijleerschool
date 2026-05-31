/*
  # Revoke anon EXECUTE from SECURITY DEFINER functions

  Anonymous (unauthenticated) users should not be able to call privileged
  SECURITY DEFINER functions. Revoke EXECUTE from the anon role for all
  functions that don't need public access.

  Functions that legitimately need anon access are kept:
  - lookup_student_by_access_hash: needed for student QR/hash login flow
  - current_student_id: used in anon RLS policies
  - increment_qr_views: intentionally public for QR scan counting

  All others have EXECUTE revoked from anon.
*/

-- Auth / admin helpers
REVOKE EXECUTE ON FUNCTION public.is_admin(text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.is_current_user_admin() FROM anon;
REVOKE EXECUTE ON FUNCTION public.is_super_admin() FROM anon;
REVOKE EXECUTE ON FUNCTION public.is_school_admin(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.is_school_admin(uuid, uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.is_school_member(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.is_board_expired(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.manage_admin_status(uuid, boolean) FROM anon;

-- School / org management
REVOKE EXECUTE ON FUNCTION public.join_school_by_code(text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.join_organization_with_code(text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.generate_unique_school_code() FROM anon;
REVOKE EXECUTE ON FUNCTION public.generate_school_code() FROM anon;
REVOKE EXECUTE ON FUNCTION public.ensure_school_code() FROM anon;
REVOKE EXECUTE ON FUNCTION public.generate_organization_code(uuid, timestamptz, integer, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.add_student_to_organization(uuid, uuid) FROM anon;

-- Student code generators (trigger-only, not callable via REST)
REVOKE EXECUTE ON FUNCTION public.generate_student_code() FROM anon;
REVOKE EXECUTE ON FUNCTION public.generate_access_hash() FROM anon;
REVOKE EXECUTE ON FUNCTION public.auto_generate_student_code() FROM anon;
REVOKE EXECUTE ON FUNCTION public.set_student_access_hash() FROM anon;
REVOKE EXECUTE ON FUNCTION public.ensure_single_default_student_role() FROM anon;
REVOKE EXECUTE ON FUNCTION public.archive_student_on_deactivate() FROM anon;
REVOKE EXECUTE ON FUNCTION public.claim_student_with_code(text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.claim_child_with_code(text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.create_user_student_relation() FROM anon;

-- Behavior
REVOKE EXECUTE ON FUNCTION public.increment_behavior_card(uuid, uuid, integer) FROM anon;
REVOKE EXECUTE ON FUNCTION public.decrement_behavior_card(uuid, uuid, integer) FROM anon;
REVOKE EXECUTE ON FUNCTION public.reorder_severity_levels(jsonb) FROM anon;
REVOKE EXECUTE ON FUNCTION public.reorder_severity_levels(uuid, jsonb) FROM anon;

-- Storage / school storage
REVOKE EXECUTE ON FUNCTION public.update_school_storage_usage(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_storage_breakdown(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_school_total_storage(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.update_school_storage(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.calculate_qr_storage_bytes(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.trigger_update_qr_storage() FROM anon;
REVOKE EXECUTE ON FUNCTION public.trigger_update_school_storage_on_qr_change() FROM anon;
REVOKE EXECUTE ON FUNCTION public.user_has_paper_qr_codes(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.user_is_school_member_for_folder(uuid) FROM anon;

-- Activity boards
REVOKE EXECUTE ON FUNCTION public.deactivate_expired_boards() FROM anon;
REVOKE EXECUTE ON FUNCTION public.auto_activate_scheduled_hoekenwerk() FROM anon;
REVOKE EXECUTE ON FUNCTION public.auto_expire_hoekenwerk_boards() FROM anon;

-- Goal progress (trigger functions)
REVOKE EXECUTE ON FUNCTION public.update_goal_progress_from_material_session() FROM anon;
REVOKE EXECUTE ON FUNCTION public.update_goal_progress_from_video_session() FROM anon;
REVOKE EXECUTE ON FUNCTION public.update_group_goal_progress() FROM anon;

-- License / billing
REVOKE EXECUTE ON FUNCTION public.get_organization_licenses(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.cancel_license(uuid, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.check_license_access(uuid, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.extend_license_from_purchase(uuid, text, integer, text, numeric, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_expiring_licenses(integer) FROM anon;
REVOKE EXECUTE ON FUNCTION public.add_data_package_to_user(uuid, bigint) FROM anon;
REVOKE EXECUTE ON FUNCTION public.redeem_voucher_code(text, uuid, uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.redeem_credit_code(text, uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.generate_credit_code(integer) FROM anon;
REVOKE EXECUTE ON FUNCTION public.generate_voucher_code() FROM anon;
REVOKE EXECUTE ON FUNCTION public.generate_invite_code() FROM anon;
REVOKE EXECUTE ON FUNCTION public.deduct_credits() FROM anon;
REVOKE EXECUTE ON FUNCTION public.refund_credits() FROM anon;
REVOKE EXECUTE ON FUNCTION public.validate_credits() FROM anon;
REVOKE EXECUTE ON FUNCTION public.refresh_key_stats() FROM anon;

-- Sticker / QR orders
REVOKE EXECUTE ON FUNCTION public.calculate_order_total(integer, text, uuid, uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.calculate_content_size(jsonb, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.connect_sticker_sheet(text, uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.create_sticker_order(integer, text, uuid, uuid, jsonb) FROM anon;
REVOKE EXECUTE ON FUNCTION public.can_insert_content_owned(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.can_insert_content_paper(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.can_insert_content_school_team(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.can_insert_content_school_public(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.validate_content() FROM anon;
REVOKE EXECUTE ON FUNCTION public.validate_qr_content() FROM anon;
REVOKE EXECUTE ON FUNCTION public.disconnect_from_shared_student(uuid) FROM anon;

-- Invite processing
REVOKE EXECUTE ON FUNCTION public.process_invite_purchase() FROM anon;
REVOKE EXECUTE ON FUNCTION public.process_invite_signup() FROM anon;
REVOKE EXECUTE ON FUNCTION public.generate_organization_code(uuid, timestamptz, integer, text) FROM anon;

-- Tag / user management triggers
REVOKE EXECUTE ON FUNCTION public.log_student_tag_change() FROM anon;
REVOKE EXECUTE ON FUNCTION public.link_child_shares_on_email_match() FROM anon;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon;
REVOKE EXECUTE ON FUNCTION public.sync_premium_school_flag() FROM anon;
REVOKE EXECUTE ON FUNCTION public.sync_user_schools_to_teammembers() FROM anon;
REVOKE EXECUTE ON FUNCTION public.sync_teammembers_to_user_schools() FROM anon;

-- Book functions
REVOKE EXECUTE ON FUNCTION public.get_books_by_popularity(uuid, text, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_books_by_recent_activity(uuid, text, text) FROM anon;

-- Word / vocabulary (platform-specific, not needed by anon)
REVOKE EXECUTE ON FUNCTION public.get_word_student_streak(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_klankgroepen_words_by_length(boolean, integer, integer) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_shortest_pending_words(integer) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_words_without_image(text, text) FROM anon;
