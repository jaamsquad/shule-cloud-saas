export interface Book {
  id: string;
  accessionNumber: string;
  isbn: string;
  title: string;
  author: string;
  publisher: string;
  category: string;
  shelfNumber: string;
  copiesTotal: number;
  copiesAvailable: number;
  status: 'Available' | 'Low Stock' | 'Out of Stock';
  totalBorrowed?: number;
  coverUrl?: string;
}

export interface Borrower {
  id: string;
  name: string;
  admissionNumber?: string;
  type: 'Student' | 'Staff';
  contact: string;
  booksIssued: number;
  finesTotal: number;
}

export interface IssueRecord {
  id: string;
  bookId: string;
  borrowerId: string;
  issueDate: string;
  dueDate: string;
  returnDate?: string;
  status: 'Issued' | 'Returned' | 'Overdue';
  fineAmount: number;
}

export interface Fine {
  id: string;
  issueId: string;
  borrowerId: string;
  amount: number;
  reason: string;
  status: 'Paid' | 'Unpaid';
  date: string;
}

export interface Category {
  id: string;
  name: string;
  description: string;
  bookCount: number;
}

export interface Author {
  id: string;
  name: string;
  bookCount: number;
}

export interface Reservation {
  id: string;
  bookId: string;
  borrowerId: string;
  reservationDate: string;
  expiryDate: string;
  status: 'Pending' | 'Ready for pickup' | 'Expired' | 'Completed' | 'Cancelled';
}
