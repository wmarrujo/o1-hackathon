# CareSync
### Coordinated care for the people who matter most

---

<!-- .slide: data-background="#1a1a2e" -->

## The Problem

When a loved one can no longer care for themselves —

**everyone should pitch in.** <!-- .element: class="fragment" -->

**But coordination breaks down fast.** <!-- .element: class="fragment" -->

---

<!-- .slide: data-background="#0d3349" -->

## Sound familiar?

- Has grandma taken her meds today? <!-- .element: class="fragment" -->
- Who's doing laundry? Has anyone moved her? <!-- .element: class="fragment" -->
- Did the aide know she doesn't eat that? <!-- .element: class="fragment" -->
- What programs are available — and how do we apply? <!-- .element: class="fragment" -->

---

<!-- .slide: data-background="#16213e" -->

## The Gap We Fill

<div style="display:flex; gap:3rem; justify-content:center; align-items:flex-start; margin-top:1.5rem; font-size:0.85em">

<div style="flex:1; background:#e9456022; border-radius:12px; padding:1.2rem">

**Caregivers**  
Visit the home, perform tasks —  
but aren't always trained,  
may have language barriers,  
don't always know what's needed

</div> <!-- .element: class="fragment" -->

<div style="font-size:2rem; padding-top:2rem">⟷</div> <!-- .element: class="fragment" -->

<div style="flex:1; background:#0f346022; border-radius:12px; padding:1.2rem">

**Coordinators**  
Organize care, track records —  
but lose information,  
duplicate effort, and burn out

</div> <!-- .element: class="fragment" -->

</div>

---

## Meet Our Users

----

<!-- .slide: data-background="#1e3a1e" -->

### Dianne's Story

An elderly parent with **multiple coordinators** —  
notes in different apps, missed medications,  
no single source of truth.

> *"I thought someone else had checked on her."*

----

<!-- .slide: data-background="#1e1e3a" -->

### Melissa's Story

A younger person with a medical condition.  
Family as the main coordinator, plus aides who  
**speak a different language** and aren't sure what to do.

> *"The aide didn't know about her dietary restrictions."*

---

<!-- .slide: data-auto-animate data-background="#0d0d0d" -->

## Who We Serve

<div style="margin-top:1.5rem; font-size:0.9em">

**25M+** unpaid family caregivers in the US

</div>

---

<!-- .slide: data-auto-animate data-background="#0d0d0d" -->

## Who We Serve

<div style="margin-top:1.5rem; font-size:0.9em">

**25M+** unpaid family caregivers in the US

**$600B+** in unpaid care annually — demand is only growing

**1 in 5** Americans will be over 65 by 2030

</div>

---

<!-- .slide: data-auto-animate data-background="#0d0d0d" -->

## Who We Serve

<div style="margin-top:1.5rem; font-size:0.9em">

**25M+** unpaid family caregivers in the US

**$600B+** in unpaid care annually — demand is only growing

**1 in 5** Americans will be over 65 by 2030

Millions more are poorer families who **can't afford** professional coordination — they need tools, not subscriptions to enterprise software.

</div>

---

<!-- .slide: data-background="#1a1a2e" -->

## What We Built

----

### Shared Task List

Everyone sees the same tasks.  
Everyone can update them.  
Nothing falls through the cracks.

----

### Caregiver Guidance

Step-by-step instructions tailored to the patient.  
**Language-aware.** **Culturally aware.**  
The aide knows exactly what to do.

----

### Unstructured Check-ins

A caregiver can just say:

> *"I tended to her earlier, left laundry in the dryer — tell the next person to take it out."*

AI parses it into structured tasks and notes. <!-- .element: class="fragment" -->

----

### AI Resource Summaries

Coordinators shouldn't have to navigate the medical system alone.

Local programs, government benefits, supply sources —  
**surfaced automatically** based on the patient's profile.

----

### Coordinator Dashboard

AI summaries of everything logged.  
Outlier detection when routines break.  
At a glance: is everything okay?

---

<!-- .slide: data-background="#0a3d0a" -->

## vs. The Competition

| | Caring Village | ianacare | **CareSync** |
|---|---|---|---|
| Task list | ✓ | ✓ | ✓ |
| Scheduling | ✓ | ✓ | ✓ |
| Caregiver guidance | — | — | **✓** |
| Language support | — | — | **✓** |
| AI resource lookup | — | — | **✓** |
| Unstructured input | — | — | **✓** |

---

<!-- .slide: data-background="#16213e" -->

## Tech Stack

<div style="display:flex; gap:2rem; justify-content:center; margin-top:1.5rem; font-size:0.85em">

<div style="flex:1; background:#ffffff11; border-radius:12px; padding:1rem">
**Frontend**  
SvelteKit  
Accessible, fast, mobile-first
</div>

<div style="flex:1; background:#ffffff11; border-radius:12px; padding:1rem">
**Backend**  
Supabase  
Auth, realtime DB, row-level security
</div>

<div style="flex:1; background:#ffffff11; border-radius:12px; padding:1rem">
**Infra**  
DigitalOcean  
Autoscaling, load-tested, observable
</div>

</div>

<div style="margin-top:1.5rem; font-size:0.8em; color:#aaa">
AI: Claude API · Agentic safety: hallucination guards, prompt injection prevention, no PII leakage
</div>

---

<!-- .slide: data-background="#1a0a0a" -->

## Business Model

- **Subscriptions** — coordinator tier, caregiver tier <!-- .element: class="fragment" -->
- **Affiliate partnerships** — medical supply vendors, local services <!-- .element: class="fragment" -->
- **Government & institutional contracts** — care coordination programs <!-- .element: class="fragment" -->
- **Anonymized aggregate data** — research partnerships (opt-in) <!-- .element: class="fragment" -->

---

<!-- .slide: data-transition="zoom" data-background="#0a3d0a" -->

## Our Priority: Accessibility

> The medical system is overwhelming.  
> Our app is not.

Caregivers are guided. Coordinators are informed.  
Language, culture, and training gaps — **closed.**

---

<!-- .slide: data-transition="zoom" data-background="#1a1a2e" -->

# CareSync

**Stop information loss.**  
**Reduce caregiver burden.**  
**Give your loved one the care they deserve.**

Note:
Ask the audience: "Who here has or has had a loved one who needed care?"
"How easy was it to navigate the medical system?"
"Who actually coordinated everything?"
