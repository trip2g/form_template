---
free: true
title: Two forms on one note
layout: form
forms:
  beta:
    turnstile: false
    title: Second form
    thanks: Beta received.
    fields:
      - name: rating
        type: int
        required: true
        enum: [1, 2, 3]
        label: Beta rating
  alpha:
    turnstile: false
    title: First form
    thanks: Alpha received.
    fields:
      - name: name
        type: text
        required: true
        label: Alpha name
---

Two named forms. Each has its own box and its own thank-you screen.
