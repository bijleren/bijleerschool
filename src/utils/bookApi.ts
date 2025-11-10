export interface BookMetadata {
  isbn: string;
  isbn_13?: string;
  isbn_10?: string;
  title: string;
  author?: string;
  publisher?: string;
  publishedDate?: string;
  pageCount?: number;
  description?: string;
  coverImageUrl?: string;
  language?: string;
  categories?: string[];
  source: 'google_books' | 'open_library' | 'manual';
}

export async function fetchBookMetadata(isbn: string): Promise<BookMetadata | null> {
  const cleanIsbn = isbn.replace(/[^0-9X]/gi, '');

  try {
    const googleResult = await fetchFromGoogleBooks(cleanIsbn);
    if (googleResult) return googleResult;
  } catch (error) {
    console.log('Google Books failed, trying Open Library');
  }

  try {
    const openLibraryResult = await fetchFromOpenLibrary(cleanIsbn);
    if (openLibraryResult) return openLibraryResult;
  } catch (error) {
    console.log('Open Library failed');
  }

  return null;
}

async function fetchFromGoogleBooks(isbn: string): Promise<BookMetadata | null> {
  const response = await fetch(
    `https://www.googleapis.com/books/v1/volumes?q=isbn:${isbn}&langRestrict=nl`
  );

  if (!response.ok) throw new Error('Google Books API failed');

  const data = await response.json();

  if (!data.items || data.items.length === 0) {
    return null;
  }

  const book = data.items[0].volumeInfo;
  const industryIdentifiers = book.industryIdentifiers || [];

  const isbn13 = industryIdentifiers.find((id: any) => id.type === 'ISBN_13')?.identifier;
  const isbn10 = industryIdentifiers.find((id: any) => id.type === 'ISBN_10')?.identifier;

  return {
    isbn: isbn,
    isbn_13: isbn13,
    isbn_10: isbn10,
    title: book.title || 'Unknown',
    author: book.authors?.join(', '),
    publisher: book.publisher,
    publishedDate: book.publishedDate,
    pageCount: book.pageCount,
    description: book.description,
    coverImageUrl: book.imageLinks?.thumbnail?.replace('http:', 'https:'),
    language: book.language,
    categories: book.categories,
    source: 'google_books'
  };
}

async function fetchFromOpenLibrary(isbn: string): Promise<BookMetadata | null> {
  const response = await fetch(
    `https://openlibrary.org/api/books?bibkeys=ISBN:${isbn}&format=json&jscmd=data`
  );

  if (!response.ok) throw new Error('Open Library API failed');

  const data = await response.json();
  const bookKey = `ISBN:${isbn}`;

  if (!data[bookKey]) {
    return null;
  }

  const book = data[bookKey];

  return {
    isbn: isbn,
    isbn_13: isbn.length === 13 ? isbn : undefined,
    isbn_10: isbn.length === 10 ? isbn : undefined,
    title: book.title || 'Unknown',
    author: book.authors?.map((a: any) => a.name).join(', '),
    publisher: book.publishers?.map((p: any) => p.name).join(', '),
    publishedDate: book.publish_date,
    pageCount: book.number_of_pages,
    description: book.notes || book.subtitle,
    coverImageUrl: book.cover?.medium || book.cover?.large,
    language: undefined,
    categories: book.subjects?.map((s: any) => s.name),
    source: 'open_library'
  };
}
