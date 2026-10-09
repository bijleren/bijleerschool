// Students are linked to classes (groups) via student_groups. Embed the links in a
// students query with: student_groups(is_active, groups(name, is_active))
type ClassRef = { name: string; is_active?: boolean | null };

export interface StudentGroupLink {
  is_active: boolean | null;
  groups: ClassRef | ClassRef[] | null;
}

export function getStudentClassNames(student: { student_groups?: StudentGroupLink[] | null }): string[] {
  const names = (student.student_groups ?? [])
    .filter(sg => sg.is_active !== false)
    .flatMap(sg => (Array.isArray(sg.groups) ? sg.groups : sg.groups ? [sg.groups] : []))
    .filter(g => g.is_active !== false)
    .map(g => g.name);
  return [...new Set(names)].sort((a, b) => a.localeCompare(b, 'nl', { numeric: true }));
}

export function formatStudentClasses(student: { student_groups?: StudentGroupLink[] | null }): string {
  return getStudentClassNames(student).join(', ');
}

// "Klas: 3A" / "Klassen: 3A, 3B" — empty string when the student is in no class
export function studentClassesLabel(student: { student_groups?: StudentGroupLink[] | null }): string {
  const names = getStudentClassNames(student);
  if (names.length === 0) return '';
  return `${names.length === 1 ? 'Klas' : 'Klassen'}: ${names.join(', ')}`;
}
