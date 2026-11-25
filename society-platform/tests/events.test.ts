import { describe, expect, it } from 'vitest';
import { demoEvents } from '../web/src/data/demo';
import { selectEvents, updateDemoEvent } from '../web/src/features/events/model';

describe('demo event views', () => {
  it('hides drafts and archived events from home and keeps featured events first', () => {
    expect(selectEvents(demoEvents, 'sai-vista', 'home').map(event => event.id)).toEqual(['lights', 'run']);
    expect(selectEvents(demoEvents, 'sai-vista', 'archive').map(event => event.id)).toEqual(['ganesh']);
    expect(selectEvents(demoEvents, 'missing', 'admin')).toEqual([]);
  });
  it('limits edits to the selected society and leaves source fixtures unchanged', () => {
    const result = updateDemoEvent(demoEvents, 'maple-grove', 'lights', { status: 'archived', pinned: false });
    expect(result).toEqual(demoEvents);
    const updated = updateDemoEvent(demoEvents, 'sai-vista', 'lights', { status: 'archived', pinned: false });
    expect(selectEvents(updated, 'sai-vista', 'home').map(event => event.id)).toEqual(['run']);
    expect(demoEvents[0].status).toBe('published');
  });
});
