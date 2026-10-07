---
free: true
title: Redirect after submit
layout: form
form:
  turnstile: false
  success_url: /thanks
  fields:
    - name: note
      type: text
      required: true
      label: Anything to add?
---

After a successful submit the browser goes to the thanks page.
