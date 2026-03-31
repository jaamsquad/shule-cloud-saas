import { Book, Borrower, IssueRecord, Fine, Category, Author } from '../types';
import { mockBooks, mockBorrowers, mockIssues, mockFines, mockCategories, mockAuthors } from '../data/mockData';

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export interface ActivityLog {
  id: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  timestamp: string;
}

const mockActivities: ActivityLog[] = [
  { id: '1', message: 'System initialized and ready.', type: 'info', timestamp: new Date().toISOString() }
];

import { Reservation } from '../types';
const mockReservations: Reservation[] = [
  { id: 'res1', bookId: 'b1', borrowerId: 'u1', reservationDate: new Date(Date.now() - 86400000).toISOString(), expiryDate: new Date(Date.now() + 86400000).toISOString(), status: 'Pending' }
];

let globalSettings = {
  maxBooksPerStudent: 3,
  maxBooksPerStaff: 10,
  finePerDay: 0.50,
  loanPeriodStudents: 14,
  loanPeriodStaff: 30,
  reservationExpiryDays: 3,
  enableAutoReminders: true,
  requireConditionCheck: true,
};

let currentRole: 'Admin' | 'Librarian' | 'Student' = 'Admin';

export const LibraryService = {
  getRole: () => currentRole,
  setRole: (role: 'Admin' | 'Librarian' | 'Student') => { currentRole = role; },

  // Reports
  getDailyReport: async (dateStr: string) => {
    await delay(300);
    const issues = mockIssues.filter(i => i.issueDate === dateStr);
    const returns = mockIssues.filter(i => i.returnDate === dateStr);
    const activitiesList = mockActivities.filter(a => a.timestamp.split('T')[0] === dateStr);
    return {
      date: dateStr,
      borrowed: issues,
      returned: returns,
      activities: activitiesList
    };
  },

  // Activities
  getActivities: async (): Promise<ActivityLog[]> => {
    return Promise.resolve([...mockActivities].reverse()); // Newest first
  },
  addActivity: (message: string, type: 'info' | 'success' | 'warning' | 'error' = 'info') => {
    mockActivities.push({
      id: `act_${Date.now()}_${Math.random()}`,
      message,
      type,
      timestamp: new Date().toISOString()
    });
  },

  // Settings
  getSettings: async () => {
    return Promise.resolve({ ...globalSettings });
  },
  updateSettings: async (newSettings: Partial<typeof globalSettings>) => {
    await delay(500);
    globalSettings = { ...globalSettings, ...newSettings };
    LibraryService.addActivity("Library system settings were updated.", "info");
    return globalSettings;
  },

  getBooks: async (): Promise<Book[]> => {
    return Promise.resolve([...mockBooks]);
  },
  addBook: async (book: Omit<Book, 'id'>): Promise<Book> => {
    await delay(500);
    const newBook: Book = { ...book, id: `b${Date.now()}` };
    mockBooks.push(newBook);
    LibraryService.addActivity(`New book "${newBook.title}" was added to the catalog.`, "success");
    return newBook;
  },
  deleteBook: async (id: string): Promise<void> => {
    await delay(400);
    const index = mockBooks.findIndex(b => b.id === id || b.accessionNumber === id);
    if (index === -1) throw new Error("Book not found");
    const bookTitle = mockBooks[index].title;
    mockBooks.splice(index, 1);
    LibraryService.addActivity(`Book "${bookTitle}" was deleted from the catalog.`, "error");
  },
  
  updateBookCover: async (id: string, coverUrl: string): Promise<Book> => {
    await delay(200);
    const book = mockBooks.find(b => b.id === id || b.accessionNumber === id);
    if (!book) throw new Error("Book not found");
    book.coverUrl = coverUrl;
    LibraryService.addActivity(`Cover updated for book "${book.title}".`, "info");
    return book;
  },
  
  getBorrowers: async (): Promise<Borrower[]> => {
    return Promise.resolve([...mockBorrowers]);
  },
  addBorrower: async (borrower: Omit<Borrower, 'id' | 'booksIssued' | 'finesTotal'>): Promise<Borrower> => {
    await delay(500);
    const newBorrower: Borrower = { ...borrower, id: `u${Date.now()}`, booksIssued: 0, finesTotal: 0 };
    mockBorrowers.push(newBorrower);
    LibraryService.addActivity(`New member "${newBorrower.name}" was registered.`, "success");
    return newBorrower;
  },

  getIssues: async (): Promise<IssueRecord[]> => {
    return Promise.resolve([...mockIssues]);
  },
  issueBook: async (bookId: string, borrowerId: string, issueDate: string, dueDate: string): Promise<IssueRecord> => {
    await delay(500);
    const book = mockBooks.find(b => b.accessionNumber === bookId || b.id === bookId);
    if (!book) throw new Error("Book not found");
    if (book.copiesAvailable <= 0) throw new Error("No copies available");
    
    book.copiesAvailable -= 1;
    if (book.copiesAvailable === 0) book.status = 'Out of Stock';
    else if (book.copiesAvailable < book.copiesTotal / 2) book.status = 'Low Stock';

    const borrower = mockBorrowers.find(u => u.id === borrowerId || u.admissionNumber === borrowerId);
    if (borrower) borrower.booksIssued += 1;

    const newIssue: IssueRecord = {
      id: `i${Date.now()}`,
      bookId: book.accessionNumber,
      borrowerId: borrower ? borrower.id : borrowerId,
      issueDate,
      dueDate,
      status: 'Issued',
      fineAmount: 0
    };
    mockIssues.push(newIssue);
    LibraryService.addActivity(`Book ${book.accessionNumber} was issued to ${borrowerId}.`, "info");
    return newIssue;
  },
  processReturn: async (bookId: string, isDamaged: boolean = false): Promise<IssueRecord> => {
    await delay(500);
    const issueIndex = mockIssues.findIndex(i => i.bookId === bookId && i.status !== 'Returned');
    if (issueIndex === -1) throw new Error("No active issue found for this book");

    const issue = mockIssues[issueIndex];
    issue.status = 'Returned';
    issue.returnDate = new Date().toISOString().split('T')[0];
    
    const book = mockBooks.find(b => b.accessionNumber === issue.bookId);
    if (book) {
      book.copiesAvailable += 1;
      book.status = 'Available';
    }

    const borrower = mockBorrowers.find(u => u.id === issue.borrowerId);
    if (borrower) {
      borrower.booksIssued = Math.max(0, borrower.booksIssued - 1);
      
      // Handle condition checks
      if (isDamaged) {
        borrower.finesTotal += 1.00;
        mockFines.push({
          id: `f${Date.now()}`,
          borrowerId: borrower.id,
          issueId: issue.id,
          reason: `Damaged Return (${bookId})`,
          date: new Date().toISOString().split('T')[0],
          amount: 1.00,
          status: 'Unpaid'
        });
        LibraryService.addActivity(`$1 fine applied to ${borrower.id} for damaged book.`, "warning");
      }
    }

    LibraryService.addActivity(`Book ${issue.bookId} was returned by ${issue.borrowerId}.`, "success");
    return issue;
  },

  calculateFine: (daysLate: number, rate: number): number => {
    const gracePeriod = globalSettings.loanPeriodStudents ? 2 : 0; // simple mock rule
    if (daysLate <= gracePeriod) return 0;
    return (daysLate - gracePeriod) * rate;
  },

  getFines: async (): Promise<Fine[]> => {
    return Promise.resolve([...mockFines]);
  },
  markFinePaid: async (fineId: string): Promise<void> => {
    await delay(300);
    const fine = mockFines.find(f => f.id === fineId);
    if (fine) {
      fine.status = 'Paid';
      LibraryService.addActivity(`Fine of $${fine.amount} for ${fine.borrowerId} was marked as paid.`, "success");
    }
  },

  getCategories: async (): Promise<Category[]> => {
    return Promise.resolve([...mockCategories]);
  },
  addCategory: async (category: Omit<Category, 'id' | 'bookCount'>): Promise<Category> => {
    await delay(500);
    const newCategory: Category = { ...category, id: `cat${Date.now()}`, bookCount: 0 };
    mockCategories.push(newCategory);
    LibraryService.addActivity(`Category "${newCategory.name}" was added.`, "success");
    return newCategory;
  },
  editCategory: async (id: string, data: Partial<Category>): Promise<Category> => {
    await delay(400);
    const index = mockCategories.findIndex(c => c.id === id);
    if (index === -1) throw new Error("Category not found");
    
    // preserve old name for activity log
    const oldName = mockCategories[index].name;
    
    mockCategories[index] = { ...mockCategories[index], ...data };
    
    if (data.name && data.name !== oldName) {
      LibraryService.addActivity(`Category "${oldName}" was renamed to "${data.name}".`, "info");
    } else {
      LibraryService.addActivity(`Category "${mockCategories[index].name}" was updated.`, "info");
    }
    
    return mockCategories[index];
  },
  deleteCategory: async (id: string): Promise<void> => {
    await delay(400);
    const index = mockCategories.findIndex(c => c.id === id);
    if (index === -1) throw new Error("Category not found");
    const catName = mockCategories[index].name;
    mockCategories.splice(index, 1);
    LibraryService.addActivity(`Category "${catName}" was deleted.`, "error");
  },

  getAuthors: async (): Promise<Author[]> => {
    return Promise.resolve([...mockAuthors]);
  },
  addAuthor: async (author: Omit<Author, 'id' | 'bookCount'>): Promise<Author> => {
    await delay(500);
    const newAuthor: Author = { ...author, id: `a${Date.now()}`, bookCount: 0 };
    mockAuthors.push(newAuthor);
    LibraryService.addActivity(`Author "${newAuthor.name}" was added.`, "success");
    return newAuthor;
  },

  notifyBorrower: async (borrowerId: string, message: string): Promise<void> => {
    await delay(800);
    console.log(`Notification sent to ${borrowerId}: ${message}`);
    LibraryService.addActivity(`Sent reminder notification to ${borrowerId}.`, "info");
    return Promise.resolve();
  },

  getMostBorrowedBooks: async () => {
    // calculate from issues or mockBooks. Let's just return a mock top 10
    const sorted = [...mockBooks].sort((a, b) => b.totalBorrowed - a.totalBorrowed).slice(0, 10);
    // Since totalBorrowed isn't in book type yet, let's just mock it or infer from issues
    const issueCounts: Record<string, number> = {};
    mockIssues.forEach(i => {
      issueCounts[i.bookId] = (issueCounts[i.bookId] || 0) + 1;
    });
    const booksWithCounts = mockBooks.map(b => ({
      ...b,
      borrows: issueCounts[b.accessionNumber] || 0
    })).sort((a, b) => b.borrows - a.borrows).slice(0, 10);
    return Promise.resolve(booksWithCounts);
  },

  getMostActiveBorrowers: async () => {
    const sorted = [...mockBorrowers].sort((a, b) => b.booksIssued - a.booksIssued).slice(0, 10);
    return Promise.resolve(sorted);
  },

  getMonthlyTrends: async () => {
    // mock monthly trends for the chart
    return Promise.resolve([
      { name: 'Jan', issues: 40, returns: 24, fines: 10 },
      { name: 'Feb', issues: 30, returns: 35, fines: 8 },
      { name: 'Mar', issues: 20, returns: 18, fines: 5 },
      { name: 'Apr', issues: 27, returns: 20, fines: 12 },
      { name: 'May', issues: 18, returns: 25, fines: 4 },
      { name: 'Jun', issues: 23, returns: 15, fines: 7 },
      { name: 'Jul', issues: 34, returns: 30, fines: 15 },
    ]);
  },

  getBooksNeverBorrowed: async () => {
    const borrowedIds = new Set(mockIssues.map(i => i.bookId));
    const neverBorrowed = mockBooks.filter(b => !borrowedIds.has(b.accessionNumber));
    return Promise.resolve(neverBorrowed);
  },

  getAverageReturnDelay: async () => {
    // simplified mock
    return Promise.resolve({ days: 2.5 });
  },

  getReservations: async (): Promise<Reservation[]> => {
    return Promise.resolve([...mockReservations]);
  },
  reserveBook: async (bookId: string, borrowerId: string): Promise<Reservation> => {
    await delay(400);
    const newRes: Reservation = {
      id: `res${Date.now()}`,
      bookId,
      borrowerId,
      reservationDate: new Date().toISOString(),
      expiryDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(), // 2 days expiry
      status: 'Pending'
    };
    mockReservations.push(newRes);
    LibraryService.addActivity(`Book ${bookId} was reserved by ${borrowerId}.`, "info");
    return newRes;
  },
  updateReservationStatus: async (resId: string, status: Reservation['status']): Promise<void> => {
    await delay(300);
    const res = mockReservations.find(r => r.id === resId);
    if (res) {
      res.status = status;
      LibraryService.addActivity(`Reservation ${resId} status updated to ${status}.`, "info");
    }
  },

  getDashboardStats: async () => {
    return Promise.resolve({
      totalBooks: mockBooks.length,
      totalBorrowers: mockBorrowers.length,
      activeIssues: mockIssues.filter(i => i.status === 'Issued' || i.status === 'Overdue').length,
      totalFines: mockFines.filter(f => f.status === 'Unpaid').reduce((acc, fine) => acc + fine.amount, 0),
    });
  }
};
