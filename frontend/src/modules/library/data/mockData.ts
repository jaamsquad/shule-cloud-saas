import { Book, Borrower, IssueRecord, Fine, Category, Author } from '../types';

export const mockBooks: Book[] = [
  {
    id: 'b1',
    accessionNumber: 'ACC001',
    isbn: '978-3-16-148410-0',
    title: 'Introduction to Algorithms',
    author: 'Thomas H. Cormen',
    publisher: 'MIT Press',
    category: 'Computer Science',
    shelfNumber: 'CS-01-A',
    copiesTotal: 5,
    copiesAvailable: 3,
    status: 'Available',
    digitalCopyUrl: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
  },
  {
    id: 'b2',
    accessionNumber: 'ACC002',
    isbn: '978-0-201-89683-1',
    title: 'The Art of Computer Programming',
    author: 'Donald E. Knuth',
    publisher: 'Addison-Wesley',
    category: 'Computer Science',
    shelfNumber: 'CS-01-B',
    copiesTotal: 2,
    copiesAvailable: 0,
    status: 'Out of Stock',
  },
  {
    id: 'b3',
    accessionNumber: 'ACC003',
    isbn: '978-0-13-110362-7',
    title: 'The C Programming Language',
    author: 'Brian W. Kernighan',
    publisher: 'Prentice Hall',
    category: 'Computer Science',
    shelfNumber: 'CS-02-A',
    copiesTotal: 10,
    copiesAvailable: 1,
    status: 'Low Stock',
    digitalCopyUrl: 'https://s29.q4cdn.com/175625835/files/doc_downloads/test.pdf',
  },
];

export const mockBorrowers: Borrower[] = [
  {
    id: 'u1',
    name: 'Alice Johnson',
    admissionNumber: 'STU2023001',
    type: 'Student',
    contact: 'alice@example.com',
    booksIssued: 2,
    finesTotal: 0,
    readingPoints: 1250,
    badges: ['Bookworm', 'Early Bird', 'Sci-Fi Fanatic'],
  },
  {
    id: 'u2',
    name: 'Dr. Bob Smith',
    type: 'Staff',
    contact: 'bob@example.com',
    booksIssued: 1,
    finesTotal: 50,
    readingPoints: 450,
    badges: ['Researcher'],
  },
];

export const mockIssues: IssueRecord[] = [
  {
    id: 'i1',
    bookId: 'b2',
    borrowerId: 'u1',
    issueDate: '2023-10-01',
    dueDate: '2023-10-15',
    status: 'Overdue',
    fineAmount: 20,
  },
  {
    id: 'i2',
    bookId: 'b3',
    borrowerId: 'u2',
    issueDate: '2023-10-10',
    dueDate: '2023-10-24',
    status: 'Issued',
    fineAmount: 0,
  },
];

export const mockFines: Fine[] = [
  {
    id: 'f1',
    issueId: 'i1',
    borrowerId: 'u1',
    amount: 20,
    reason: 'Late Return',
    status: 'Unpaid',
    date: '2023-10-16',
  },
];

export const mockCategories: Category[] = [
  { id: 'cat1', name: 'Computer Science', description: 'Computing and algorithms', bookCount: 150 },
  { id: 'cat2', name: 'Mathematics', description: 'Pure and applied math', bookCount: 200 },
  { id: 'cat3', name: 'Physics', description: 'Classical and modern physics', bookCount: 120 },
];

export const mockAuthors: Author[] = [
  { id: 'a1', name: 'Thomas H. Cormen', bookCount: 5 },
  { id: 'a2', name: 'Donald E. Knuth', bookCount: 12 },
  { id: 'a3', name: 'Brian W. Kernighan', bookCount: 8 },
];
