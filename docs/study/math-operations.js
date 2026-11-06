/* Shared DOM wiring only. Modules own the bounded math rules; callers own progress. */
(function(root) {
  "use strict";
  const labels = Object.freeze({expression_steps:"逐步列式", vertical_decimal:"小數直式", fraction_shade:"分數畫斜線", hundred_grid_select:"圈選百格板", triangle_construct:"三角形作圖", bar_chart_draw:"畫長條圖", measure_tool:"使用工具量測"});
  function moduleFor(q) {
    if (root.StudyMathInteractions?.TYPES.includes(q?.type)) return root.StudyMathInteractions;
    if (root.StudyMathGeometry?.TYPES.includes(q?.type)) return root.StudyMathGeometry;
    return null;
  }
  function bind({q, element, getState, setState, answered = () => false, feedback = () => false, onChange = () => {}, onRender = () => {}}) {
    const M = moduleFor(q), geometry = M === root.StudyMathGeometry;
    let pointer = null;
    const read = () => M.read(q, element, getState());
    function render() {
      const scroll = element.querySelector?.('.sg-scroll');
      const left = scroll?.scrollLeft || 0, top = scroll?.scrollTop || 0;
      element.innerHTML = M.render(q, getState(), answered(), feedback());
      const next = element.querySelector?.('.sg-scroll');
      if (next) { next.scrollLeft = left; next.scrollTop = top; }
      onRender();
    }
    function dispatch(action, payload) {
      if (answered()) return;
      setState(M.update(q, read(), action, payload));
      const navigation = geometry ? ['vertex','bar','tool','zoom'].includes(action) : ['focus','setupFocus','companionFocus'].includes(action);
      onChange(!navigation);
      render();
    }
    const click = event => {
      const selector = geometry ? 'button[data-geometry-action]' : '[data-math-action]';
      const control = event.target.closest?.(selector);
      if (!control || control.disabled || !element.contains(control)) return;
      event.stopPropagation?.(); // Rendering replaces the target before the event could reach the page delegate.
      dispatch(geometry ? control.dataset.geometryAction : control.dataset.mathAction,
        geometry ? control.dataset.geometryValue : control.dataset.mathValue);
    };
    const input = event => {
      if (answered() || !event.target.closest?.('[data-geometry-field],input[data-math-field]')) return;
      setState(read()); onChange(true); onRender(); // Keep native caret and composition intact.
    };
    function place(event) {
      const svg = element.querySelector?.('svg[data-geometry-action="canvas"]'), matrix = svg?.getScreenCTM?.();
      if (!matrix) return;
      const point = new DOMPoint(event.clientX, event.clientY).matrixTransform(matrix.inverse());
      dispatch('canvas', {x:point.x, y:point.y});
    }
    const down = event => {
      if (!geometry || answered() || pointer !== null || event.button !== 0 || !event.target.closest?.('svg[data-geometry-action="canvas"]')) return;
      event.preventDefault(); pointer = event.pointerId; element.setPointerCapture(pointer); place(event);
    };
    const move = event => { if (event.pointerId === pointer) { event.preventDefault(); place(event); } };
    const up = event => {
      if (event.pointerId !== pointer) return;
      if (element.hasPointerCapture?.(pointer)) element.releasePointerCapture(pointer);
      pointer = null;
    };
    const key = event => {
      const target = event.target.closest?.('[data-math-action][role="button"]');
      if (!target || !['Enter',' '].includes(event.key)) return;
      event.preventDefault(); click(event);
    };
    const listeners = {click, input, keydown:key, pointerdown:down, pointermove:move, pointerup:up, pointercancel:up, lostpointercapture:up};
    for (const [name, fn] of Object.entries(listeners)) element.addEventListener?.(name, fn);
    render();
    return {read, render, dispatch, destroy() {
      if (pointer !== null && element.hasPointerCapture?.(pointer)) element.releasePointerCapture(pointer);
      pointer = null;
      for (const [name, fn] of Object.entries(listeners)) element.removeEventListener?.(name, fn);
    }};
  }
  root.StudyMathOperations = Object.freeze({moduleFor, labelFor:q => labels[q?.type] || "數學操作", bind});
})(globalThis);
