---
title: The Quiet Singularity
subtitle: Recursive Self-Improvement, Collapsing Costs, and the Feedback Loop No One Is Governing
date: 2026-02-15
summary: "An observational analysis of three concurrent developments in artificial intelligence — recursive model self-improvement, the commoditization of frontier-class inference, and the compounding automation of cognitive labor — and their implications for institutions designed around assumptions of scarcity."
kind: paper
pdf: /quiet-singularity.pdf
why: "I kept seeing one loop in three different headlines, and nobody was naming it."
breakdown:
  - { label: "The Shift", gist: "Systems now help build themselves" }
  - { label: "Recursive Self-Improvement", gist: "Labs say models build models" }
  - { label: "The Collapse of Cost", gist: "Frontier-class intelligence gets nearly free" }
  - { label: "The Implication", gist: "Judgment becomes the scarce thing" }
  - { label: "The Feedback Loop", gist: "Better tools build better tools" }
  - { label: "The Institutional Gap", gist: "Institutions built for scarcity" }
draft: false
---
## I. The Shift

<p>We are entering a different phase of artificial intelligence. Not better assistants. Not faster code generation. For the first time, we are observing systems that meaningfully participate in building the next generation of themselves &mdash; not in theory, not in research papers, but in production environments at the companies creating them.<sup>[1][2]</sup></p>

<p>The evidence for this is no longer speculative. It is publicly stated, on the record, by the leadership of the two most prominent frontier AI laboratories in the world. And it is occurring simultaneously with a collapse in the cost of intelligence that most observers have not yet internalized.</p>

<p>This document examines three developments that, taken together, suggest we have entered a compounding feedback loop &mdash; one that is accelerating faster than the institutional, policy, and cultural frameworks designed to govern it.</p>

## II. Recursive Self-Improvement

### A. OpenAI: GPT-5.3-Codex

<p>On February 5, 2026, OpenAI released GPT-5.3-Codex and made an extraordinary public claim: it was the first model in the company's history that was, in their words, "instrumental in creating itself."<sup>[1]</sup> The Codex engineering team used earlier versions of the model to debug its own training runs, manage its own deployment pipelines, and diagnose its own test results and evaluations.<sup>[2]</sup></p>

<p>OpenAI CEO Sam Altman described this publicly as "the beginning of the intelligence explosion."<sup>[3]</sup> The model's technical report confirmed it served as the primary engineer for its own final optimization phase and deployment pipeline.<sup>[4]</sup></p>

<p>This is not fully autonomous recursive self-improvement in the theoretical sense. But it is the first commercial proof point that AI-assisted AI development is no longer theoretical. If a coding model can meaningfully accelerate its own development, the pace of future improvements compounds.<sup>[2]</sup></p>

### B. Anthropic: Claude Writing Claude

<p>On February 3, 2026, Anthropic Chief Product Officer Mike Krieger stated at the Cisco AI Summit: "Right now for most products at Anthropic it's effectively 100% just Claude writing, and then what we've done is created all the right scaffolds around it to let us trust it."<sup>[5]</sup> He described engineers routinely shipping pull requests of 2,000 to 3,000 lines generated entirely by Claude.<sup>[6]</sup></p>

<p>Boris Cherny, head of Anthropic's Claude Code division, confirmed he has not written a single line of code by hand in over two months. In a public post, he stated: "I shipped 22 PRs yesterday and 27 the day before, each one 100% written by Claude."<sup>[7]</sup> An Anthropic spokesperson confirmed the company-wide figure is between 70% and 90%.<sup>[7]</sup></p>

<p>Perhaps most remarkably, approximately 90% of Claude Code's own codebase is now written by Claude Code itself.<sup>[7][8]</sup> Anthropic's Cowork product &mdash; launched January 12, 2026 &mdash; was built in ten days by four engineers, with most of the code written by Claude Code.<sup>[9][10]</sup></p>

<p>These are not startups exaggerating capability. These are the two leading frontier AI laboratories describing what is already happening inside their own walls.</p>

## III. The Collapse of Cost

<p>Recursive improvement alone would be significant. But it is occurring alongside a dramatic and accelerating collapse in the cost of frontier-class inference.</p>

### MiniMax M2: Near-Frontier Performance at Utility Pricing

<p>MiniMax, a Shanghai-based AI company, released M2 &mdash; a 230-billion parameter mixture-of-experts model that activates only 10 billion parameters per token. It ranks in the top five globally on the Artificial Analysis Intelligence Index, scoring 61 &mdash; ahead of DeepSeek-V3.2 (57) and trailing Claude Sonnet 4.5 (63) and GPT-5 (69). On agentic benchmarks including Terminal-Bench and SWE-bench Verified, it is competitive with frontier proprietary models.<sup>[11][12]</sup></p>

<p>Its API pricing: $0.30 per million input tokens and $1.20 per million output tokens.<sup>[13][14]</sup> This represents approximately 8% of the cost of Claude Sonnet 4.5 ($3.00 / $15.00 per million) with nearly double the inference speed.<sup>[15]</sup> The model is open-source under an MIT license, with weights freely available.</p>

<p>MiniMax M2.5, released days ago, is the first open-weights model to match Claude Sonnet on independent coding benchmarks.<sup>[16]</sup></p>

<table class="data-table" tabindex="0">
  <thead>
    <tr>
      <th>Model</th>
      <th>Input / 1M tokens</th>
      <th>Output / 1M tokens</th>
      <th>Intelligence Index</th>
    </tr>
  </thead>
  <tbody>
    <tr><td>Claude Sonnet 4.5</td><td>$3.00</td><td>$15.00</td><td>63</td></tr>
    <tr><td>GPT-5 (thinking)</td><td>~$3.00</td><td>~$15.00</td><td>69</td></tr>
    <tr><td>MiniMax M2</td><td>$0.30</td><td>$1.20</td><td>61</td></tr>
  </tbody>
</table>

<p class="table-note">Cost comparison across frontier-class models. Sources: Artificial Analysis, MiniMax official pricing, Perficient analysis.</p>

## IV. The Implication

<p>Intelligence is no longer scarce. It is approaching the price profile of a utility &mdash; available to anyone, at any scale, for almost nothing.</p>

<p>I am experiencing this directly. I have not written a single line of code by hand in 2026. My speed and quality of execution are higher than at any point in my career. I am building more, shipping faster, and solving harder problems &mdash; not because I became a better engineer, but because the nature of what "engineering" means changed underneath me while I was doing it.</p>

<div class="callout">That last sentence should sit with you for a moment.</div>

<p>When execution becomes abundant, leverage shifts &mdash; toward judgment, taste, intent, and meaning. The things we spent decades treating as soft skills quietly became the only skills that differentiate human contribution from machine output.</p>

## V. The Feedback Loop

<p>What is striking is not a single breakthrough. It is the structure of the dynamic itself.</p>

<p>Better tools build better tools. Those tools lower the cost of building. Lower costs expand access. Expanded access accelerates the next cycle. Each iteration makes the subsequent one faster, cheaper, and more capable &mdash; and the humans in the loop shift from writing to directing, from executing to deciding.</p>

<p>This is not a metaphor. It is the operational reality at the organizations building the most advanced AI systems on the planet. OpenAI explicitly described GPT-5.3-Codex as "the first self-developing AI coding model."<sup>[2]</sup> Anthropic's CPO confirmed "Claude is being written by Claude."<sup>[6]</sup> SemiAnalysis reports that 4% of all GitHub public commits are now authored by Claude Code, projecting 20%+ by end of 2026.<sup>[8]</sup></p>

<div class="callout">And it is compounding.</div>

## VI. The Institutional Gap

<p>We are not prepared for what this implies.</p>

<p>We do not have language for a world where cognitive labor compounds on itself. We do not have policy for an economy where the marginal cost of expertise trends toward zero. We do not have institutions designed for a rate of capability growth that outpaces the legislative, educational, and cultural systems meant to govern it.</p>

<p>We are still running on frameworks built for scarcity &mdash; of knowledge, of skill, of access &mdash; and those frameworks are dissolving faster than we are building replacements.</p>

<p>This does not feel like an explosion. It feels like a slope that just became steeper than anything underneath us was designed for.</p>

<p>And the unsettling part is not the speed. It is the quiet. It is how few people have noticed that the ground shifted.</p>

<div class="callout">We may look back on this period not as the moment AI arrived, but as the moment the assumptions underneath work, expertise, progress, and purpose began to shift &mdash; slowly at first, and then all at once.</div>

<div class="references">

<h2>References</h2>

<ol>
  <li>NBC News. "OpenAI says new Codex coding model helped build itself." February 5, 2026.</li>
  <li>The New Stack. "OpenAI's GPT-5.3-Codex helped build itself." February 5, 2026.</li>
  <li>Let's Data Science. "GPT-5.3 Codex Explained: OpenAI's Self-Developing Agent." February 2026.</li>
  <li>Creati.ai. "OpenAI Launches GPT-5.3-Codex: Revolutionary AI Model That Helped Build Itself." February 6, 2026.</li>
  <li>IT Pro. "Anthropic Labs chief Mike Krieger claims Claude is essentially writing itself." February 2026.</li>
  <li>TechStory. "'Claude Writing Claude': The Code of Anthropic is Now Nearly 100% AI-Generated." February 9, 2026.</li>
  <li>Fortune. "Top engineers at Anthropic, OpenAI say AI now writes 100% of their code." January 29, 2026.</li>
  <li>SemiAnalysis. "Claude Code is the Inflection Point." February 2026.</li>
  <li>Axios. "Anthropic's Claude Cowork wrote itself." January 13, 2026.</li>
  <li>The Pragmatic Engineer. "How Claude Code is built." 2025.</li>
  <li>DeepLearning.ai / The Batch. "MiniMax-M2's Lightweight Footprint and Low Costs Belie Its Top Performance." November 6, 2025.</li>
  <li>Artificial Analysis. "MiniMax-M2 &mdash; Intelligence, Performance, and Pricing."</li>
  <li>MiniMax. Official API pricing documentation.</li>
  <li>MiniMax. M2 model release announcement.</li>
  <li>Perficient. Cost analysis of frontier AI models. 2026.</li>
  <li>OpenHands. "MiniMax M2.5: Open Weights Models Catch Up to Claude Sonnet." February 12, 2026.</li>
</ol>

</div>

<footer class="closing-block">

<p class="closing">This isn't speculation.<br>These are the companies' own words.</p>

<p>I don't have answers. But I am increasingly worried that we are not even asking the right questions yet.</p>

<p class="author">Aaryush Gupta</p>

</footer>
