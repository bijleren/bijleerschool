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
  source: 'google_books' | 'open_library' | 'easycb' | 'manual';
}

export async function fetchBookMetadata(isbn: string): Promise<BookMetadata | null> {
  const cleanIsbn = isbn.replace(/[^0-9X]/gi, '');

  try {
    const result = await fetchFromGoogleBooks(cleanIsbn);
    if (result) return result;
  } catch {
    console.log('Google Books failed, trying Open Library');
  }

  try {
    const result = await fetchFromOpenLibrary(cleanIsbn);
    if (result) return result;
  } catch {
    console.log('Open Library failed, trying EasyCB');
  }

  try {
    const result = await fetchFromEasyCB(cleanIsbn);
    if (result) return result;
  } catch {
    console.log('EasyCB failed');
  }

  return null;
}

async function fetchFromGoogleBooks(isbn: string): Promise<BookMetadata | null> {
  // No langRestrict — Dutch ISBNs can be indexed under any language code in Google's DB
  const response = await fetch(
    `https://www.googleapis.com/books/v1/volumes?q=isbn:${isbn}`
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

  const coverUrl = book.imageLinks?.thumbnail || book.imageLinks?.smallThumbnail;
  const highResCover = coverUrl
    ? coverUrl.replace('http:', 'https:').replace('&zoom=1', '&zoom=2').replace('&edge=curl', '')
    : undefined;

  return {
    isbn,
    isbn_13: isbn13,
    isbn_10: isbn10,
    title: book.title || 'Unknown',
    author: book.authors?.join(', '),
    publisher: book.publisher,
    publishedDate: book.publishedDate,
    pageCount: book.pageCount,
    description: book.description,
    coverImageUrl: highResCover,
    language: book.language,
    categories: book.categories,
    source: 'google_books',
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
    isbn,
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
    source: 'open_library',
  };
}

// EasyCB: free API for Dutch/Belgian books (Centraal Boekhuis / TitelBank)
// Response is plain text key:value pairs. Cover images can't be hotlinked so we skip them.
async function fetchFromEasyCB(isbn: string): Promise<BookMetadata | null> {
  const response = await fetch(`https://easycbapi.nl/isbn/${isbn}`, {
    headers: { contact: 'boeker@bijleer.be' },
  });

  if (!response.ok) throw new Error('EasyCB API failed');

  const text = await response.text();
  if (!text.trim() || text.trim() === `isbn:${isbn}`) return null;

  const fields: Record<string, string> = {};
  for (const line of text.split('\n')) {
    const colon = line.indexOf(':');
    if (colon === -1) continue;
    const key = line.slice(0, colon).trim();
    const value = line.slice(colon + 1).trim();
    if (key && value) fields[key] = value;
  }

  const title = fields['title'];
  if (!title) return null;

  const pageCount = fields['DescriptiveDetail.Extent.ExtentValue']
    ? parseInt(fields['DescriptiveDetail.Extent.ExtentValue'], 10)
    : undefined;

  // Description may appear in TextContent blocks; grab the first non-empty one
  const description = Object.entries(fields)
    .find(([k]) => k.includes('TextContent.Text'))?.[1];

  // Language code is ISO 639-2/B (e.g. "dut" for Dutch), convert to 639-1 where possible
  const langRaw = fields['DescriptiveDetail.Language.LanguageCode'];
  const langMap: Record<string, string> = { dut: 'nl', fre: 'fr', ger: 'de', eng: 'en' };
  const language = langRaw ? (langMap[langRaw] ?? langRaw) : undefined;

  return {
    isbn,
    isbn_13: isbn.length === 13 ? isbn : undefined,
    isbn_10: isbn.length === 10 ? isbn : undefined,
    title,
    author: fields['author'],
    publisher: undefined,
    publishedDate: undefined,
    pageCount: isNaN(pageCount!) ? undefined : pageCount,
    description,
    coverImageUrl: undefined, // EasyCB covers can't be hotlinked
    language,
    categories: undefined,
    source: 'easycb',
  };
}
