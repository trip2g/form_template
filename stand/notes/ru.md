---
free: true
title: Опрос на русском
lang: ru
layout: form
form:
  turnstile: false
  fields:
    - name: mood
      type: int
      required: true
      min: 1
      max: 5
      label: Как настроение?
    - name: mail
      type: email
      required: true
      label: Почта
    - name: about
      type: text
      min_length: 5
      label: О себе
---

Анкета на русском языке.
