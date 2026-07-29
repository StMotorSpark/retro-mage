# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: browser-persistence.spec.ts >> failed handoff acknowledgment retains instance, successful releases it
- Location: examples/demo/tests/browser-persistence.spec.ts:102:1

# Error details

```
Error: expect(received).toBe(expected) // Object.is equality

Expected: true
Received: false

Call Log:
- Timeout 10000ms exceeded while waiting on the predicate
```

# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - generic [ref=e7]:
    - button "F1" [ref=e8]
    - button "F2" [ref=e9]
    - button "F3" [ref=e10]
    - button "F4" [ref=e11]
    - button "D-Up" [ref=e12]
    - button "D-Down" [ref=e13]
    - button "D-Left" [ref=e14]
    - button "D-Right" [ref=e15]
    - button "T1" [ref=e16]
    - button "T2" [ref=e17]
    - button "T3" [ref=e18]
    - button "T4" [ref=e19]
  - generic [ref=e20]:
    - generic [ref=e21]: "FPS: 28.7 (34.86 ms) Sight Radius: 3.20 Max Sight: 64.0 | Cull Prec: 64.0 Ambient Light: 0.05 Rendered Tiles: 133 | Actors: 0 World Structure: Indoor"
    - generic [ref=e22]:
      - generic [ref=e23]:
        - generic [ref=e24]: Max Sight
        - generic [ref=e25]:
          - button "-" [ref=e26] [cursor=pointer]
          - button "+" [ref=e27] [cursor=pointer]
      - generic [ref=e28]:
        - generic [ref=e29]: Cull Prec
        - generic [ref=e30]:
          - button "-" [ref=e31] [cursor=pointer]
          - button "+" [ref=e32] [cursor=pointer]
      - generic [ref=e33]:
        - generic [ref=e34]: Ambient Light
        - generic [ref=e35]:
          - button "-" [ref=e36] [cursor=pointer]
          - button "+" [ref=e37] [cursor=pointer]
```