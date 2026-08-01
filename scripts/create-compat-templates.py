#!/usr/bin/env python3
"""
Create 4 BioCycle compatibility invite card templates via the Twilio Content API
and submit each for WhatsApp UTILITY approval.

Usage:
  TWILIO_ACCOUNT_SID=ACxxx TWILIO_AUTH_TOKEN=xxx python3 scripts/create-compat-templates.py

Output: one HX... SID per template. Paste those into send-whatsapp.js.
"""

import os, sys, json
from urllib.request import urlopen, Request
from urllib.parse import urlencode
from urllib.error import HTTPError
from base64 import b64encode

# ── Credentials ──────────────────────────────────────────────────────────────
ACCOUNT_SID = os.environ.get('TWILIO_ACCOUNT_SID', '')
AUTH_TOKEN  = os.environ.get('TWILIO_AUTH_TOKEN',  '')

if not ACCOUNT_SID or not AUTH_TOKEN:
    sys.exit(
        'ERROR: Set TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN before running.\n'
        'Example:\n'
        '  TWILIO_ACCOUNT_SID=ACxxx TWILIO_AUTH_TOKEN=xxx python3 scripts/create-compat-templates.py'
    )

AUTH_HEADER = 'Basic ' + b64encode(f'{ACCOUNT_SID}:{AUTH_TOKEN}'.encode()).decode()
BASE        = 'https://content.twilio.com/v1/Content'

# ── Template body (twilio/card uses "title" for WhatsApp body text) ──────────
BODY_TEXT = (
    'Hola {{1}}, {{2}} quiere sincronizar tu calendario contigo en BioCycle. '
    'Más información en tu perfil: https://app.biocycle.app'
)

# Sample variables sent with the approval request so WhatsApp can review
# rendered copy. Must be concrete values (no placeholder text).
SAMPLE_VARS = {'1': 'María', '2': 'Carlos'}

# 3 quick-reply buttons — all same type (QUICK_REPLY) per WhatsApp requirement.
# Titles ≤ 20 chars: "Rechazar y bloquear" = 19 chars ✓
BUTTONS = [
    {'type': 'QUICK_REPLY', 'title': 'Aceptar',             'id': 'ACCEPT'},
    {'type': 'QUICK_REPLY', 'title': 'Rechazar',            'id': 'REJECT'},
    {'type': 'QUICK_REPLY', 'title': 'Rechazar y bloquear', 'id': 'REJECT_BLOCK'},
]

# ── 4 templates: (friendly_name, media_url, compat_type) ─────────────────────
TEMPLATES = [
    ('biocycle_compat_invite_intimidad',   'https://biocycle.app/templates/intimidad_conexion_v3.png',    'intimacy'),
    ('biocycle_compat_invite_intelectual', 'https://biocycle.app/templates/sincornia_intelectual_v3.png', 'cognitive'),
    ('biocycle_compat_invite_rendimiento', 'https://biocycle.app/templates/sincornia_rendimiento_v3.png', 'performance'),
    ('biocycle_compat_invite_buenavibra',  'https://biocycle.app/templates/buena_vibra_v3.png',           'vibe'),
]

# ── Helpers ───────────────────────────────────────────────────────────────────
def post_json(url, payload_dict):
    data = json.dumps(payload_dict).encode()
    req  = Request(url, data=data, headers={
        'Authorization': AUTH_HEADER,
        'Content-Type':  'application/json',
    })
    with urlopen(req) as resp:
        return json.load(resp)

def post_form(url, fields):
    data = urlencode(fields).encode()
    req  = Request(url, data=data, headers={
        'Authorization': AUTH_HEADER,
        'Content-Type':  'application/x-www-form-urlencoded',
    })
    with urlopen(req) as resp:
        return json.load(resp)

# ── Main ──────────────────────────────────────────────────────────────────────
print('BioCycle — creating 4 compatibility invite card templates\n')

results = []  # list of (compat_type, friendly_name, sid, approval_status)

for friendly_name, media_url, compat_type in TEMPLATES:
    print(f'[{compat_type}] Creating "{friendly_name}" ...')

    # Step 1: Create the content template
    create_body = {
        'friendly_name': friendly_name,
        'language':      'es',
        'variables':     SAMPLE_VARS,
        'types': {
            'twilio/card': {
                'title':   BODY_TEXT,
                'media':   [media_url],
                'actions': BUTTONS,
            }
        }
    }

    try:
        data = post_json(BASE, create_body)
        sid  = data['sid']
        print(f'  ✓ Created  SID: {sid}')
    except HTTPError as e:
        err = e.read().decode()
        print(f'  ✗ Create FAILED ({e.code}): {err}')
        results.append((compat_type, friendly_name, 'ERROR', 'n/a'))
        print()
        continue

    # Step 2: Submit for WhatsApp approval with category UTILITY
    approval_url = f'{BASE}/{sid}/ApprovalRequests/whatsapp'
    try:
        adata  = post_form(approval_url, {'category': 'UTILITY'})
        status = adata.get('status', json.dumps(adata))
        print(f'  ✓ Approval submitted — status: {status}')
        results.append((compat_type, friendly_name, sid, status))
    except HTTPError as e:
        err = e.read().decode()
        print(f'  ✗ Approval FAILED ({e.code}): {err}')
        results.append((compat_type, friendly_name, sid, f'approval_failed({e.code})'))

    print()

# ── Summary ───────────────────────────────────────────────────────────────────
print('═' * 62)
print('RESULTS — wire these into send-whatsapp.js')
print('═' * 62)
for compat_type, friendly_name, sid, status in results:
    print(f'  {compat_type:<12}  {sid}  (approval: {status})')

print()
print('Paste the mapping into the compatibility_invite action in')
print('netlify/functions/send-whatsapp.js as INVITE_TEMPLATE_SIDS.')
