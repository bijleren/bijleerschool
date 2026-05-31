/*
  # Revoke PUBLIC execute on SECURITY DEFINER functions, grant back selectively

  The previous revoke migrations targeted `anon` and `authenticated` directly, but
  these roles inherit EXECUTE from the `PUBLIC` role (PostgreSQL default). Revoking
  from `PUBLIC` is required to actually block access.

  Strategy:
  1. REVOKE EXECUTE ON FUNCTION ... FROM PUBLIC — removes access for everyone
  2. GRANT EXECUTE back only to roles that legitimately need the function

  Functions kept accessible to authenticated users (app functionality):
  - is_current_user_admin, is_school_admin, is_school_member, is_super_admin — RLS helpers
  - is_board_expired — used by app
  - increment_behavior_card, decrement_behavior_card — teacher app
  - reorder_severity_levels (both overloads) — school admin feature
  - get_books_by_popularity, get_books_by_recent_activity — library feature
  - get_storage_breakdown, update_school_storage_usage — storage dashboard
  - join_school_by_code — school joining flow
  - join_organization_with_code — org joining flow
  - claim_student_with_code, claim_child_with_code — student linking flow
  - connect_sticker_sheet, create_sticker_order — sticker ordering
  - calculate_order_total, calculate_content_size — order/content helpers
  - can_insert_content_* — RLS helper functions for QR content
  - check_license_access, get_organization_licenses — license checks
  - cancel_license, extend_license_from_purchase — license management
  - redeem_credit_code, redeem_voucher_code — redemption flows
  - generate_invite_code, process_invite_signup, process_invite_purchase — invite system
  - disconnect_from_shared_student — parent/student management
  - user_has_paper_qr_codes, user_is_school_member_for_folder — QR folder checks
  - validate_content, validate_qr_content — content validation
  - bump_daily_progress — woordenschat daily tracking
  - get_klankgroepen_words_by_length — woordenschat feature
  - lookup_coupon_by_code — coupon lookup
  - lookup_student_by_access_hash — anon student QR access (keep anon too)
  - increment_qr_views — anon QR scan tracking (keep anon too)
  - current_student_id — anon student JWT helper (keep anon too)

  Functions restricted to service_role / postgres only (internal/admin):
  - _rls_audit, add_data_package_to_user, add_student_to_organization
  - auto_activate_scheduled_hoekenwerk, auto_expire_hoekenwerk_boards
  - deactivate_expired_boards, generate_credit_code, generate_organization_code
  - generate_student_code, generate_voucher_code, get_expiring_licenses
  - handle_new_user, link_child_shares_on_email_match, log_student_tag_change
  - create_user_student_relation, manage_admin_status, refresh_key_stats
  - sync_teammembers_to_user_schools, sync_user_schools_to_teammembers
  - trg_bump_daily_phonemes, trg_bump_daily_text_chars, trg_bump_daily_words
  - trg_derive_text_chars, update_goal_progress_from_material_session
  - update_goal_progress_from_video_session, update_group_goal_progress
  - is_admin (legacy helper), generate_invite_code (also revoke anon)
  - process_invite_signup, process_invite_purchase (revoke anon)
*/

-- ============================================================
-- Internal/trigger/admin-only: revoke from PUBLIC entirely
-- ============================================================
REVOKE EXECUTE ON FUNCTION public._rls_audit() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.add_data_package_to_user(uuid, bigint) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.add_student_to_organization(uuid, uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.auto_activate_scheduled_hoekenwerk() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.auto_expire_hoekenwerk_boards() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.deactivate_expired_boards() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.generate_credit_code(integer) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.generate_organization_code(uuid, timestamptz, integer, text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.generate_student_code() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.generate_voucher_code() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_expiring_licenses(integer) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.link_child_shares_on_email_match() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.log_student_tag_change() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.create_user_student_relation() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.manage_admin_status(uuid, boolean) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.refresh_key_stats() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.sync_teammembers_to_user_schools() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.sync_user_schools_to_teammembers() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.trg_bump_daily_phonemes() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.trg_bump_daily_text_chars() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.trg_bump_daily_words() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.trg_derive_text_chars() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.update_goal_progress_from_material_session() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.update_goal_progress_from_video_session() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.update_group_goal_progress() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.is_admin(text) FROM PUBLIC;

-- ============================================================
-- Functions needed by authenticated users only: revoke PUBLIC, grant authenticated
-- ============================================================
REVOKE EXECUTE ON FUNCTION public.increment_behavior_card(uuid, uuid, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.increment_behavior_card(uuid, uuid, integer) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.decrement_behavior_card(uuid, uuid, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.decrement_behavior_card(uuid, uuid, integer) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.reorder_severity_levels(jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.reorder_severity_levels(jsonb) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.reorder_severity_levels(uuid, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.reorder_severity_levels(uuid, jsonb) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.get_books_by_popularity(uuid, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_books_by_popularity(uuid, text, text) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.get_books_by_recent_activity(uuid, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_books_by_recent_activity(uuid, text, text) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.get_storage_breakdown(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_storage_breakdown(uuid) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.update_school_storage_usage(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.update_school_storage_usage(uuid) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.join_school_by_code(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.join_school_by_code(text) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.join_organization_with_code(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.join_organization_with_code(text) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.claim_student_with_code(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.claim_student_with_code(text) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.claim_child_with_code(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.claim_child_with_code(text) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.connect_sticker_sheet(text, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.connect_sticker_sheet(text, uuid) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.create_sticker_order(integer, text, uuid, uuid, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_sticker_order(integer, text, uuid, uuid, jsonb) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.calculate_order_total(integer, text, uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.calculate_order_total(integer, text, uuid, uuid) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.calculate_content_size(jsonb, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.calculate_content_size(jsonb, text) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.can_insert_content_owned(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.can_insert_content_owned(uuid) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.can_insert_content_paper(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.can_insert_content_paper(uuid) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.can_insert_content_school_public(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.can_insert_content_school_public(uuid) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.can_insert_content_school_team(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.can_insert_content_school_team(uuid) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.check_license_access(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.check_license_access(uuid, text) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.get_organization_licenses(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_organization_licenses(uuid) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.cancel_license(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.cancel_license(uuid, text) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.extend_license_from_purchase(uuid, text, integer, text, numeric, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.extend_license_from_purchase(uuid, text, integer, text, numeric, text) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.redeem_credit_code(text, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.redeem_credit_code(text, uuid) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.redeem_voucher_code(text, uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.redeem_voucher_code(text, uuid, uuid) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.generate_invite_code() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.generate_invite_code() TO authenticated;

REVOKE EXECUTE ON FUNCTION public.process_invite_signup() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.process_invite_signup() TO authenticated;

REVOKE EXECUTE ON FUNCTION public.process_invite_purchase() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.process_invite_purchase() TO authenticated;

REVOKE EXECUTE ON FUNCTION public.disconnect_from_shared_student(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.disconnect_from_shared_student(uuid) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.user_has_paper_qr_codes(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.user_has_paper_qr_codes(uuid) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.user_is_school_member_for_folder(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.user_is_school_member_for_folder(uuid) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.validate_content() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.validate_content() TO authenticated;

REVOKE EXECUTE ON FUNCTION public.validate_qr_content() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.validate_qr_content() TO authenticated;

REVOKE EXECUTE ON FUNCTION public.bump_daily_progress(integer, integer, integer, date) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.bump_daily_progress(integer, integer, integer, date) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.get_klankgroepen_words_by_length(boolean, integer, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_klankgroepen_words_by_length(boolean, integer, integer) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.lookup_coupon_by_code(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.lookup_coupon_by_code(text) TO authenticated;

-- is_board_expired: used in app by authenticated users
REVOKE EXECUTE ON FUNCTION public.is_board_expired(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_board_expired(uuid) TO authenticated;

-- RLS helper functions: needed by authenticated for policy evaluation
-- These must also remain accessible to authenticated (they're called inside RLS policies)
REVOKE EXECUTE ON FUNCTION public.is_current_user_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_current_user_admin() TO authenticated;

REVOKE EXECUTE ON FUNCTION public.is_school_admin(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_school_admin(uuid) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.is_school_admin(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_school_admin(uuid, uuid) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.is_school_member(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_school_member(uuid) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.is_super_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_super_admin() TO authenticated;

-- ============================================================
-- Functions needed by anon (QR student access + public scanning):
-- keep anon access via explicit grant after revoking PUBLIC
-- ============================================================
REVOKE EXECUTE ON FUNCTION public.lookup_student_by_access_hash(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.lookup_student_by_access_hash(text) TO anon, authenticated;

REVOKE EXECUTE ON FUNCTION public.increment_qr_views(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.increment_qr_views(uuid) TO anon, authenticated;
