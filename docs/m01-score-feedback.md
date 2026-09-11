# M01 score feedback integration seam

`src/components/DroneSurveyScoreFeedback.svelte` is a presentational component.
It accepts an explicit `DroneSurveyScore` value from `src/lib/fll/drone-survey.ts`
and does not access `Simulation`, scene objects, or physics contacts.

When a match controller and observation bridge are agreed, its score state should
be passed into the simulator view after score evaluation:

```svelte
<DroneSurveyScoreFeedback score={matchState.m01Score} />
```

The parent owns when the score is evaluated and clears or replaces the value on
match start, reset, and finish. The component deliberately does not call
`scoreDroneSurvey` or infer observations from rendered state, so rendering
frequency cannot affect scoring.

Until that interface exists, the component may be rendered with `undefined` to
show its explicit unavailable state. Its source link comes from the supplied score
contract, preserving the scorer's recorded source/version data.
