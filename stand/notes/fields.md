---
free: true
title: Every field type
layout: form
form:
  turnstile: false
  title: All the controls
  thanks: Fields form received.
  fields:
    - name: scale
      type: int
      required: true
      min: 1
      max: 5
      label: Scale question
      hint: 1 is low, 5 is high.
    - name: choice
      type: text
      required: true
      enum: [Red, Green, Blue]
      label: Single choice question
    - name: tool_a
      type: bool
      group: Checkbox group question
      label: Option A
    - name: tool_b
      type: bool
      group: Checkbox group question
      label: Option B
    - name: tool_c
      type: bool
      group: Checkbox group question
      label: Option C
    - name: story
      type: text
      required: true
      min_length: 10
      max_length: 2000
      label: Long text question
    - name: short
      type: text
      max_length: 50
      label: Short text question
    - name: email
      type: email
      required: true
      label: Email question
    - name: age
      type: int
      required: true
      min: 18
      max: 120
      label: Number question
    - name: newsletter
      type: bool
      required: true
      label: Required checkbox
    - name: consent
      type: bool
      enum: [true]
      label: Consent question
---

A note that uses every control the layout knows.
