---
title: Quarterly team survey
layout: form
form:
  turnstile: false
  thanks: Thanks! Results go to the leadership meeting on Friday.
  fields:
    - name: satisfaction
      type: int
      required: true
      min: 1
      max: 5
      label: How satisfied are you with your work this quarter?
      hint: 1 means not at all, 5 means very satisfied.
    - name: recommend
      type: int
      min: 0
      max: 10
      label: How likely are you to recommend us as an employer to a friend?
      hint: 0 means not at all likely, 10 means extremely likely.
    - name: workplace
      type: text
      required: true
      enum: [Office, Remote, Hybrid]
      label: Where do you mostly work from?
    - name: tool_chat
      type: bool
      group: Which tools slow you down?
      label: Chat
    - name: tool_tracker
      type: bool
      group: Which tools slow you down?
      label: Task tracker
    - name: tool_wiki
      type: bool
      group: Which tools slow you down?
      label: Wiki
    - name: tool_ci
      type: bool
      group: Which tools slow you down?
      label: Build and deploy
    - name: improve
      type: text
      max_length: 2000
      label: What one thing should we change next quarter?
      hint: Optional. A sentence or two is enough.
    - name: consent
      type: bool
      enum: [true]
      label: I understand my answers are stored with my account if I am signed in.
---

Five quick questions about the last three months. It takes about two minutes.

Answer as honestly as you can: the results are read by the leadership team only.
