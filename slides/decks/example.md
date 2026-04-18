# My Presentation
### Powered by reveal.js

---

<!-- .slide: data-transition="zoom" -->

## Fragments

Items animate in one at a time

- First point <!-- .element: class="fragment" -->
- Second point <!-- .element: class="fragment" -->
- Third point <!-- .element: class="fragment highlight-green" -->

---

<!-- .slide: data-transition="convex" data-background="#1a1a2e" -->

## Background Colors

You can set per-slide backgrounds

> Any hex color, image, video, or iframe

---

<!-- .slide: data-auto-animate -->

## Auto-Animate: Step 1

```js []
function add(a, b) {
  return a + b;
}
```

---

<!-- .slide: data-auto-animate -->

## Auto-Animate: Step 2

```js [3-5]
function add(a, b) {
  return a + b;
}

const result = add(1, 2);
console.log(result); // 3
```

---

<!-- .slide: data-auto-animate -->

## Auto-Animate: Step 3

```js [7]
function add(a, b) {
  return a + b;
}

const result = add(1, 2);
console.log(result); // 3

export { add };
```

---

## Vertical Slides

Arrow down to drill in ↓

----

### Sub-slide 1

Use `----` for vertical slides

----

### Sub-slide 2

Great for supplementary detail

---

<!-- .slide: data-transition="fade" data-background="#0d3349" -->

## Fragment Styles

Highlight effects on reveal

- Normal text
- **Bold highlight** <!-- .element: class="fragment highlight-blue" -->
- ~~Strike through~~ <!-- .element: class="fragment strike" -->
- Fade out after showing <!-- .element: class="fragment fade-in-then-out" -->

---

<!-- .slide: data-auto-animate data-background="#16213e" -->

## Auto-Animate Layouts

<div style="display:flex; gap: 2rem; justify-content: center; margin-top: 2rem">
  <div data-id="box1" style="background:#e94560; width:100px; height:100px; border-radius:8px"></div>
</div>

---

<!-- .slide: data-auto-animate data-background="#16213e" -->

## Auto-Animate Layouts

<div style="display:flex; gap: 2rem; justify-content: center; margin-top: 2rem">
  <div data-id="box1" style="background:#e94560; width:100px; height:100px; border-radius:50%"></div>
  <div data-id="box2" style="background:#0f3460; width:100px; height:100px; border-radius:8px"></div>
  <div data-id="box3" style="background:#533483; width:100px; height:100px; border-radius:8px"></div>
</div>

---

<!-- .slide: data-transition="zoom" data-background="#0a3d0a" -->

# That's it!

Press `S` for speaker notes  
Press `O` for slide overview  
Press `F` for fullscreen

Note:
These are speaker notes — only visible in presenter mode.
You can write as much as you want here.
