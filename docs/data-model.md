# Data Model

> Auto-generated from `supabase/migrations/`. Run `node scripts/gen-data-model-docs.js` to update.

## Enums

- **user_role**: `coordinator`, `caregiver`, `gov_coordinator`
- **event_type**: `shift`, `appointment`, `medication`, `other`
- **ics_status**: `TENTATIVE`, `CONFIRMED`, `CANCELLED`
- **checklist_category**: `medication`, `appointment`, `reminder`, `general`
- **treatment_type**: `medication`, `therapy`, `procedure`, `lifestyle`, `other`
- **trend_status**: `stable`, `improving`, `worsening`, `critical`
- **check_in_type**: `start_of_shift`, `end_of_shift`, `remote`

## Tables

### `users`

App-level user profiles, linked to Supabase auth.

| Column | Type | Req | Notes |
|--------|------|:---:|-------|
| `id` | `uuid` |  | FK |
| `full_name` | `text` | ✓ |  |
| `email` | `text` | ✓ |  |
| `preferred_language` | `text` | ✓ |  |
| `created_at` | `timestamptz` | ✓ |  |

### `patients`

People receiving care. Access is controlled via user_roles.

| Column | Type | Req | Notes |
|--------|------|:---:|-------|
| `id` | `uuid` |  |  |
| `full_name` | `text` | ✓ |  |
| `dob` | `date` |  |  |
| `emergency_contact` | `text` |  |  |
| `family_contact` | `text` |  |  |
| `notes` | `text` |  |  |
| `created_at` | `timestamptz` | ✓ |  |

### `user_roles`

Assigns a role to a user for a specific patient. This is the RLS access key.

| Column | Type | Req | Notes |
|--------|------|:---:|-------|
| `id` | `uuid` |  |  |
| `user_id` | `uuid` | ✓ | FK |
| `patient_id` | `uuid` | ✓ | FK |
| `role` | `enum(coordinator | caregiver | gov_coordinator)` | ✓ |  |
| `created_at` | `timestamptz` | ✓ |  |

### `schedule_events`

Shifts, appointments, and recurring events. ICS fields allow calendar export/import.

| Column | Type | Req | Notes |
|--------|------|:---:|-------|
| `id` | `uuid` |  |  |
| `patient_id` | `uuid` | ✓ | FK |
| `assigned_user_id` | `uuid` |  | FK |
| `ics_uid` | `text` | ✓ |  |
| `title` | `text` | ✓ |  |
| `event_type` | `enum(shift | appointment | medication | other)` | ✓ |  |
| `dtstart` | `timestamptz` | ✓ |  |
| `dtend` | `timestamptz` | ✓ |  |
| `rrule` | `text` |  | e.g. FREQ=WEEKLY;BYDAY=MO,WE |
| `status` | `enum(TENTATIVE | CONFIRMED | CANCELLED)` | ✓ |  |
| `medication` | `text` |  |  |
| `additional_notes` | `text` |  |  |
| `created_at` | `timestamptz` | ✓ |  |

### `checklist_items`

Task items within a scheduled event. Caregivers tick these done during a shift.

| Column | Type | Req | Notes |
|--------|------|:---:|-------|
| `id` | `uuid` |  |  |
| `event_id` | `uuid` | ✓ | FK |
| `completed_by` | `uuid` |  | FK |
| `description` | `text` | ✓ |  |
| `category` | `enum(medication | appointment | reminder | general)` | ✓ |  |
| `done` | `boolean` | ✓ |  |
| `completed_at` | `timestamptz` |  |  |
| `created_at` | `timestamptz` | ✓ |  |

### `health_conditions`

Medical conditions for a patient. AI summary is generated asynchronously.

| Column | Type | Req | Notes |
|--------|------|:---:|-------|
| `id` | `uuid` |  |  |
| `patient_id` | `uuid` | ✓ | FK |
| `name` | `text` | ✓ |  |
| `description` | `text` |  |  |
| `ai_summary` | `text` |  | AI-generated, refreshed by Edge Function |
| `diagnosed_at` | `timestamptz` |  |  |
| `created_at` | `timestamptz` | ✓ |  |

### `treatments`

Treatment options for a condition, including research links and grants.

| Column | Type | Req | Notes |
|--------|------|:---:|-------|
| `id` | `uuid` |  |  |
| `condition_id` | `uuid` | ✓ | FK |
| `name` | `text` | ✓ |  |
| `type` | `enum(medication | therapy | procedure | lifestyle | other)` | ✓ |  |
| `description` | `text` |  |  |
| `research_report_url` | `text` |  |  |
| `grant_info` | `text` |  |  |
| `support_group_url` | `text` |  |  |
| `created_at` | `timestamptz` | ✓ |  |

### `condition_metrics`

Time-series biometric readings logged by caregivers.

| Column | Type | Req | Notes |
|--------|------|:---:|-------|
| `id` | `uuid` |  |  |
| `condition_id` | `uuid` | ✓ | FK |
| `recorded_by` | `uuid` |  | FK |
| `metric_name` | `text` | ✓ | e.g. 'blood_pressure_systolic' |
| `value` | `numeric` | ✓ |  |
| `unit` | `text` | ✓ | e.g. 'mmHg', 'bpm', 'kg' |
| `trend_status` | `enum(stable | improving | worsening | critical)` | ✓ |  |
| `recorded_at` | `timestamptz` | ✓ |  |

### `health_documents`

Health-related files stored in Supabase Storage.

| Column | Type | Req | Notes |
|--------|------|:---:|-------|
| `id` | `uuid` |  |  |
| `patient_id` | `uuid` | ✓ | FK |
| `uploaded_by` | `uuid` |  | FK |
| `file_name` | `text` | ✓ |  |
| `file_url` | `text` | ✓ | Supabase Storage URL |
| `document_type` | `text` |  |  |
| `uploaded_at` | `timestamptz` | ✓ |  |

### `chores`

Reusable chore templates assigned to a patient. rrule drives recurrence.

| Column | Type | Req | Notes |
|--------|------|:---:|-------|
| `id` | `uuid` |  |  |
| `patient_id` | `uuid` | ✓ | FK |
| `title` | `text` | ✓ |  |
| `description` | `text` |  |  |
| `video_url` | `text` |  |  |
| `criteria` | `text` |  |  |
| `rrule` | `text` |  | e.g. FREQ=DAILY for daily chores |
| `created_at` | `timestamptz` | ✓ |  |

### `chore_completions`

Log of each time a caregiver completed a chore.

| Column | Type | Req | Notes |
|--------|------|:---:|-------|
| `id` | `uuid` |  |  |
| `chore_id` | `uuid` | ✓ | FK |
| `completed_by` | `uuid` |  | FK |
| `notes` | `text` |  |  |
| `completed_at` | `timestamptz` | ✓ |  |

### `check_ins`

Shift check-ins submitted by caregivers. AI fields populated by Edge Function post-insert.

| Column | Type | Req | Notes |
|--------|------|:---:|-------|
| `id` | `uuid` |  |  |
| `patient_id` | `uuid` | ✓ | FK |
| `user_id` | `uuid` |  | FK |
| `check_in_type` | `enum(start_of_shift | end_of_shift | remote)` | ✓ |  |
| `has_moved_today` | `boolean` |  |  |
| `health_status_note` | `text` |  |  |
| `ai_summary` | `text` |  | AI-generated end-of-shift summary |
| `ai_missed_items` | `text` |  | AI-detected items not completed |
| `ai_future_issues` | `text` |  | AI-predicted upcoming concerns |
| `created_at` | `timestamptz` | ✓ |  |

### `tasks`

| Column | Type | Req | Notes |
|--------|------|:---:|-------|
| `id` | `uuid` |  |  |
| `patient_id` | `uuid` | ✓ | FK |
| `description` | `text` | ✓ |  |
| `start_time` | `timestamptz` |  |  |
| `due_time` | `timestamptz` |  |  |
| `assignee_id` | `uuid` |  | FK |
| `location` | `text` |  |  |
| `repeat` | `text` |  |  |
| `complete` | `boolean` | ✓ |  |
| `completed_at` | `timestamptz` |  |  |
| `completed_by` | `uuid` |  | FK |
| `created_at` | `timestamptz` | ✓ |  |
| `created_by` | `uuid` |  | FK |

### `notes`

| Column | Type | Req | Notes |
|--------|------|:---:|-------|
| `id` | `uuid` |  |  |
| `patient_id` | `uuid` | ✓ | FK |
| `task_id` | `uuid` |  | FK |
| `author_id` | `uuid` | ✓ | FK |
| `content` | `text` | ✓ |  |
| `created_at` | `timestamptz` | ✓ |  |
| `edited_on` | `timestamptz` |  |  |
