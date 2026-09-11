import { getCurrentWindow } from '@tauri-apps/api/window';
import type { MouseEvent } from 'react';

type ResizeDirection = 'East' | 'North' | 'NorthEast' | 'NorthWest' | 'South' | 'SouthEast' | 'SouthWest' | 'West';

const directions: Array<{ direction: ResizeDirection; name: string }> = [
  { direction: 'North', name: 'n' },
  { direction: 'NorthEast', name: 'ne' },
  { direction: 'East', name: 'e' },
  { direction: 'SouthEast', name: 'se' },
  { direction: 'South', name: 's' },
  { direction: 'SouthWest', name: 'sw' },
  { direction: 'West', name: 'w' },
  { direction: 'NorthWest', name: 'nw' },
];

export function WindowResizeHandles() {
  const startResize = (event: MouseEvent<HTMLDivElement>, direction: ResizeDirection) => {
    if (event.button !== 0) return;
    event.preventDefault();
    event.stopPropagation();
    void getCurrentWindow().startResizeDragging(direction);
  };

  return <>{directions.map(({ direction, name }) => (
    <div
      aria-hidden="true"
      className={`resize-handle resize-handle--${name}`}
      key={direction}
      onMouseDown={(event) => startResize(event, direction)}
    />
  ))}</>;
}
