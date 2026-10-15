---
title: Engineering loop
company: ready-rebound
order: 1
summary: An engineer hands it a ticket; it runs the full engineering process, from implementation and review passes to a documentation tree it keeps current, the PR, and QA in a real browser, pulling a person in only for decisions, specs and architecture.
outcome: Two people now ship what four did
diagram: loop
caption: A ticket runs the whole process; a person is pulled back in only where judgment matters.
legend:
  - { kind: human, label: A person }
  - { kind: dashed, label: Builds from the docs }
  - { kind: feedback, label: Back to a person }
facts:
  - { label: Input, value: A ticket from an engineer }
  - { label: A person, value: "Decisions, specs, architecture" }
  - { label: Output, value: "A reviewed PR, QA-tested in a real browser" }
  - { label: Result, value: Two people ship what four did }
draft: false
---
An engineer hands the loop a ticket. From there it runs the full engineering process: implementation and review passes, a documentation tree it keeps current and builds from, the pull request, and QA in a real browser.

A person is pulled in only where judgment matters: decisions, specs and architecture. Two people now ship what four did, and for smaller features that don't need architecture work, non-technical teammates open their own PRs.
