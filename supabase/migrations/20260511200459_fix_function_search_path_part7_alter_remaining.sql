/*
  # Fix mutable search_path on remaining functions via ALTER FUNCTION
  Uses exact signatures confirmed from pg_proc.
*/

ALTER FUNCTION public.get_organization_licenses(p_organization_id uuid) SET search_path = '';
ALTER FUNCTION public.cancel_license(p_license_id uuid, p_reason text) SET search_path = '';
ALTER FUNCTION public.join_organization_with_code(org_code text) SET search_path = '';
ALTER FUNCTION public.add_student_to_organization(p_student_id uuid, p_organization_id uuid) SET search_path = '';
ALTER FUNCTION public.get_words_without_image(search_word text, sort_type text) SET search_path = '';
ALTER FUNCTION public.update_video_moments_updated_at() SET search_path = '';
ALTER FUNCTION public.get_expiring_licenses(p_days_threshold integer) SET search_path = '';
ALTER FUNCTION public.update_storage_limit_from_license() SET search_path = '';
ALTER FUNCTION public.update_license_updated_at() SET search_path = '';
ALTER FUNCTION public.update_product_updated_at() SET search_path = '';
ALTER FUNCTION public.claim_student_with_code(claim_code text) SET search_path = '';
ALTER FUNCTION public.create_user_student_relation() SET search_path = '';
ALTER FUNCTION public.get_shortest_pending_words(limit_count integer) SET search_path = '';
ALTER FUNCTION public.get_klankgroepen_words_by_length(p_sort_ascending boolean, p_offset integer, p_limit integer) SET search_path = '';
ALTER FUNCTION public.calculate_text_statistics() SET search_path = '';
ALTER FUNCTION public.refresh_key_stats() SET search_path = '';
ALTER FUNCTION public.deduct_credits() SET search_path = '';
ALTER FUNCTION public.refund_credits() SET search_path = '';
ALTER FUNCTION public.check_license_access(p_organization_id uuid, p_product_type text) SET search_path = '';
ALTER FUNCTION public.redeem_voucher_code(p_code text, p_organization_id uuid, p_user_id uuid) SET search_path = '';
ALTER FUNCTION public.can_insert_content_owned(p_qr_code_id uuid) SET search_path = '';
ALTER FUNCTION public.can_insert_content_paper(p_qr_code_id uuid) SET search_path = '';
ALTER FUNCTION public.add_data_package_to_user(target_user_id uuid, package_storage_gb bigint) SET search_path = '';
ALTER FUNCTION public.calculate_content_size(content jsonb, content_type text) SET search_path = '';
ALTER FUNCTION public.calculate_order_total(p_quantity integer, p_print_option text, p_format_id uuid, p_data_plan_id uuid) SET search_path = '';
ALTER FUNCTION public.connect_sticker_sheet(p_sheet_id text, p_user_id uuid) SET search_path = '';
ALTER FUNCTION public.can_insert_content_school_team(p_qr_code_id uuid) SET search_path = '';
ALTER FUNCTION public.create_sticker_order(p_quantity integer, p_print_option text, p_format_id uuid, p_data_plan_id uuid, p_shipping_address jsonb) SET search_path = '';
ALTER FUNCTION public.manage_admin_status(target_user_id uuid, make_admin boolean) SET search_path = '';
ALTER FUNCTION public.disconnect_from_shared_student(target_student_id uuid) SET search_path = '';
ALTER FUNCTION public.can_insert_content_school_public(p_qr_code_id uuid) SET search_path = '';
ALTER FUNCTION public.extend_license_from_purchase(p_organization_id uuid, p_product_type text, p_duration_days integer, p_stripe_payment_intent_id text, p_amount_eur numeric, p_pricing_tier text) SET search_path = '';
ALTER FUNCTION public.process_invite_purchase() SET search_path = '';
ALTER FUNCTION public.process_invite_signup() SET search_path = '';
ALTER FUNCTION public.redeem_credit_code(code_to_redeem text, user_id_param uuid) SET search_path = '';
ALTER FUNCTION public.claim_child_with_code(claim_code text) SET search_path = '';
ALTER FUNCTION public.sync_user_schools_to_teammembers() SET search_path = '';
ALTER FUNCTION public.sync_teammembers_to_user_schools() SET search_path = '';
