
import { Schedule, Event, NewsInfo } from './types';

export const STARTUPS = [
  'TechNova AI',
  'EcoStream Solutions',
  'FinLink',
  'HealthEase',
  'EduVibe'
];

export const MOCK_MEETINGS: Schedule[] = [
  {
    id: '1',
    title: 'Startup Weekly Sync',
    date: '2024-05-20',
    time: '10:00 AM',
    locationOffline: 'Lab Room A',
    organizer: 'Dr. Ahmad Sucipto',
    description: 'Weekly progress report for all registered startups.'
  },
  {
    id: '2',
    title: 'Aslab Coordination',
    date: '2024-05-22',
    time: '02:00 PM',
    locationOffline: 'Virtual Zoom',
    locationOnline: true,
    organizer: 'Lab Manager',
    description: 'Scheduling practical sessions for the upcoming semester.'
  }
];

export const MOCK_EVENTS: Event[] = [
  {
    id: '1',
    title: 'Kolab Innovation Expo',
    date: '2024-06-15',
    image: 'https://picsum.photos/seed/expo/800/400',
    category: 'Competition',
    description: 'Showcase your startup and win funding prizes!'
  },
  {
    id: '2',
    title: 'AI & Future Careers Workshop',
    date: '2024-06-20',
    image: 'https://picsum.photos/seed/ai/800/400',
    category: 'Workshop',
    description: 'Expert session on navigating the AI-driven job market.'
  }
];

export const MOCK_NEWS: NewsInfo[] = [
  {
    id: '1',
    title: 'New Grant Opportunity',
    content: 'The faculty is offering research grants for Aslabs and Startups focused on IoT.',
    date: '2024-05-18',
    tags: ['Grant', 'Research']
  },
  {
    id: '2',
    title: 'Lab Maintenance Schedule',
    content: 'Lab Room B will be closed for maintenance next Monday.',
    date: '2024-05-17',
    tags: ['Info', 'Lab']
  }
];
