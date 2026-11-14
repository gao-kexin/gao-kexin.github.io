/** Classify a key event while a node's text editor is active. */
export function editorCommand(event, value, isRoot) {
  if (event.isComposing || event.keyCode === 229) return 'native';

  const modifier = event.ctrlKey || event.metaKey;
  const key = event.key;
  if (modifier && (key.toLowerCase() === 'z' || key.toLowerCase() === 'y')) return 'native';

  if ((key === 'Backspace' || key === 'Delete') && value === '' && !modifier && !event.altKey) {
    return event.repeat || isRoot ? 'consume' : 'delete';
  }
  if (key === 'Tab') return 'child';
  if (key === 'Enter' && !event.shiftKey) return modifier ? 'finish' : 'sibling';
  if (key === 'Escape') return 'cancel';
  return 'native';
}
