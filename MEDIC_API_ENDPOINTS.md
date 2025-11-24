# Medic API Endpoints - Requirements

## Data Access Needs

### Athlete Data
- **Get athlete profile and medical info** (via QR code scan or athlete ID)
  - Basic profile: name, DOB, membership number, photo, gym
  - Emergency contact info
  - Medical info: allergies, pre-existing conditions, blood type
  - Current suspension status (if any)

- **Get athlete medical history**
  - List of all medical entries/logs for an athlete
  - Entry details: timestamp, medic who logged it, type of entry, notes

### Medical Entries
- **Add new medical entry** for an athlete
  - Types: pre-fight check, injury assessment, medical clearance, suspension
  - Include notes/details about the check/injury
  - Auto-log medic ID and timestamp

- **Edit medical entry** (maybe time-limited, like within 24hrs of creation)

### Suspensions
- **Create medical suspension** for an athlete
  - Set suspension duration (days)
  - Record reason and notes
  - Auto-log medic who suspended them

- **Clear/lift suspension early** (medical clearance)

- **View active suspensions** (list of all athletes currently suspended)

### QR Code
- **Validate QR code** when scanned
  - Return athlete ID and basic info
  - Indicate if athlete is suspended

## Current Frontend QR Code Implementation

**QR Code Data:**
- Contains URL: `https://etc/medical/{profileId}`
- `{profileId}` = athlete's `profileId` field from API (same field in ProfileResponse)

**Example:**
- Athlete profileId: `abc123`
- QR code contains: `https://etc/medical/abc123`

**How to link on backend:**
- Extract `profileId` from scanned QR code
- Use `profileId` to fetch athlete's profile, PII data, medical history, suspension status, etc.
