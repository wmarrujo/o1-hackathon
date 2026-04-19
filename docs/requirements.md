# Business logic requirements for "Coordinaire" (name pending)

## Tech stack
 - **Frontend**: SvelteKit, Tailwind CSS, shadcn-svelte
 - **Backend**: Supabase — auth, realtime Postgres with row-level security, file Storage
 - **AI**: ElevenLabs - speech-to-text for caregiver dictation, end-of-shift summaries, DigitalOcean - agent for handling said dictation
 - **Deploy**: DigitalOcean

See @docs/data-model.md for the full schema (auto-generated from migrations).

## Types of users (not mutually exclusive):
 - Coordinators
    - People who are organizing care for a loved one
    - Keeping track of conditions, medical records, tasks that need to be done
    - Or just checking in to make sure they're doing alright
    - All coordinators are equal — no ownership hierarchy
 - Caregivers
    - Those that visit the loved one
    - Perform physical tasks and check in on the loved one
    - May not have a great understanding of English or the specifics of their tasks
    - Get a read-only curated view of patient health info (enough to do their job safely)

## Access & onboarding:
 - Coordinators invite caregivers by email or phone number
 - Caregivers accept via a link and create a standing account
 - Caregivers can see their full schedule and history across shifts

## High-level functional requirements:
 - Coordinators must be able to collaborate on a list of tasks and events
 - Coordinators must be able to assign those tasks and shifts for people to tend to the person
 - Coordinators must be able to receive reminders when things aren't getting done or care is needed
 - Caregivers must be able to view their schedule
 - Caregivers must be able to check in and view their tasks
 - Caregivers must be able to use smart dictation and translation support to tell the app what they've done and what else needs to be done

## Requirements by feature/place:

 - Checklist/task list (coordinator + caregiver)
   - Tasks are assigned to a specific caregiver
   - Done checkbox, completed_by, completed_at
   - Additional notes (via linked notes table)
   - Tasks can be one-time or recurring (daily/weekly/monthly)
   - In-person flag (boolean: requires physical visit vs. can be done remotely)
   - Note: the schema has two task-like concepts:
     - `tasks` — standalone tasks not tied to a specific shift (main task list)
     - `checklist_items` — items attached to a specific schedule_event (shift checklist)

 - Schedule (coordinator + caregiver)
   - One underlying data model, two views (list + calendar)
   - Shifts have a start time, end time, and are assigned to exactly one caregiver
   - Shifts (and other events) can recur via rrule (e.g. daily, weekly on specific days)
   - Event types: shift, appointment, medication, other
   - Metrics tracking (coordinator defines which metrics to track per patient; caregivers log values during check-in)

 - Health information (coordinator)
   - Emergency contacts
   - Care team directory (coordinators and caregivers on the account)
   - Patient info
   - List of conditions
   - Biometrics
   - Food intake log (caregivers record what was eaten; no meal planning)
   - Caregiver view: read-only, curated subset (e.g. dietary restrictions, relevant conditions, emergency contact)
   - Configurable per-field visibility is a v2 consideration

 - Remote check-in (coordinator)
   - Dashboard: coordinator can pull up current status at any time
   - Automated alerts when:
     - A task passes its due time without being checked off
     - A caregiver shift started but no check-in was logged
     - A medication reminder time passed without confirmation
   - v2: alert when no movement/activity has been logged in X hours

 - Physical check-in (caregiver)
   - Get summary of tasks for the shift
   - Dictate and/or type what you've done (speech-to-text + translation handled on backend)
   - After dictation, shows a confirmation of what it will check off
   - Unstructured input can check off existing tasks AND create new tasks or notes for coordinators to see

## Notifications:
 - Push notifications (for urgent alerts)
 - In-app notification history
 - Email/SMS are v2
