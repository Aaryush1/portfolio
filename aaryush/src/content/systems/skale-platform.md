---
title: Career platform
company: skale
order: 1
summary: AI interviews tailored to the job you want, feedback after every one, and a skills model that recommends jobs and aims the next interview at where you need the most help.
diagram: skale
caption: Every interview sharpens the profile, and the person.
legend:
  - { kind: flow, label: Flow }
  - { kind: human, label: The candidate }
  - { kind: feedback, label: "Next interview, tailored" }
facts:
  - { label: Job data, value: "Perplexity, structured from a job link" }
  - { label: Voice loop, value: "Speech to text → OpenRouter → text to speech, under 500ms a turn" }
  - { label: Profile, value: "Skills and preference embeddings" }
  - { label: Model, value: White-label & enterprise hiring }
draft: true
---
Hiring runs on resumes: a flat, low-resolution signal of what someone can actually do.

The platform started with an AI interview, a quick five minutes or a full thirty. A job link went through Perplexity and came back as structured requirements; without one, an industry or nothing at all was enough. The interview itself ran as a voice loop, speech to text into a model on OpenRouter and back out as speech, in under 500 milliseconds a turn, and every answer reshaped the next question. Each interview was scored on core competencies plus categories generated for that conversation, and the results became specific, actionable feedback and an embedded profile of the person's skills and preferences.

That model recommended jobs and aimed the next interview at the weak spots. The more someone used it, the sharper their profile got, and the better they got.
