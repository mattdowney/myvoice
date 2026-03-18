export function stripCodeFence(text: string): string {
  if (text.startsWith('```markdown')) {
    return text.replace(/^```markdown\n/, '').replace(/\n```$/, '');
  } else if (text.startsWith('```')) {
    return text.replace(/^```\n/, '').replace(/\n```$/, '');
  }
  return text;
}
