import { useEffect, useState, RefObject } from 'react';

/**
 * Custom hook that uses ResizeObserver to measure element height reactively.
 * Returns the height of the element referenced by the ref, updating automatically
 * when the element's size changes.
 * 
 * @param ref - React ref to the element to measure
 * @param fallbackHeight - Optional fallback height if measurement fails (default: 0)
 * @param enabled - Optional flag to enable/disable observation (default: true)
 * @returns The current height of the element in pixels
 */
export function useElementHeight(
  ref: RefObject<HTMLElement>,
  fallbackHeight: number = 0,
  enabled: boolean = true
): number {
  // Validate fallbackHeight parameter
  const validatedFallback = typeof fallbackHeight === 'number' && fallbackHeight >= 0 && !isNaN(fallbackHeight)
    ? fallbackHeight
    : 0;
  
  const [height, setHeight] = useState<number>(validatedFallback);

  useEffect(() => {
    if (!enabled) {
      setHeight(validatedFallback);
      return;
    }

    const element = ref.current;
    if (!element) {
      setHeight(validatedFallback);
      return;
    }

    // Initial measurement with validation
    try {
      const initialHeight = element.offsetHeight;
      if (typeof initialHeight === 'number' && initialHeight >= 0 && !isNaN(initialHeight)) {
        setHeight(initialHeight);
      } else {
        setHeight(validatedFallback);
        if (process.env.NODE_ENV === 'development') {
          console.warn('Invalid initial height measurement:', initialHeight, 'using fallback:', validatedFallback);
        }
      }
    } catch (error) {
      setHeight(validatedFallback);
      if (process.env.NODE_ENV === 'development') {
        console.warn('Error measuring element height:', error, 'using fallback:', validatedFallback);
      }
    }

    // Set up ResizeObserver for reactive updates
    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const measuredHeight = entry.borderBoxSize
          ? entry.borderBoxSize[0].blockSize
          : entry.target.getBoundingClientRect().height;

        // Validate height is a valid number
        if (typeof measuredHeight === 'number' && measuredHeight >= 0 && !isNaN(measuredHeight) && isFinite(measuredHeight)) {
          setHeight(measuredHeight);
        } else {
          // Use fallback if measurement is invalid
          setHeight(validatedFallback);
          if (process.env.NODE_ENV === 'development') {
            console.warn('Invalid height measurement:', measuredHeight, 'for element:', element, 'using fallback:', validatedFallback);
          }
        }
      }
    });

    resizeObserver.observe(element);

    return () => {
      resizeObserver.disconnect();
    };
  }, [ref, validatedFallback, enabled]);

  return height;
}
