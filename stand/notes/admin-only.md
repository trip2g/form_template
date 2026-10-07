---
free: true
title: Admins only
layout: form
form:
  turnstile: false
  can_submit: admin
  fields:
    - name: decision
      type: text
      required: true
      label: Admin decision
---

Only a site admin can submit this form.
