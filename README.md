# trip2g form template

A [trip2g](https://github.com/trip2g/trip2g) layout that turns a note with a
`form:` in its frontmatter into a survey page: the note's text as the intro,
then the questions, then a thank-you screen. Made for internal company
surveys: a staff member signs in with the site's usual button, and their
answer is stored under their account.

It is one HTML file with inline JavaScript. There is no build step and nothing
else to upload.

## Install

In the root of your trip2g vault:

```bash
mkdir -p _layouts
curl -fsSL -o _layouts/form.html https://raw.githubusercontent.com/trip2g/form_template/main/form.html
```

Sync the vault (the obsidian-sync plugin uploads `_layouts/*.html`), then add
`layout: form` to the frontmatter of a note that has a `form:`. To update, run
the same `curl` again.

## Example

[`example/survey.md`](example/survey.md) is a complete survey. Its
frontmatter:

```yaml
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
```

The body of the note, below the frontmatter, is shown above the questions.

`turnstile: false` turns the captcha off. Do that only for a survey that sits
behind sign-in; on a page open to everyone, leave Turnstile on.

## What each field renders as

| Field in the frontmatter | Rendered as |
|---|---|
| `type: text` with `enum: [...]` | Radio buttons, one per value |
| `type: text` with `max_length` over 200 | A multi-line text area |
| any other `type: text` | A one-line text input |
| `type: int` with `min` and `max` at most 10 apart | A row of buttons: `1 2 3 4 5`, `0 … 10` |
| `type: int` with `enum: [...]` | A row of buttons, one per value |
| any other `type: int` | A number input |
| `type: bool` | A checkbox |
| `type: bool` with `enum: [true]` | A checkbox that must be ticked: a consent |
| several `type: bool` with the same `group:` | One question with a checkbox per field: "pick several" |
| `type: email` | An email input |
| `type: file` | A disabled input: not supported |

A field with `required: true` gets a red `*`.

### Keys only this template reads

trip2g ignores these keys; the template uses them for display. Everything that
decides whether an answer is accepted stays in trip2g's own keys.

| Key | Where | What it does | Without it |
|---|---|---|---|
| `label` | a field | The question text | The field's `name` |
| `hint` | a field | A smaller line under the question | Nothing |
| `group` | a `bool` field | Fields with the same `group` text are shown together as one question, and that text is the question | Each checkbox stands alone |
| `title` | a form | A heading above the form, useful when a note has several | No heading |
| `thanks` | a form | The text of the thank-you screen | "Your answer has been recorded." |

With `success_url` set, the browser goes to that address instead of showing the
thank-you screen.

The buttons and messages are in English, or in Russian when the note's
language is Russian. Colours follow the site's light or dark theme.

### Errors

trip2g checks every answer. When it refuses one, the template shows the reason
under the question it concerns ("Please answer this question.", "Too short: at
least 3 characters.") and scrolls to it.

### Several forms and shared forms

`forms:` with several named forms shows each in its own box, ordered by the
form's key, A to Z. Give each one a `title`.

`form_ref:` works when it names the shared note by its URL:

```yaml
form_ref: /templates/team-survey
form_ref: "[[/templates/team-survey]]"
```

The labels come from the shared note too.

## Limitations

These come from trip2g, not from the template.

- **One person can answer more than once.** Nothing stops a second submission,
  from a guest or from a signed-in user.
- **There is no results page.** Answers are visible only in the admin panel
  (Forms) or through the admin API, `admin { formSubmits }` at
  `/_system/graphql`. A signed-in person's answer carries their account (`user`
  in `formSubmits`); a guest's carries only the IP address.
- **`can_submit` doesn't restrict a survey to staff.** Its values are `guest`
  (anyone, the default) and `admin` (site admins only). To let only signed-in
  staff answer, put the note, without `free: true`, in a subgraph that requires
  sign-in: a guest then can't open the page or submit to it.
- **`type: file` and `can_submit: paid_user` aren't supported.** A file field
  can't be filled in, and a `paid_user` form refuses every answer.
- **One error at a time.** trip2g stops at the first question it refuses, so a
  form with three unanswered questions points at them one by one.
- **`required: true` doesn't make a checkbox mandatory.** An unticked checkbox
  is still an answer (`false`). Use `enum: [true]` for a box that must be ticked.
- **Editing the note closes pages opened before the edit.** Their answers are
  refused, and the template asks to reload the page.
- **`form_ref` must be a URL.** A path (`templates/team-survey.md`) or a link
  without the leading slash (`[[templates/team-survey]]`) shows no form:
  trip2g couldn't find the form when the answer is sent.

## How it works

The layout prints the site's standard header, styles and footer
(`defaultTemplate.Styles()`, `UserSpaceScripts()`, `Header()`, `Footer()`), so
the sign-in button is where it is on every other page. It puts two JSON blocks
in the page: the form definition from `note.FormSpecJSON()`, and the labels,
hints and groups read from the frontmatter with `note.M()`, each value printed
through `json()`. The script builds the form from them and sends answers with
the `submitForm` mutation to `/_system/graphql`, with the visitor's session
cookie. When trip2g answers `TurnstileRequiredPayload`, the script loads
Cloudflare's Turnstile widget, waits for it, and sends the answers again.

## License

MIT, see [LICENSE](LICENSE).
