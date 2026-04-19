#!/usr/bin/env bash
# -----------------------------------------------------------------------
# setup-initial-user.sh
#
# Seeds an initial patient, user, and user_role into a fresh local
# Supabase database.  Run this once after `supabase start`.
#
# Usage:
#   bash scripts/setup-initial-user.sh
#   bash scripts/setup-initial-user.sh --email john@example.com \
#       --name "John Doe" --role coordinator \
#       --patient "Jane Smith" --patient-dob 1940-03-15
# -----------------------------------------------------------------------

set -euo pipefail

# ---------- defaults (overridden by flags) ----------
EMAIL=""
FULL_NAME=""
ROLE="coordinator"         # coordinator | caregiver | gov_coordinator
PATIENT_NAME=""
PATIENT_DOB=""             # optional, YYYY-MM-DD

# ---------- parse flags ----------
while [[ $# -gt 0 ]]; do
  case "$1" in
    --email)         EMAIL="$2";        shift 2 ;;
    --name)          FULL_NAME="$2";    shift 2 ;;
    --role)          ROLE="$2";         shift 2 ;;
    --patient)       PATIENT_NAME="$2"; shift 2 ;;
    --patient-dob)   PATIENT_DOB="$2";  shift 2 ;;
    *) echo "Unknown flag: $1"; exit 1 ;;
  esac
done

# ---------- interactive prompts for anything not provided ----------
if [[ -z "$EMAIL" ]]; then
  read -rp "User email: " EMAIL
fi
if [[ -z "$FULL_NAME" ]]; then
  read -rp "User full name: " FULL_NAME
fi
if [[ -z "$ROLE" ]] || [[ "$ROLE" == "coordinator" ]]; then
  read -rp "Role [coordinator/caregiver/gov_coordinator] (default: coordinator): " ROLE_INPUT
  ROLE="${ROLE_INPUT:-coordinator}"
fi
if [[ -z "$PATIENT_NAME" ]]; then
  read -rp "Patient full name: " PATIENT_NAME
fi
if [[ -z "$PATIENT_DOB" ]]; then
  read -rp "Patient date of birth (YYYY-MM-DD, optional — press Enter to skip): " PATIENT_DOB
fi

# ---------- validate role ----------
case "$ROLE" in
  coordinator|caregiver|gov_coordinator) ;;
  *) echo "Error: role must be coordinator, caregiver, or gov_coordinator"; exit 1 ;;
esac

# ---------- build SQL ----------
DOB_SQL="null"
if [[ -n "$PATIENT_DOB" ]]; then
  DOB_SQL="'$PATIENT_DOB'"
fi

SQL=$(cat <<SQL
do \$\$
declare
  v_user_id   uuid;
  v_patient_id uuid;
begin

  -- 1. Create the auth user (generates a real auth.users UUID)
  v_user_id := (
    select id from auth.users where email = '$EMAIL'
  );

  if v_user_id is null then
    insert into auth.users (
      id, instance_id, aud, role, email,
      encrypted_password, email_confirmed_at,
      created_at, updated_at,
      raw_app_meta_data, raw_user_meta_data,
      confirmation_token, recovery_token,
      email_change_token_new, email_change
    )
    values (
      gen_random_uuid(),
      '00000000-0000-0000-0000-000000000000',
      'authenticated',
      'authenticated',
      '$EMAIL',
      '',                          -- no password — magic link only
      now(),                       -- mark email as confirmed
      now(), now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      jsonb_build_object('full_name', '$FULL_NAME'),
      '', '', '', ''
    )
    returning id into v_user_id;

    raise notice 'Created auth user % with id %', '$EMAIL', v_user_id;
  else
    raise notice 'Auth user % already exists with id %', '$EMAIL', v_user_id;
  end if;

  -- 2. Upsert public.users profile
  insert into public.users (id, full_name, email)
  values (v_user_id, '$FULL_NAME', '$EMAIL')
  on conflict (id) do update
    set full_name = excluded.full_name,
        email     = excluded.email;

  -- 3. Create patient (skip if name already exists)
  select id into v_patient_id
  from public.patients
  where full_name = '$PATIENT_NAME'
  limit 1;

  if v_patient_id is null then
    insert into public.patients (full_name, dob)
    values ('$PATIENT_NAME', $DOB_SQL)
    returning id into v_patient_id;

    raise notice 'Created patient % with id %', '$PATIENT_NAME', v_patient_id;
  else
    raise notice 'Patient % already exists with id %', '$PATIENT_NAME', v_patient_id;
  end if;

  -- 4. Assign role (upsert so re-running is safe)
  insert into public.user_roles (user_id, patient_id, role)
  values (v_user_id, v_patient_id, '$ROLE')
  on conflict (user_id, patient_id) do update
    set role = excluded.role;

  raise notice 'Done. % → % as %', '$EMAIL', '$PATIENT_NAME', '$ROLE';
end;
\$\$;
SQL
)

echo ""
echo "Running setup against local Supabase..."
echo ""

# Write SQL to a temp file and run via the supabase CLI
TMP=$(mktemp /tmp/caretrack-seed-XXXXXX.sql)
trap 'rm -f "$TMP"' EXIT
echo "$SQL" > "$TMP"
supabase db query --local -f "$TMP" --output table

echo ""
echo "Setup complete."
echo ""
echo "Sign in at http://localhost:5173 using the magic link sent to:"
echo "  $EMAIL  →  http://localhost:54324  (Mailpit)"
