import {
  Activity,
  Database,
  FileJson,
  LayoutDashboard,
  MessageSquare,
  Settings,
  Users,
} from 'lucide-react';

export const NAV_ITEMS = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'offline-studio', label: 'Studio JSON Offline', icon: FileJson },
  { id: 'questions', label: 'Quiz & Questions', icon: Database },
  { id: 'users', label: 'Users', icon: Users },
  { id: 'scores', label: 'Scores', icon: Activity },
  { id: 'battle', label: 'Battle Rooms', icon: MessageSquare },
  { id: 'settings', label: 'Settings', icon: Settings },
];

export const COLLECTIONS = {
  questions: { name: 'quizzes', order: 'createdAt', label: 'quiz' },
  users: { name: 'users', order: 'totalScore', label: 'utilisateurs' },
  scores: { name: 'scores', order: 'score', label: 'scores' },
  battle: { name: 'battleRooms', order: 'createdAt', label: 'battle rooms' },
};
