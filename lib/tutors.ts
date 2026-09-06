export const subjects = [
  'Elementary Math',
  'Pre-Algebra',
  'Algebra I',
  'Algebra II',
  'Science',
  'Elementary Reading',
];
export const gradeLabel = (grade: number) =>
  grade === 0 ? 'Kindergarten' : `Grade ${grade}`;
export type Tutor = {
  id: string;
  name: string;
  photo: string;
  subjects: string[];
  grades: number[];
  rate: number;
  bio: string;
  accent: string;
  hours: number[];
  days: number[];
};
export const tutors: Tutor[] = [
  {
    id: 'emma',
    name: 'Emma Wilson',
    photo: 'photo-1687360440094-949b8fe71c8c',
    subjects: ['Elementary Math'],
    grades: [0, 1, 2, 3, 4, 5],
    rate: 35,
    bio: 'I turn big math worries into small, manageable steps. We’ll use games and everyday examples to build confidence with numbers.',
    accent: 'peach',
    hours: [15, 16, 17],
    days: [1, 3, 5],
  },
  {
    id: 'james',
    name: 'James Carter',
    photo: 'photo-1607990281513-2c110a25bd8c',
    subjects: ['Pre-Algebra', 'Algebra I', 'Algebra II'],
    grades: [6, 7, 8, 9, 10, 11, 12],
    rate: 45,
    bio: 'From first equations to tricky functions, I help students understand the why behind the steps—and feel ready to try on their own.',
    accent: 'blue',
    hours: [16, 17, 18],
    days: [2, 4, 6],
  },
  {
    id: 'sofia',
    name: 'Sofia Martinez',
    photo: 'photo-1725271765764-669af9988700',
    subjects: ['Science'],
    grades: [4, 5, 6, 7, 8, 9, 10],
    rate: 40,
    bio: 'Science starts with a good question. I make challenging ideas easier to understand with clear explanations and real-world connections.',
    accent: 'green',
    hours: [15, 17],
    days: [1, 2, 4],
  },
  {
    id: 'olivia',
    name: 'Olivia Bennett',
    photo: 'photo-1663550910287-0c92a030feab',
    subjects: ['Elementary Reading'],
    grades: [0, 1, 2, 3, 4, 5],
    rate: 35,
    bio: 'A patient space for growing readers. We’ll practice phonics, fluency, and understanding stories at a pace that feels comfortable.',
    accent: 'purple',
    hours: [14, 15, 16],
    days: [2, 3, 5],
  },
  {
    id: 'marcus',
    name: 'Marcus Davis',
    photo: 'photo-1748572593891-049121e2e1ee',
    subjects: ['Elementary Math', 'Pre-Algebra', 'Science'],
    grades: [3, 4, 5, 6, 7, 8],
    rate: 40,
    bio: 'I help curious learners connect the dots in math and science. Each session meets your child where they are and builds from there.',
    accent: 'yellow',
    hours: [16, 18],
    days: [1, 4, 6],
  },
];
export function slotsFor(tutor: Tutor, now = new Date()) {
  const slots: string[] = [];
  for (let offset = 1; offset <= 14; offset++) {
    const date = new Date(now);
    date.setDate(date.getDate() + offset);
    if (!tutor.days.includes(date.getDay())) continue;
    for (const hour of tutor.hours) {
      date.setHours(hour, 0, 0, 0);
      slots.push(date.toISOString());
    }
  }
  return slots;
}
export const dateText = (slot: string) =>
  new Date(slot).toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });
export const timeText = (slot: string) =>
  new Date(slot).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  });
export const slotKey = (tutorId: string, slot: string) => `${tutorId}:${slot}`;
