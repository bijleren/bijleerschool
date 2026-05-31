/*
  # Revoke anon and authenticated EXECUTE on SECURITY DEFINER functions

  Prevents anonymous and authenticated users from calling privileged SECURITY DEFINER
  functions directly via the REST API (/rest/v1/rpc/...).

  Functions are grouped by category. Exceptions (kept accessible):
  - public.current_student_id() — needed for anon student JWT validation
  - public.lookup_student_by_access_hash() — needed for QR student login
  - public.increment_qr_views() — needed for public QR scan tracking
  - public.join_school_by_code() — needed for authenticated users to join schools
  - public.is_current_user_admin() / is_school_admin / is_school_member / is_super_admin — used in RLS policies
  - public.calculate_order_total / can_insert_content_* — called by authenticated app users
  - public.check_license_access / get_organization_licenses — called by authenticated app users
  - public.get_books_by_popularity / get_books_by_recent_activity — called by authenticated app users
  - public.get_storage_breakdown / update_school_storage_usage — called by authenticated app users
  - public.reorder_severity_levels — called by authenticated app users
  - public.increment_behavior_card / decrement_behavior_card — called by authenticated app users
  - public.redeem_voucher_code / redeem_credit_code / claim_student_with_code / claim_child_with_code — called by authenticated app users
  - public.join_organization_with_code — called by authenticated app users
  - public.connect_sticker_sheet / create_sticker_order — called by authenticated app users
  - public.generate_invite_code / process_invite_signup / process_invite_purchase — called by authenticated app users
  - public.disconnect_from_shared_student — called by authenticated app users
  - public.user_has_paper_qr_codes / user_is_school_member_for_folder — called by authenticated app users
  - public.validate_content / validate_qr_content — called by authenticated app users
  - public.cancel_license / extend_license_from_purchase — called by authenticated app users
  - public.bump_daily_progress — called by authenticated app users
  - public.lookup_coupon_by_code — called by authenticated users

  Revoked from BOTH anon and authenticated:
  - Admin-only and internal functions that should never be called by end users
*/

-- _rls_audit: internal audit helper, no end-user access needed
REVOKE EXECUTE ON FUNCTION public._rls_audit() FROM anon, authenticated;

-- generate_student_code: internal trigger helper
REVOKE EXECUTE ON FUNCTION public.generate_student_code() FROM anon;

-- generate_credit_code: admin-only
REVOKE EXECUTE ON FUNCTION public.generate_credit_code(integer) FROM anon, authenticated;

-- generate_invite_code: authenticated users may use; revoke anon only
REVOKE EXECUTE ON FUNCTION public.generate_invite_code() FROM anon;

-- generate_organization_code: admin-only
REVOKE EXECUTE ON FUNCTION public.generate_organization_code(uuid, timestamptz, integer, text) FROM anon, authenticated;

-- generate_voucher_code: admin-only
REVOKE EXECUTE ON FUNCTION public.generate_voucher_code() FROM anon, authenticated;

-- handle_new_user: auth trigger, not for direct calls
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, authenticated;

-- link_child_shares_on_email_match: auth trigger
REVOKE EXECUTE ON FUNCTION public.link_child_shares_on_email_match() FROM anon, authenticated;

-- log_student_tag_change: trigger function
REVOKE EXECUTE ON FUNCTION public.log_student_tag_change() FROM anon, authenticated;

-- create_user_student_relation: trigger function
REVOKE EXECUTE ON FUNCTION public.create_user_student_relation() FROM anon, authenticated;

-- manage_admin_status: super-admin only
REVOKE EXECUTE ON FUNCTION public.manage_admin_status(uuid, boolean) FROM anon, authenticated;

-- is_admin: internal helper (use is_current_user_admin instead)
REVOKE EXECUTE ON FUNCTION public.is_admin(text) FROM anon;

-- sync functions: internal trigger helpers
REVOKE EXECUTE ON FUNCTION public.sync_teammembers_to_user_schools() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.sync_user_schools_to_teammembers() FROM anon, authenticated;

-- add_data_package_to_user: admin-only
REVOKE EXECUTE ON FUNCTION public.add_data_package_to_user(uuid, bigint) FROM anon, authenticated;

-- add_student_to_organization: admin-only
REVOKE EXECUTE ON FUNCTION public.add_student_to_organization(uuid, uuid) FROM anon, authenticated;

-- auto_activate/expire hoekenwerk: scheduled job helpers, not for direct calls
REVOKE EXECUTE ON FUNCTION public.auto_activate_scheduled_hoekenwerk() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.auto_expire_hoekenwerk_boards() FROM anon, authenticated;

-- deactivate_expired_boards: scheduled job helper
REVOKE EXECUTE ON FUNCTION public.deactivate_expired_boards() FROM anon, authenticated;

-- is_board_expired: internal helper
REVOKE EXECUTE ON FUNCTION public.is_board_expired(uuid) FROM anon;

-- refresh_key_stats: admin/scheduled job
REVOKE EXECUTE ON FUNCTION public.refresh_key_stats() FROM anon, authenticated;

-- get_expiring_licenses: admin-only
REVOKE EXECUTE ON FUNCTION public.get_expiring_licenses(integer) FROM anon, authenticated;

-- get_klankgroepen_words_by_length: woordenschat internal
REVOKE EXECUTE ON FUNCTION public.get_klankgroepen_words_by_length(boolean, integer, integer) FROM anon;

-- calculate_content_size: internal helper
REVOKE EXECUTE ON FUNCTION public.calculate_content_size(jsonb, text) FROM anon;

-- update_goal_progress_from_material_session/video_session/group: trigger functions
REVOKE EXECUTE ON FUNCTION public.update_goal_progress_from_material_session() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_goal_progress_from_video_session() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_group_goal_progress() FROM anon, authenticated;

-- trg_bump_daily_* and trg_derive_text_chars: trigger functions
REVOKE EXECUTE ON FUNCTION public.trg_bump_daily_phonemes() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.trg_bump_daily_text_chars() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.trg_bump_daily_words() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.trg_derive_text_chars() FROM anon, authenticated;

-- bump_daily_progress: authenticated users only (revoke anon)
REVOKE EXECUTE ON FUNCTION public.bump_daily_progress(integer, integer, integer, date) FROM anon;

-- process_invite_purchase/signup: authenticated only (revoke anon)
REVOKE EXECUTE ON FUNCTION public.process_invite_purchase() FROM anon;
REVOKE EXECUTE ON FUNCTION public.process_invite_signup() FROM anon;
