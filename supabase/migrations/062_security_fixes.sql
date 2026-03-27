-- ROLLBACK:
-- ALTER FUNCTION public.get_my_role() RESET search_path;
-- ALTER FUNCTION public.is_active_user() RESET search_path;
-- ALTER FUNCTION public.get_my_member_status() RESET search_path;
-- ALTER FUNCTION public.can_manage_community(p_community_id uuid) RESET search_path;
-- ALTER FUNCTION public.get_my_collaborator_id() RESET search_path;
-- ALTER FUNCTION public.set_updated_at() RESET search_path;
-- DROP POLICY IF EXISTS assegnazioni_valutazione_update ON assegnazioni;
-- CREATE POLICY assegnazioni_valutazione_update ON assegnazioni FOR UPDATE TO authenticated USING (...) WITH CHECK (true);
-- DROP POLICY IF EXISTS app_errors_insert ON app_errors;
-- CREATE POLICY app_errors_insert ON app_errors FOR INSERT TO authenticated WITH CHECK (true);

-- SEC12: Fix mutable search_path on SECURITY DEFINER functions (Supabase Advisor)
ALTER FUNCTION public.get_my_role() SET search_path = public;
ALTER FUNCTION public.is_active_user() SET search_path = public;
ALTER FUNCTION public.get_my_member_status() SET search_path = public;
ALTER FUNCTION public.can_manage_community(p_community_id uuid) SET search_path = public;
ALTER FUNCTION public.get_my_collaborator_id() SET search_path = public;
ALTER FUNCTION public.set_updated_at() SET search_path = public;

-- SEC11: Fix assegnazioni_valutazione_update WITH CHECK (was always true)
-- Mirror USING clause in WITH CHECK to prevent updating rows outside city scope
DROP POLICY IF EXISTS assegnazioni_valutazione_update ON assegnazioni;
CREATE POLICY assegnazioni_valutazione_update ON assegnazioni
  FOR UPDATE
  TO authenticated
  USING (
    get_my_role() = 'responsabile_cittadino'
    AND lezione_id IN (
      SELECT l.id
      FROM lezioni l
      JOIN corsi c ON c.id = l.corso_id
      JOIN user_profiles up ON up.user_id = auth.uid()
      WHERE c.citta IS NOT NULL AND c.citta = up.citta_responsabile
    )
  )
  WITH CHECK (
    get_my_role() = 'responsabile_cittadino'
    AND lezione_id IN (
      SELECT l.id
      FROM lezioni l
      JOIN corsi c ON c.id = l.corso_id
      JOIN user_profiles up ON up.user_id = auth.uid()
      WHERE c.citta IS NOT NULL AND c.citta = up.citta_responsabile
    )
  );

-- SEC16: Fix app_errors INSERT policy (was WITH CHECK (true) — allows log flooding)
-- Scope to authenticated user's own records
DROP POLICY IF EXISTS app_errors_insert ON app_errors;
CREATE POLICY app_errors_insert ON app_errors
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());
