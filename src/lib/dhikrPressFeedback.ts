/** Keep the dhikr tap animation on the transform compositor path. Applying a
 * CSS filter to an animated button can briefly paint it black in Android
 * WebView while the counter text is being re-rendered. */
export function animateDhikrCountPress(button: HTMLElement | null, reduceMotion: boolean): void {
  if (!button || reduceMotion || typeof button.animate !== "function") return;
  button.animate(
    [
      { transform: "scale(1)" },
      { transform: "scale(0.955)", offset: 0.2 },
      { transform: "scale(1.012)", offset: 0.55 },
      { transform: "scale(1)" },
    ],
    { duration: 276, easing: "cubic-bezier(0.22, 0.61, 0.36, 1)" },
  );
}
