---
free: true
title: "Escape </script><img src=x onerror=window.__pwned=1>"
layout: form
form:
  turnstile: false
  title: "Form </script><script>window.__pwned=2</script>"
  thanks: "Thanks <img src=x onerror=window.__pwned=3>"
  fields:
    - name: answer
      type: text
      required: true
      label: "Label </script><script>window.__pwned=4</script>"
      hint: "Hint <img src=x onerror=window.__pwned=5>"
    - name: pick
      type: bool
      group: "Group <b onmouseover=window.__pwned=6>bold</b>"
      label: "Option <img src=x onerror=window.__pwned=7>"
---

Labels that look like markup must show as text.
