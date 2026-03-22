import { RouteObject } from 'react-router-dom';
import { LibraryDashboard } from './pages/LibraryDashboard';
import { BookCatalog } from './pages/BookCatalog';
import { IssuedBooks } from './pages/IssuedBooks';
import { Returns } from './pages/Returns';
import { OverdueBooks } from './pages/OverdueBooks';
import { Members } from './pages/Members';
import { Fines } from './pages/Fines';
import { Authors } from './pages/Authors';
import { Categories } from './pages/Categories';
import { LibrarySettings } from './pages/LibrarySettings';

export const libraryRoutes: RouteObject[] = [
  {
    path: '',
    element: <LibraryDashboard />
  },
  {
    path: 'catalog',
    element: <BookCatalog />
  },
  {
    path: 'issued',
    element: <IssuedBooks />
  },
  {
    path: 'returns',
    element: <Returns />
  },
  {
    path: 'overdue',
    element: <OverdueBooks />
  },
  {
    path: 'members',
    element: <Members />
  },
  {
    path: 'fines',
    element: <Fines />
  },
  {
    path: 'authors',
    element: <Authors />
  },
  {
    path: 'categories',
    element: <Categories />
  },
  {
    path: 'settings',
    element: <LibrarySettings />
  }
];

export {
  LibraryDashboard,
  BookCatalog,
  IssuedBooks,
  Returns,
  OverdueBooks,
  Members,
  Fines,
  Authors,
  Categories,
  LibrarySettings
}
