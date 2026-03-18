import { format, formatDistanceToNow } from 'date-fns';

export const toDate = (ts) => {
  if (!ts) return null;
  if (ts.toDate) return ts.toDate();
  if (ts instanceof Date) return ts;
  return new Date(ts);
};

export const formatTime     = (ts) => { const d = toDate(ts); return d ? format(d,'hh:mm a') : '—'; };
export const formatDate     = (ts) => { const d = toDate(ts); return d ? format(d,'MMM dd, yyyy') : '—'; };
export const formatDateTime = (ts) => { const d = toDate(ts); return d ? format(d,'MMM dd, yyyy · hh:mm a') : '—'; };
export const timeAgo        = (ts) => { const d = toDate(ts); return d ? formatDistanceToNow(d,{addSuffix:true}) : '—'; };

export const calcDuration = (a, b) => {
  const start = toDate(a); const end = toDate(b);
  if (!start || !end) return '—';
  const mins = Math.floor((end - start) / 60000);
  if (mins < 60) return `${mins}m`;
  const h = Math.floor(mins / 60), m = mins % 60;
  return m ? `${h}h ${m}m` : `${h}h`;
};

export const COLLEGES = [
  'College of Arts and Sciences',
  'College of Business and Accountancy',
  'College of Computer Studies',
  'College of Education',
  'College of Engineering',
  'College of Law',
  'College of Medicine',
  'College of Nursing',
  'College of Psychology',
  'Graduate School',
  'Senior High School',
  'Other',
];

export const PURPOSES = [
  'Reading',
  'Researching',
  'Studying',
  'Using a Computer',
  'Borrowing Books',
  'Returning Books',
  'Group Study',
  'Thesis / Capstone Work',
  'Printing / Photocopying',
  'Faculty Work',
  'Other',
];

export const PURPOSE_ICONS = {
  'Reading':                '📖',
  'Researching':            '🔬',
  'Studying':               '📝',
  'Using a Computer':       '💻',
  'Borrowing Books':        '📚',
  'Returning Books':        '↩️',
  'Group Study':            '👥',
  'Thesis / Capstone Work': '🎓',
  'Printing / Photocopying':'🖨️',
  'Faculty Work':           '👩‍🏫',
  'Other':                  '📌',
};

export const COLLEGE_COLORS = {
  'College of Computer Studies':        '#2d3a8c',
  'College of Engineering':             '#0284c7',
  'College of Business and Accountancy':'#16a34a',
  'College of Education':               '#d97706',
  'College of Nursing':                 '#dc2626',
  'College of Arts and Sciences':       '#7c3aed',
  'College of Medicine':                '#0369a1',
  'College of Psychology':              '#db2777',
  'College of Law':                     '#92400e',
  'Graduate School':                    '#374151',
  'Senior High School':                 '#059669',
  'Other':                              '#6b7280',
};

export const getInitials = (name = '') =>
  name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);

export const getAvatarColor = (str = '') => {
  const colors = ['#2d3a8c','#0284c7','#16a34a','#d97706','#7c3aed','#dc2626','#db2777','#059669'];
  let h = 0;
  for (let i = 0; i < str.length; i++) h = str.charCodeAt(i) + ((h << 5) - h);
  return colors[Math.abs(h) % colors.length];
};

export const COURSES_BY_COLLEGE = {
  'College of Computer Studies': [
    'BS Computer Science',
    'BS Information Technology',
    'BS Information Systems',
  ],
  'College of Engineering': [
    'BS Civil Engineering',
    'BS Electrical Engineering',
    'BS Electronics Engineering',
    'BS Mechanical Engineering',
    'BS Computer Engineering',
  ],
  'College of Business and Accountancy': [
    'BS Accountancy',
    'BS Business Administration',
    'BS Management Accounting',
    'BS Office Administration',
  ],
  'College of Education': [
    'Bachelor of Elementary Education',
    'Bachelor of Secondary Education',
    'Bachelor of Physical Education',
    'BS Early Childhood Education',
  ],
  'College of Nursing': [
    'BS Nursing',
  ],
  'College of Arts and Sciences': [
    'AB Communication',
    'AB English',
    'AB Political Science',
    'BS Biology',
    'BS Psychology',
    'BS Social Work',
  ],
  'College of Medicine': [
    'Doctor of Medicine',
    'BS Medical Technology',
    'BS Pharmacy',
    'BS Radiologic Technology',
    'BS Respiratory Therapy',
  ],
  'College of Psychology': [
    'BS Psychology',
    'AB Psychology',
  ],
  'College of Law': [
    'Juris Doctor',
    'Bachelor of Laws',
  ],
  'Graduate School': [
    'Master of Business Administration',
    'Master of Arts in Education',
    'Master of Science in Computer Science',
    'Doctor of Philosophy',
    'Doctor of Education',
  ],
  'Senior High School': [
    'STEM Strand',
    'ABM Strand',
    'HUMSS Strand',
    'GAS Strand',
    'TVL Track',
    'Sports Track',
    'Arts and Design Track',
  ],
  'Other': [
    'Other',
  ],
};

// Flat list — used as fallback only
export const COURSES = Object.values(COURSES_BY_COLLEGE).flat();

export const getCoursesForCollege = (college) =>
  COURSES_BY_COLLEGE[college] || ['Other'];

export const YEAR_LEVELS = [
  '1st Year', '2nd Year', '3rd Year', '4th Year',
  '5th Year', 'Graduate', 'Faculty / Staff',
];
