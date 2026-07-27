import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { trackFileUpload } from '../../utils/storageTracking';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { Input } from '../ui/Input';
import { Toast } from '../ui/Toast';
import { BarcodeScanner } from './BarcodeScanner';
import { QuickScanModal } from './QuickScanModal';
import { fetchBookMetadata, BookMetadata } from '../../utils/bookApi';
import { Plus, Search, Pencil, Trash2, Camera, BookOpen, Users, X, Scan, Star, MessageSquare, MapPin, SlidersHorizontal, ArrowUpDown, ExternalLink, Download, Tag } from 'lucide-react';
import * as XLSX from 'xlsx';
import { LocationCombobox } from './LocationCombobox';
import { ImageCropper } from '../ui/ImageCropper';

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ#'.split('');

type SortField = 'title' | 'author' | 'available_copies' | 'total_copies' | 'created_at' | 'popularity' | 'recent_activity';
type SortDir = 'asc' | 'desc';
type AvailFilter = 'all' | 'available' | 'unavailable';

const COMPUTED_SORTS: SortField[] = ['popularity', 'recent_activity'];

const SORT_LABELS: Record<SortField, string> = {
  title: 'Titel',
  author: 'Auteur',
  available_copies: 'Beschikbaar',
  total_copies: 'Exemplaren',
  created_at: 'Toegevoegd',
  popularity: 'Populairste',
  recent_activity: 'Laatste activiteit',
};

interface Book {
  id: string;
  isbn: string;
  title: string;
  author: string | null;
  cover_image_url: string | null;
  custom_cover_url: string | null;
  page_count: number | null;
  total_copies: number;
  available_copies: number;
  metadata_source: string;
  location_id: string | null;
  book_locations?: { name: string } | null;
}

interface StudentBookInfo {
  id: string;
  borrowed_at: string;
  students: {
    id: string;
    first_name: string;
    last_name: string;
  };
  current_page: number | null;
  total_pages_read: number;
}

interface BookReview {
  id: string;
  rating: number;
  review_text: string | null;
  created_at: string;
  students: {
    id: string;
    first_name: string;
    last_name: string;
  };
}

interface BookTag {
  id: string;
  name: string;
  color: string;
}

interface BookLibraryProps {
  schoolId: string;
  onViewStudent?: (studentId: string) => void;
}

export function BookLibrary({ schoolId, onViewStudent }: BookLibraryProps) {
  const { user } = useAuth();
  const [books, setBooks] = useState<Book[]>([]);
  const [searchResults, setSearchResults] = useState<Book[] | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showQuickScan, setShowQuickScan] = useState(false);
  const [editingBook, setEditingBook] = useState<Book | null>(null);
  const [viewingBook, setViewingBook] = useState<Book | null>(null);
  const [duplicateBook, setDuplicateBook] = useState<Book | null>(null);
  const [addingDuplicateCopies, setAddingDuplicateCopies] = useState(false);
  const [currentBorrowers, setCurrentBorrowers] = useState<StudentBookInfo[]>([]);
  const [bookReviews, setBookReviews] = useState<BookReview[]>([]);
  const [fetchingMetadata, setFetchingMetadata] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [customCoverFile, setCustomCoverFile] = useState<File | null>(null);
  const [customCoverPreview, setCustomCoverPreview] = useState<string | null>(null);
  const [useCustomCover, setUseCustomCover] = useState(false);
  const [cropperFile, setCropperFile] = useState<File | null>(null);

  // Letter index
  const [availableLetters, setAvailableLetters] = useState<Set<string>>(new Set());
  const [activeLetter, setActiveLetter] = useState<string>('A');
  const [indexLoaded, setIndexLoaded] = useState(false);

  // View mode: 'recent' shows 20 newest, 'browse' shows letter-indexed + filters
  const [viewMode, setViewMode] = useState<'recent' | 'browse'>('recent');

  // Filters & sorting
  const [sortField, setSortField] = useState<SortField>('title');
  const [sortDir, setSortDir] = useState<SortDir>('asc');
  const [availFilter, setAvailFilter] = useState<AvailFilter>('all');
  const [showFilters, setShowFilters] = useState(false);

  // Tags
  const [allTags, setAllTags] = useState<BookTag[]>([]);
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  const [bookTagMap, setBookTagMap] = useState<Record<string, string[]>>({});
  const [editBookTagIds, setEditBookTagIds] = useState<string[]>([]);

  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [formData, setFormData] = useState({
    isbn: '',
    title: '',
    author: '',
    publisher: '',
    published_date: '',
    page_count: '',
    description: '',
    cover_image_url: '',
    custom_cover_url: '',
    language: '',
    total_copies: '1',
    location_id: null as string | null
  });

  useEffect(() => {
    fetchRecentBooks();
    fetchLetterIndex();
    fetchTags();
  }, [schoolId]);

  // Once index loads, set first available letter (but don't fetch yet — we start in recent mode)
  useEffect(() => {
    if (indexLoaded && availableLetters.size > 0) {
      const first = ALPHABET.find(l => availableLetters.has(l)) || 'A';
      setActiveLetter(first);
    }
  }, [indexLoaded]);

  // Re-fetch when sort/filter/viewMode changes (but not on initial mount)
  const isFirstRun = useRef(true);
  useEffect(() => {
    if (isFirstRun.current) { isFirstRun.current = false; return; }
    if (searchResults !== null) {
      runSearch(searchQuery, sortField, sortDir, availFilter);
    } else if (viewMode === 'browse') {
      fetchBooksByLetter(activeLetter, sortField, sortDir, availFilter);
    }
  }, [sortField, sortDir, availFilter, viewMode]);

  const fetchLetterIndex = async () => {
    try {
      const { data, error } = await supabase
        .from('books')
        .select('title')
        .eq('school_id', schoolId);
      if (error) throw error;
      const letters = new Set<string>();
      (data || []).forEach(b => {
        const ch = b.title.charAt(0).toUpperCase();
        letters.add(/[A-Z]/.test(ch) ? ch : '#');
      });
      setAvailableLetters(letters);
      setIndexLoaded(true);
    } catch (err) {
      console.error('Error fetching letter index:', err);
    }
  };

  const fetchTags = async () => {
    try {
      const { data, error } = await supabase
        .from('book_tag_definitions')
        .select('id, name, color')
        .eq('school_id', schoolId)
        .order('name');
      if (error) throw error;
      setAllTags(data || []);
    } catch {
      // non-critical
    }
  };

  const fetchBookTagMap = async (bookIds: string[]) => {
    if (bookIds.length === 0) return;
    try {
      const { data, error } = await supabase
        .from('book_tag_assignments')
        .select('book_id, tag_id')
        .in('book_id', bookIds);
      if (error) throw error;
      const map: Record<string, string[]> = {};
      (data || []).forEach((a: { book_id: string; tag_id: string }) => {
        if (!map[a.book_id]) map[a.book_id] = [];
        map[a.book_id].push(a.tag_id);
      });
      setBookTagMap(map);
    } catch {
      // non-critical
    }
  };

  const fetchRecentBooks = async () => {
    setLoading(true);
    setSearchResults(null);
    try {
      const { data, error } = await supabase
        .from('books')
        .select('*, book_locations(name)')
        .eq('school_id', schoolId)
        .order('created_at', { ascending: false })
        .limit(20);
      if (error) throw error;
      setBooks(data || []);
      await fetchBookTagMap((data || []).map((b: Book) => b.id));
    } catch (err) {
      console.error('Error fetching recent books:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchBooksByLetter = async (letter: string, sf: SortField, sd: SortDir, af: AvailFilter) => {
    setLoading(true);
    setSearchResults(null);
    setSearchQuery('');
    try {
      let data: any[] | null = null;
      let error: any = null;

      if (sf === 'popularity') {
        ({ data, error } = await supabase.rpc('get_books_by_popularity', {
          p_school_id: schoolId, p_letter: null, p_avail_filter: af
        }));
      } else if (sf === 'recent_activity') {
        ({ data, error } = await supabase.rpc('get_books_by_recent_activity', {
          p_school_id: schoolId, p_letter: null, p_avail_filter: af
        }));
      } else {
        let q = supabase
          .from('books')
          .select('*, book_locations(name)')
          .eq('school_id', schoolId)
          .order(sf, { ascending: sd === 'asc' });

        if (letter === '#') {
          for (const l of 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('')) q = q.not('title', 'ilike', `${l}%`);
        } else {
          q = q.ilike('title', `${letter}%`);
        }
        if (af === 'available') q = q.gt('available_copies', 0);
        if (af === 'unavailable') q = q.eq('available_copies', 0);
        ({ data, error } = await q);
      }

      if (error) throw error;
      setBooks(data || []);
      await fetchBookTagMap((data || []).map((b: Book) => b.id));
    } catch (err) {
      console.error('Error fetching books:', err);
      setToast({ message: 'Fout bij ophalen boeken', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const runSearch = async (q: string, sf: SortField, sd: SortDir, af: AvailFilter) => {
    if (!q.trim()) { setSearchResults(null); return; }
    setSearchLoading(true);
    try {
      // For computed sorts during search, fetch all matches then sort client-side
      if (COMPUTED_SORTS.includes(sf)) {
        let query = supabase
          .from('books')
          .select('*, book_locations(name)')
          .eq('school_id', schoolId)
          .or(`title.ilike.%${q}%,author.ilike.%${q}%,isbn.ilike.%${q}%`)
          .order('title', { ascending: true })
          .limit(100);
        if (af === 'available') query = query.gt('available_copies', 0);
        if (af === 'unavailable') query = query.eq('available_copies', 0);
        const { data, error } = await query;
        if (error) throw error;
        setSearchResults(data || []);
        await fetchBookTagMap((data || []).map((b: Book) => b.id));
      } else {
        let query = supabase
          .from('books')
          .select('*, book_locations(name)')
          .eq('school_id', schoolId)
          .or(`title.ilike.%${q}%,author.ilike.%${q}%,isbn.ilike.%${q}%`)
          .order(sf, { ascending: sd === 'asc' })
          .limit(100);
        if (af === 'available') query = query.gt('available_copies', 0);
        if (af === 'unavailable') query = query.eq('available_copies', 0);
        const { data, error } = await query;
        if (error) throw error;
        setSearchResults(data || []);
        await fetchBookTagMap((data || []).map((b: Book) => b.id));
      }
    } catch (err) {
      console.error('Error searching books:', err);
    } finally {
      setSearchLoading(false);
    }
  };

  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    if (!value.trim()) { setSearchResults(null); return; }
    searchTimeoutRef.current = setTimeout(() => {
      runSearch(value, sortField, sortDir, availFilter);
    }, 300);
  };

  const handleLetterClick = (letter: string) => {
    if (!availableLetters.has(letter)) return;
    setActiveLetter(letter);
    setViewMode('browse');
    fetchBooksByLetter(letter, sortField, sortDir, availFilter);
  };

  const switchToBrowse = () => {
    if (viewMode !== 'browse') setViewMode('browse');
  };

  const toggleSort = (field: SortField) => {
    switchToBrowse();
    if (sortField === field) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDir('asc');
    }
  };

  const handleOpenFilters = () => {
    setShowFilters(f => {
      if (!f) switchToBrowse();
      return !f;
    });
  };

  const isComputedSort = COMPUTED_SORTS.includes(sortField);
  const activeFilterCount = (availFilter !== 'all' ? 1 : 0) + (sortField !== 'title' ? 1 : 0) + (selectedTagIds.length > 0 ? 1 : 0);

  const fetchBooks = () => {
    if (viewMode === 'recent') {
      fetchRecentBooks();
    } else {
      fetchBooksByLetter(activeLetter, sortField, sortDir, availFilter);
    }
    fetchLetterIndex();
  };

  const handleCustomCoverChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setCropperFile(e.target.files[0]);
      // Reset input so the same file can be re-selected after cancelling crop
      e.target.value = '';
    }
  };

  const handleCropComplete = (croppedFile: File) => {
    setCustomCoverFile(croppedFile);
    setCustomCoverPreview(URL.createObjectURL(croppedFile));
    setUseCustomCover(true);
    setCropperFile(null);
  };

  const uploadCustomCover = async (file: File): Promise<string | null> => {
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const filePath = `${schoolId}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('book-covers')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      if (user) {
        await trackFileUpload(
          schoolId,
          'book_cover',
          `book-covers/${filePath}`,
          file.size,
          user.id
        );
      }

      const { data } = supabase.storage
        .from('book-covers')
        .getPublicUrl(filePath);

      return data.publicUrl;
    } catch (error) {
      console.error('Error uploading cover:', error);
      return null;
    }
  };

  const handleIsbnLookupInForm = async (isbn: string) => {
    if (!isbn || fetchingMetadata) return;
    setFetchingMetadata(true);
    setToast({ message: 'Boekgegevens ophalen...', type: 'info' });
    try {
      const metadata = await fetchBookMetadata(isbn);
      if (metadata) {
        setFormData(prev => ({
          ...prev,
          isbn,
          title: metadata.title,
          author: metadata.author || '',
          publisher: metadata.publisher || '',
          published_date: metadata.publishedDate || '',
          page_count: metadata.pageCount?.toString() || '',
          description: metadata.description || '',
          cover_image_url: metadata.coverImageUrl || '',
          language: metadata.language || '',
        }));
        setToast({ message: 'Boekgegevens gevonden!', type: 'success' });
      } else {
        setToast({ message: 'Geen gegevens gevonden. Voer handmatig in.', type: 'info' });
      }
    } catch {
      setToast({ message: 'Fout bij ophalen gegevens', type: 'error' });
    } finally {
      setFetchingMetadata(false);
    }
  };

  const handleIsbnScan = async (isbn: string) => {
    setFetchingMetadata(true);
    setToast({ message: 'Boekgegevens ophalen...', type: 'info' });

    try {
      // Check if this ISBN already exists in the library
      const { data: existing } = await supabase
        .from('books')
        .select('*, book_locations(name)')
        .eq('school_id', schoolId)
        .eq('isbn', isbn)
        .maybeSingle();

      if (existing) {
        setFetchingMetadata(false);
        setToast(null);
        await handleViewBook(existing);
        setDuplicateBook(existing);
        return;
      }

      const metadata = await fetchBookMetadata(isbn);

      if (metadata) {
        setFormData({
          isbn: metadata.isbn,
          title: metadata.title,
          author: metadata.author || '',
          publisher: metadata.publisher || '',
          published_date: metadata.publishedDate || '',
          page_count: metadata.pageCount?.toString() || '',
          description: metadata.description || '',
          cover_image_url: metadata.coverImageUrl || '',
          language: metadata.language || '',
          total_copies: '1',
          location_id: null
        });
        setToast({ message: 'Boekgegevens gevonden!', type: 'success' });
        setShowAddModal(true);
      } else {
        setFormData({ ...formData, isbn });
        setToast({ message: 'Geen gegevens gevonden. Voer handmatig in.', type: 'info' });
        setShowAddModal(true);
      }
    } catch (error) {
      console.error('Error fetching metadata:', error);
      setFormData({ ...formData, isbn });
      setToast({ message: 'Fout bij ophalen gegevens', type: 'error' });
      setShowAddModal(true);
    } finally {
      setFetchingMetadata(false);
    }
  };

  const handleAddDuplicateCopy = async () => {
    if (!duplicateBook) return;
    setAddingDuplicateCopies(true);
    try {
      const newTotal = duplicateBook.total_copies + 1;
      const newAvailable = duplicateBook.available_copies + 1;
      const { error } = await supabase
        .from('books')
        .update({ total_copies: newTotal, available_copies: newAvailable })
        .eq('id', duplicateBook.id);
      if (error) throw error;
      setDuplicateBook(null);
      setViewingBook(prev => prev ? { ...prev, total_copies: newTotal, available_copies: newAvailable } : null);
      setToast({ message: `Exemplaar toegevoegd. Nu ${newTotal} exemplaren in totaal.`, type: 'success' });
      fetchRecentBooks();
    } catch (err) {
      setToast({ message: 'Fout bij toevoegen exemplaar', type: 'error' });
    } finally {
      setAddingDuplicateCopies(false);
    }
  };

  const handleSaveBook = async () => {
    if (!formData.isbn || !formData.title) {
      setToast({ message: 'ISBN en titel zijn verplicht', type: 'error' });
      return;
    }

    try {
      let customCoverUrl = formData.custom_cover_url || null;

      if (useCustomCover && customCoverFile) {
        const uploadedUrl = await uploadCustomCover(customCoverFile);
        if (uploadedUrl) {
          customCoverUrl = uploadedUrl;
        }
      }

      const totalCopies = parseInt(formData.total_copies) || 1;

      if (editingBook && totalCopies < editingBook.total_copies) {
        const copiesOut = editingBook.total_copies - editingBook.available_copies;

        if (totalCopies < copiesOut) {
          const { data: activeLoans, error: loansError } = await supabase
            .from('book_loans')
            .select(`
              id,
              student:students(first_name, last_name)
            `)
            .eq('book_id', editingBook.id)
            .is('returned_at', null);

          if (loansError) throw loansError;

          const borrowerNames = activeLoans?.map((loan: any) =>
            `${loan.student.first_name} ${loan.student.last_name}`
          ).join(', ') || '';

          setToast({
            message: `Kan aantal niet verlagen. ${copiesOut} ${copiesOut === 1 ? 'exemplaar is' : 'exemplaren zijn'} uitgeleend aan: ${borrowerNames}. Vraag deze eerst terug.`,
            type: 'error'
          });
          return;
        }
      }

      const bookData = {
        school_id: schoolId,
        isbn: formData.isbn,
        title: formData.title,
        author: formData.author || null,
        publisher: formData.publisher || null,
        published_date: formData.published_date || null,
        page_count: formData.page_count ? parseInt(formData.page_count) : null,
        description: formData.description || null,
        cover_image_url: formData.cover_image_url || null,
        custom_cover_url: customCoverUrl,
        language: formData.language || null,
        total_copies: totalCopies,
        available_copies: editingBook
          ? Math.max(0, editingBook.available_copies + (totalCopies - editingBook.total_copies))
          : totalCopies,
        added_by: user?.id,
        location_id: formData.location_id || null
      };

      let savedBookId: string;

      if (editingBook) {
        const { error } = await supabase
          .from('books')
          .update(bookData)
          .eq('id', editingBook.id);

        if (error) throw error;
        savedBookId = editingBook.id;
        setToast({ message: 'Boek bijgewerkt', type: 'success' });
      } else {
        const { data: inserted, error } = await supabase
          .from('books')
          .insert(bookData)
          .select('id')
          .single();

        if (error) throw error;
        savedBookId = inserted.id;
        setToast({ message: 'Boek toegevoegd', type: 'success' });
      }

      // Sync tag assignments
      await supabase
        .from('book_tag_assignments')
        .delete()
        .eq('book_id', savedBookId);

      if (editBookTagIds.length > 0) {
        await supabase
          .from('book_tag_assignments')
          .insert(editBookTagIds.map(tagId => ({
            book_id: savedBookId,
            tag_id: tagId,
            school_id: schoolId,
          })));
      }

      setShowAddModal(false);
      setEditingBook(null);
      resetForm();
      fetchBooks();
    } catch (error: any) {
      console.error('Error saving book:', error);
      if (error.code === '23505') {
        setToast({ message: 'Dit boek bestaat al in de bibliotheek', type: 'error' });
      } else {
        setToast({ message: 'Fout bij opslaan boek', type: 'error' });
      }
    }
  };

  const handleDeleteBook = async (bookId: string) => {
    if (!confirm('Weet je zeker dat je dit boek wilt verwijderen?')) return;

    try {
      const { error } = await supabase
        .from('books')
        .delete()
        .eq('id', bookId);

      if (error) throw error;
      setToast({ message: 'Boek verwijderd', type: 'success' });
      fetchBooks();
    } catch (error) {
      console.error('Error deleting book:', error);
      setToast({ message: 'Fout bij verwijderen boek', type: 'error' });
    }
  };

  const handleEditBook = (book: Book) => {
    setEditingBook(book);
    setFormData({
      isbn: book.isbn,
      title: book.title,
      author: book.author || '',
      publisher: '',
      published_date: '',
      page_count: book.page_count?.toString() || '',
      description: '',
      cover_image_url: book.cover_image_url || '',
      custom_cover_url: book.custom_cover_url || '',
      language: '',
      total_copies: book.total_copies.toString(),
      location_id: book.location_id || null
    });
    setCustomCoverFile(null);
    setCustomCoverPreview(book.custom_cover_url || null);
    setUseCustomCover(!!book.custom_cover_url);
    setEditBookTagIds(bookTagMap[book.id] || []);
    setShowAddModal(true);
  };

  const resetForm = () => {
    setFormData({
      isbn: '',
      title: '',
      author: '',
      publisher: '',
      published_date: '',
      page_count: '',
      description: '',
      cover_image_url: '',
      custom_cover_url: '',
      language: '',
      total_copies: '1',
      location_id: null
    });
    setEditingBook(null);
    setCustomCoverFile(null);
    setCustomCoverPreview(null);
    setUseCustomCover(false);
    setEditBookTagIds([]);
  };

  const handleViewBook = async (book: Book) => {
    setViewingBook(book);

    try {
      const { data: studentBooks, error } = await supabase
        .from('student_books')
        .select(`
          id,
          borrowed_at,
          students (
            id,
            first_name,
            last_name
          )
        `)
        .eq('book_id', book.id)
        .eq('status', 'current')
        .order('borrowed_at', { ascending: false });

      if (error) throw error;

      const borrowersWithProgress = await Promise.all(
        (studentBooks || []).map(async (sb: any) => {
          const { data: sessions } = await supabase
            .from('reading_sessions')
            .select('end_page, pages_read')
            .eq('student_book_id', sb.id)
            .order('start_time', { ascending: false });

          const latestSession = sessions?.[0];
          const totalPagesRead = sessions?.reduce((sum, s) => sum + (s.pages_read || 0), 0) || 0;

          return {
            id: sb.id,
            borrowed_at: sb.borrowed_at,
            students: sb.students,
            current_page: latestSession?.end_page || null,
            total_pages_read: totalPagesRead
          };
        })
      );

      setCurrentBorrowers(borrowersWithProgress);

      const actualBorrowedCount = studentBooks?.length || 0;
      const expectedAvailable = book.total_copies - actualBorrowedCount;

      if (book.available_copies !== expectedAvailable) {
        console.warn('Data inconsistency detected:', {
          bookId: book.id,
          storedAvailable: book.available_copies,
          actualAvailable: expectedAvailable,
          totalCopies: book.total_copies,
          borrowedCount: actualBorrowedCount
        });
      }

      const { data: reviews, error: reviewsError } = await supabase
        .from('book_reviews')
        .select(`
          id,
          rating,
          review_text,
          created_at,
          students (
            id,
            first_name,
            last_name
          )
        `)
        .eq('book_id', book.id)
        .order('created_at', { ascending: false });

      if (reviewsError) throw reviewsError;
      setBookReviews(reviews || []);

    } catch (error) {
      console.error('Error fetching borrowers:', error);
      setToast({ message: 'Fout bij ophalen leners', type: 'error' });
    }
  };

  const handleSyncAvailability = async (book: Book, actualBorrowedCount: number) => {
    try {
      const correctAvailable = book.total_copies - actualBorrowedCount;

      const { error } = await supabase
        .from('books')
        .update({ available_copies: correctAvailable })
        .eq('id', book.id);

      if (error) throw error;

      setToast({ message: 'Beschikbaarheid gesynchroniseerd', type: 'success' });

      const { data: updatedBook } = await supabase
        .from('books')
        .select('*')
        .eq('id', book.id)
        .single();

      if (updatedBook) {
        const { data: updatedWithLocation } = await supabase
          .from('books')
          .select('*, book_locations(name)')
          .eq('id', book.id)
          .single();
        setViewingBook(updatedWithLocation || updatedBook);
      }

      fetchBooks();
    } catch (error) {
      console.error('Error syncing availability:', error);
      setToast({ message: 'Fout bij synchroniseren', type: 'error' });
    }
  };

  const handleDeleteReview = async (reviewId: string) => {
    if (!confirm('Weet je zeker dat je deze recensie wilt verwijderen?')) return;

    try {
      const { error } = await supabase
        .from('book_reviews')
        .delete()
        .eq('id', reviewId);

      if (error) throw error;

      setToast({ message: 'Recensie verwijderd', type: 'success' });
      setBookReviews(bookReviews.filter(review => review.id !== reviewId));
    } catch (error) {
      console.error('Error deleting review:', error);
      setToast({ message: 'Fout bij verwijderen recensie', type: 'error' });
    }
  };

  const rawBooks = searchResults !== null ? searchResults : books;
  const displayedBooks = selectedTagIds.length > 0
    ? rawBooks.filter(b => selectedTagIds.some(tid => (bookTagMap[b.id] || []).includes(tid)))
    : rawBooks;

  const exportToExcel = () => {
    const rows = displayedBooks.map(b => ({
      Titel: b.title,
      Auteur: b.author ?? '',
      ISBN: b.isbn,
      Paginas: b.page_count ?? '',
      Locatie: b.book_locations?.name ?? '',
      'Totaal exemplaren': b.total_copies,
      'Beschikbare exemplaren': b.available_copies,
      'Uitgeleend': b.total_copies - b.available_copies,
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Boeken');
    XLSX.writeFile(wb, `boeken_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  return (
    <div className="space-y-6">
      <Card>
        <div className="p-6">
          {/* Toolbar row 1: search + actions */}
          <div className="flex items-center gap-3 mb-3 flex-wrap">
            <div className="relative flex-1 min-w-[200px] max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Zoek op titel, auteur of ISBN..."
                value={searchQuery}
                onChange={(e) => handleSearchChange(e.target.value)}
                className="w-full pl-9 pr-8 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
              />
              {searchLoading && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  <div className="animate-spin rounded-full h-3.5 w-3.5 border-b-2 border-#946B29" />
                </div>
              )}
            </div>

            {/* Filter toggle — also switches to browse mode */}
            <button
              onClick={handleOpenFilters}
              className={`flex items-center gap-1.5 px-3 py-2 text-sm rounded-lg border transition-colors ${
                showFilters || activeFilterCount > 0 || viewMode === 'browse'
                  ? 'bg-amber-50 border-amber-300 text-#74531F'
                  : 'border-gray-300 text-gray-700 hover:bg-gray-50'
              }`}
            >
              <SlidersHorizontal className="w-4 h-4" />
              {viewMode === 'recent' && activeFilterCount === 0 ? 'Bladeren' : 'Filters'}
              {activeFilterCount > 0 && (
                <span className="ml-0.5 bg-#946B29 text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
                  {activeFilterCount}
                </span>
              )}
            </button>

            {/* Sort quick-toggle (only relevant in browse mode) */}
            {viewMode === 'browse' && (
              <button
                onClick={() => !isComputedSort && setSortDir(d => d === 'asc' ? 'desc' : 'asc')}
                className="flex items-center gap-1.5 px-3 py-2 text-sm rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors"
              >
                <ArrowUpDown className="w-4 h-4" />
                {SORT_LABELS[sortField]}
                {!isComputedSort && (
                  <span className="text-gray-400 text-xs">{sortDir === 'asc' ? '↑' : '↓'}</span>
                )}
              </button>
            )}

            <div className="flex gap-2 ml-auto">
              <Button variant="secondary" onClick={exportToExcel} disabled={displayedBooks.length === 0} className="text-sm py-2">
                <Download className="w-4 h-4 mr-1.5" />
                Exporteren
              </Button>
              <Button onClick={() => setShowQuickScan(true)} className="bg-green-600 hover:bg-green-700 text-sm py-2">
                <Scan className="w-4 h-4 mr-1.5" />
                Quick Scan
              </Button>
              <Button onClick={() => setShowScanner(true)} className="text-sm py-2">
                <Camera className="w-4 h-4 mr-1.5" />
                Scan ISBN
              </Button>
              <Button variant="secondary" className="text-sm py-2" onClick={() => { resetForm(); setEditingBook(null); setShowAddModal(true); }}>
                <Plus className="w-4 h-4 mr-1.5" />
                Handmatig Toevoegen
              </Button>
            </div>
          </div>

          {/* Filter panel */}
          {showFilters && (
            <div className="flex flex-wrap gap-4 mb-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
              {/* Availability */}
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Beschikbaarheid</p>
                <div className="flex gap-1.5">
                  {([['all', 'Alle'], ['available', 'Beschikbaar'], ['unavailable', 'Uitgeleend']] as [AvailFilter, string][]).map(([val, label]) => (
                    <button
                      key={val}
                      onClick={() => { switchToBrowse(); setAvailFilter(val); }}
                      className={`px-3 py-1.5 text-xs rounded-full border font-medium transition-colors ${
                        availFilter === val
                          ? 'bg-#946B29 border-#946B29 text-white'
                          : 'border-gray-300 text-gray-600 hover:border-amber-500 hover:text-#946B29'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Tags */}
              {allTags.length > 0 && (
                <div className="w-full">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Tags</p>
                  <div className="flex flex-wrap gap-1.5">
                    {allTags.map((tag) => {
                      const isActive = selectedTagIds.includes(tag.id);
                      return (
                        <button
                          key={tag.id}
                          onClick={() => setSelectedTagIds(prev =>
                            isActive ? prev.filter(id => id !== tag.id) : [...prev, tag.id]
                          )}
                          className="px-3 py-1.5 text-xs rounded-full border font-medium transition-colors"
                          style={isActive
                            ? { backgroundColor: tag.color, borderColor: tag.color, color: '#fff' }
                            : { borderColor: '#D1D5DB', color: '#4B5563' }
                          }
                        >
                          {tag.name}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Sort by */}
              <div className="w-full">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Sorteren op</p>
                <div className="flex flex-wrap gap-1.5">
                  {(Object.entries(SORT_LABELS) as [SortField, string][]).map(([val, label]) => {
                    const isComputed = COMPUTED_SORTS.includes(val);
                    const isActive = sortField === val;
                    return (
                      <button
                        key={val}
                        onClick={() => toggleSort(val)}
                        className={`px-3 py-1.5 text-xs rounded-full border font-medium transition-colors flex items-center gap-1 ${
                          isActive
                            ? 'bg-#946B29 border-#946B29 text-white'
                            : 'border-gray-300 text-gray-600 hover:border-amber-500 hover:text-#946B29'
                        }`}
                      >
                        {label}
                        {isActive && !isComputed && <span>{sortDir === 'asc' ? '↑' : '↓'}</span>}
                      </button>
                    );
                  })}
                </div>
              </div>

              {activeFilterCount > 0 && (
                <button
                  onClick={() => { setAvailFilter('all'); setSelectedTagIds([]); }}
                  className="ml-auto self-end text-xs text-gray-500 hover:text-red-500 transition-colors flex items-center gap-1"
                >
                  <X className="w-3.5 h-3.5" />
                  Filters wissen
                </button>
              )}
            </div>
          )}

          {/* Alphabet index bar — only in browse mode, not during search or computed sort */}
          {searchResults === null && viewMode === 'browse' && !isComputedSort && availableLetters.size > 0 && (
            <div className="flex flex-wrap gap-1 mb-4">
              {ALPHABET.map(letter => {
                const has = availableLetters.has(letter);
                return (
                  <button
                    key={letter}
                    onClick={() => handleLetterClick(letter)}
                    disabled={!has}
                    className={`w-8 h-8 text-sm font-semibold rounded transition-colors ${
                      activeLetter === letter
                        ? 'bg-#946B29 text-white shadow-sm'
                        : has
                          ? 'bg-gray-100 text-#946B29 hover:bg-amber-50'
                          : 'text-gray-300 cursor-default'
                    }`}
                  >
                    {letter}
                  </button>
                );
              })}
            </div>
          )}

          {/* Results label */}
          {!loading && (
            <p className="text-xs text-gray-400 mb-3">
              {searchResults !== null
                ? `${displayedBooks.length} ${displayedBooks.length === 1 ? 'boek' : 'boeken'} gevonden voor "${searchQuery}"`
                : viewMode === 'recent'
                  ? `${displayedBooks.length} recent toegevoegde boeken`
                  : isComputedSort
                    ? `${displayedBooks.length} ${displayedBooks.length === 1 ? 'boek' : 'boeken'} gesorteerd op ${SORT_LABELS[sortField].toLowerCase()}`
                    : `${displayedBooks.length} ${displayedBooks.length === 1 ? 'boek' : 'boeken'} onder "${activeLetter}"`}
            </p>
          )}

          {loading ? (
            <div className="flex items-center justify-center h-48">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-#946B29" />
            </div>
          ) : displayedBooks.length === 0 ? (
            <div className="text-center py-12">
              <BookOpen className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-600">
                {searchResults !== null
                  ? 'Geen boeken gevonden'
                  : availableLetters.size === 0
                    ? 'Nog geen boeken in de bibliotheek'
                    : `Geen boeken onder "${activeLetter}"`}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
              {displayedBooks.map((book) => (
                <div
                  key={book.id}
                  className="bg-white border border-gray-200 rounded-lg overflow-hidden hover:shadow-md transition-shadow"
                >
                  <div
                    className="aspect-[2/3] bg-gray-100 relative cursor-pointer"
                    onClick={() => window.dispatchEvent(new CustomEvent('navigateToBoekerBookDetail', { detail: { bookId: book.id } }))}
                  >
                    {(book.custom_cover_url || book.cover_image_url) ? (
                      <img
                        src={book.custom_cover_url || book.cover_image_url || ''}
                        alt={book.title}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                          const fallback = e.currentTarget.parentElement?.querySelector('.fallback-icon');
                          if (fallback) (fallback as HTMLElement).style.display = 'flex';
                        }}
                      />
                    ) : null}
                    <div className={`fallback-icon w-full h-full flex items-center justify-center ${(book.custom_cover_url || book.cover_image_url) ? 'hidden' : ''}`}>
                      <BookOpen className="w-12 h-12 text-gray-300" />
                    </div>
                    {book.available_copies === 0 && (
                      <div className="absolute top-1.5 right-1.5 bg-red-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded">
                        Uit
                      </div>
                    )}
                  </div>
                  <div className="p-2">
                    <h3
                      className="font-semibold text-gray-900 text-xs mb-0.5 line-clamp-2 min-h-[2rem] cursor-pointer hover:text-#946B29"
                      onClick={() => window.dispatchEvent(new CustomEvent('navigateToBoekerBookDetail', { detail: { bookId: book.id } }))}
                    >
                      {book.title}
                    </h3>
                    {book.author && (
                      <p className="text-[10px] text-gray-600 mb-1 line-clamp-1">{book.author}</p>
                    )}
                    <div className="text-[10px] text-gray-500 mb-1">
                      <div className="line-clamp-1">ISBN: {book.isbn}</div>
                      <div>Beschikbaar: {book.available_copies}/{book.total_copies}</div>
                      {book.book_locations?.name && (
                        <div className="flex items-center gap-0.5 text-#946B29 mt-0.5">
                          <MapPin className="w-2.5 h-2.5 flex-shrink-0" />
                          <span className="line-clamp-1">{book.book_locations.name}</span>
                        </div>
                      )}
                    </div>
                    {(bookTagMap[book.id] || []).length > 0 && (
                      <div className="flex flex-wrap gap-0.5 mb-1.5">
                        {(bookTagMap[book.id] || []).slice(0, 3).map(tid => {
                          const tag = allTags.find(t => t.id === tid);
                          if (!tag) return null;
                          return (
                            <span
                              key={tid}
                              className="px-1.5 py-0.5 text-[9px] font-medium rounded-full text-white leading-tight"
                              style={{ backgroundColor: tag.color }}
                            >
                              {tag.name}
                            </span>
                          );
                        })}
                        {(bookTagMap[book.id] || []).length > 3 && (
                          <span className="px-1.5 py-0.5 text-[9px] font-medium rounded-full bg-gray-200 text-gray-600 leading-tight">
                            +{(bookTagMap[book.id] || []).length - 3}
                          </span>
                        )}
                      </div>
                    )}
                    <div className="flex gap-1">
                      <button
                        onClick={() => window.dispatchEvent(new CustomEvent('navigateToBoekerBookDetail', { detail: { bookId: book.id } }))}
                        className="flex-1 px-2 py-1 text-[10px] bg-amber-50 hover:bg-amber-100 text-#946B29 rounded transition-colors flex items-center justify-center"
                        title="Details bekijken"
                      >
                        <ExternalLink className="w-3 h-3" />
                      </button>
                      <button
                        onClick={() => handleEditBook(book)}
                        className="flex-1 px-2 py-1 text-[10px] bg-gray-100 hover:bg-gray-200 text-gray-700 rounded transition-colors flex items-center justify-center"
                        title="Bewerken"
                      >
                        <Pencil className="w-3 h-3" />
                      </button>
                      <button
                        onClick={() => handleDeleteBook(book.id)}
                        className="px-2 py-1 text-[10px] bg-red-50 hover:bg-red-100 text-red-600 rounded transition-colors"
                        title="Verwijderen"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </Card>

      {showScanner && (
        <BarcodeScanner
          onScan={handleIsbnScan}
          onClose={() => setShowScanner(false)}
        />
      )}

      {fetchingMetadata && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-[60]">
          <div className="bg-white rounded-2xl shadow-2xl p-10 flex flex-col items-center gap-5 max-w-xs w-full mx-4">
            <div className="relative flex items-center justify-center w-20 h-20">
              <svg className="absolute inset-0 w-full h-full animate-spin" viewBox="0 0 80 80" fill="none">
                <circle cx="40" cy="40" r="34" stroke="#e5e7eb" strokeWidth="6" />
                <circle cx="40" cy="40" r="34" stroke="#2563eb" strokeWidth="6"
                  strokeLinecap="round"
                  strokeDasharray="60 154"
                  strokeDashoffset="0"
                />
              </svg>
              <BookOpen className="w-8 h-8 text-#946B29" />
            </div>
            <div className="text-center">
              <p className="text-gray-900 font-semibold text-base">Boekgegevens ophalen</p>
              <p className="text-gray-500 text-sm mt-1">Even geduld...</p>
            </div>
            <div className="flex gap-1.5">
              {[0, 1, 2].map((i) => (
                <span
                  key={i}
                  className="w-2 h-2 rounded-full bg-amber-500"
                  style={{ animation: `bounce 1.2s ease-in-out ${i * 0.2}s infinite` }}
                />
              ))}
            </div>
          </div>
        </div>
      )}

      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">
                {editingBook ? 'Boek Bewerken' : 'Boek Toevoegen'}
              </h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    ISBN *
                  </label>
                  <div className="flex gap-2">
                    <Input
                      value={formData.isbn}
                      onChange={(e) => {
                        const val = e.target.value.replace(/[^0-9X]/gi, '');
                        setFormData({ ...formData, isbn: val });
                        if ((val.length === 13 || val.length === 10) && !editingBook) {
                          handleIsbnLookupInForm(val);
                        }
                      }}
                      placeholder="9781234567890"
                      disabled={!!editingBook}
                    />
                    {!editingBook && (
                      <button
                        type="button"
                        onClick={() => {
                          if (formData.isbn) handleIsbnLookupInForm(formData.isbn);
                        }}
                        disabled={fetchingMetadata || !formData.isbn}
                        className="flex-shrink-0 px-3 py-2 text-sm bg-#946B29 text-white rounded-lg hover:bg-#74531F disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        title="Boekgegevens opzoeken"
                      >
                        {fetchingMetadata ? (
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <Search className="w-4 h-4" />
                        )}
                      </button>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Titel *
                  </label>
                  <Input
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="Boektitel"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Auteur
                  </label>
                  <Input
                    value={formData.author}
                    onChange={(e) => setFormData({ ...formData, author: e.target.value })}
                    placeholder="Auteursnaam"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Uitgever
                    </label>
                    <Input
                      value={formData.publisher}
                      onChange={(e) => setFormData({ ...formData, publisher: e.target.value })}
                      placeholder="Uitgever"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Publicatiedatum
                    </label>
                    <Input
                      value={formData.published_date}
                      onChange={(e) => setFormData({ ...formData, published_date: e.target.value })}
                      placeholder="2024"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Aantal Pagina's
                    </label>
                    <Input
                      type="number"
                      value={formData.page_count}
                      onChange={(e) => setFormData({ ...formData, page_count: e.target.value })}
                      placeholder="250"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Aantal Exemplaren
                    </label>
                    <Input
                      type="number"
                      value={formData.total_copies}
                      onChange={(e) => setFormData({ ...formData, total_copies: e.target.value })}
                      placeholder="1"
                      min="1"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Locatie
                  </label>
                  <LocationCombobox
                    schoolId={schoolId}
                    value={formData.location_id}
                    onChange={(id) => setFormData({ ...formData, location_id: id })}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Boek Cover
                  </label>

                  <div className="space-y-3">
                    {formData.cover_image_url && (
                      <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                        <div className="w-16 h-24 bg-white rounded border border-gray-200 flex items-center justify-center overflow-hidden flex-shrink-0">
                          <img
                            src={formData.cover_image_url}
                            alt="API cover"
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              e.currentTarget.style.display = 'none';
                            }}
                          />
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-medium text-gray-700">Cover van API</p>
                          <p className="text-xs text-gray-500 mt-1">
                            Opgehaald bij ISBN scan
                          </p>
                          {!useCustomCover && (
                            <p className="text-xs text-green-600 mt-1 font-medium">
                              ✓ Wordt gebruikt
                            </p>
                          )}
                        </div>
                      </div>
                    )}

                    <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                      {(customCoverPreview || (useCustomCover && formData.custom_cover_url)) && (
                        <div className="w-16 h-24 bg-white rounded border border-gray-200 flex items-center justify-center overflow-hidden flex-shrink-0">
                          <img
                            src={customCoverPreview || formData.custom_cover_url}
                            alt="Custom cover"
                            className="w-full h-full object-cover"
                          />
                        </div>
                      )}
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-700 mb-2">Eigen Cover Uploaden</p>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleCustomCoverChange}
                          className="hidden"
                          id="custom-cover-upload"
                        />
                        <label htmlFor="custom-cover-upload">
                          <Button
                            type="button"
                            variant="secondary"
                            className="text-sm"
                            onClick={() => document.getElementById('custom-cover-upload')?.click()}
                          >
                            <Camera className="w-4 h-4 mr-2" />
                            {customCoverPreview ? 'Andere foto kiezen' : 'Upload foto'}
                          </Button>
                        </label>
                        {useCustomCover && (
                          <div className="mt-2">
                            <p className="text-xs text-green-600 font-medium">
                              ✓ Wordt gebruikt
                            </p>
                            <button
                              type="button"
                              onClick={() => {
                                setUseCustomCover(false);
                                setCustomCoverFile(null);
                                setCustomCoverPreview(null);
                              }}
                              className="text-xs text-#946B29 hover:text-#74531F mt-1"
                            >
                              Gebruik API cover
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Beschrijving
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Korte beschrijving..."
                    rows={3}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                  />
                </div>

                {allTags.length > 0 && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      <Tag className="w-4 h-4 inline mr-1.5 text-gray-500" />
                      Tags
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {allTags.map((tag) => {
                        const isSelected = editBookTagIds.includes(tag.id);
                        return (
                          <button
                            key={tag.id}
                            type="button"
                            onClick={() => setEditBookTagIds(prev =>
                              isSelected ? prev.filter(id => id !== tag.id) : [...prev, tag.id]
                            )}
                            className="px-3 py-1.5 text-sm rounded-full border font-medium transition-all"
                            style={isSelected
                              ? { backgroundColor: tag.color, borderColor: tag.color, color: '#fff' }
                              : { borderColor: '#D1D5DB', color: '#4B5563' }
                            }
                          >
                            {tag.name}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              <div className="flex gap-3 mt-6">
                <Button onClick={handleSaveBook}>
                  {editingBook ? 'Bijwerken' : 'Toevoegen'}
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => {
                    setShowAddModal(false);
                    setEditingBook(null);
                    resetForm();
                  }}
                >
                  Annuleren
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {viewingBook && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-start justify-between mb-6">
                <div className="flex gap-4">
                  <div className="w-24 h-36 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
                    {(viewingBook.custom_cover_url || viewingBook.cover_image_url) ? (
                      <img
                        src={viewingBook.custom_cover_url || viewingBook.cover_image_url || ''}
                        alt={viewingBook.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <BookOpen className="w-12 h-12 text-gray-300" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1">
                    <h2 className="text-xl font-bold text-gray-900 mb-1">
                      {viewingBook.title}
                    </h2>
                    {viewingBook.author && (
                      <p className="text-gray-600 mb-2">{viewingBook.author}</p>
                    )}
                    <div className="text-sm text-gray-500 space-y-1">
                      <p>ISBN: {viewingBook.isbn}</p>
                      {viewingBook.page_count && (
                        <p>{viewingBook.page_count} pagina's</p>
                      )}
                      <p>
                        Beschikbaar: {viewingBook.available_copies}/{viewingBook.total_copies}
                      </p>
                      {viewingBook.book_locations?.name && (
                        <p className="flex items-center gap-1 text-#946B29">
                          <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
                          {viewingBook.book_locations.name}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setViewingBook(null);
                    setCurrentBorrowers([]);
                    setBookReviews([]);
                    setDuplicateBook(null);
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              {duplicateBook && duplicateBook.id === viewingBook.id && (
                <div className="mb-4 p-4 bg-amber-50 border border-amber-300 rounded-xl">
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 w-8 h-8 bg-amber-100 rounded-full flex items-center justify-center">
                      <BookOpen className="w-4 h-4 text-amber-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-amber-900">Dit boek staat al in de catalogus</p>
                      <p className="text-sm text-amber-700 mt-0.5">
                        Er {viewingBook.total_copies === 1 ? 'is' : 'zijn'} al <strong>{viewingBook.total_copies}</strong> {viewingBook.total_copies === 1 ? 'exemplaar' : 'exemplaren'} geregistreerd ({viewingBook.available_copies} beschikbaar). Wil je er nog een exemplaar aan toevoegen?
                      </p>
                      <div className="flex gap-2 mt-3">
                        <button
                          onClick={handleAddDuplicateCopy}
                          disabled={addingDuplicateCopies}
                          className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-medium rounded-lg transition-colors disabled:opacity-50"
                        >
                          {addingDuplicateCopies ? 'Toevoegen...' : '+ Exemplaar toevoegen'}
                        </button>
                        <button
                          onClick={() => setDuplicateBook(null)}
                          className="px-3 py-1.5 bg-white hover:bg-amber-100 text-amber-800 text-xs font-medium rounded-lg border border-amber-300 transition-colors"
                        >
                          Nee, bedankt
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div className="border-t pt-4">
                <div className="flex items-center gap-2 mb-4">
                  <Users className="w-5 h-5 text-#946B29" />
                  <h3 className="text-lg font-semibold text-gray-900">
                    Huidige Leners ({currentBorrowers.length})
                  </h3>
                </div>

                {(() => {
                  const actualBorrowedCount = currentBorrowers.length;
                  const expectedAvailable = viewingBook.total_copies - actualBorrowedCount;
                  const hasInconsistency = viewingBook.available_copies !== expectedAvailable;

                  return hasInconsistency ? (
                    <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                      <div className="flex items-start gap-3">
                        <div className="flex-shrink-0">
                          <svg className="w-5 h-5 text-yellow-600" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                          </svg>
                        </div>
                        <div className="flex-1">
                          <h4 className="text-sm font-semibold text-yellow-800 mb-1">
                            Data inconsistentie gedetecteerd
                          </h4>
                          <p className="text-sm text-yellow-700 mb-3">
                            Dit boek toont {viewingBook.available_copies} beschikbare {viewingBook.available_copies === 1 ? 'exemplaar' : 'exemplaren'},
                            maar zou {expectedAvailable} {expectedAvailable === 1 ? 'moeten' : 'moeten'} zijn op basis van de huidige uitleningen
                            ({actualBorrowedCount} van {viewingBook.total_copies} uitgeleend).
                          </p>
                          <Button
                            onClick={() => handleSyncAvailability(viewingBook, actualBorrowedCount)}
                            className="bg-yellow-600 hover:bg-yellow-700 text-sm"
                          >
                            Herstel beschikbaarheid
                          </Button>
                        </div>
                      </div>
                    </div>
                  ) : null;
                })()}

                {currentBorrowers.length === 0 ? (
                  <p className="text-gray-500 text-center py-8">
                    Dit boek wordt momenteel niet gelezen
                  </p>
                ) : (
                  <div className="space-y-3">
                    {currentBorrowers.map((borrower) => {
                      const progressPercentage = viewingBook.page_count && borrower.current_page
                        ? Math.round((borrower.current_page / viewingBook.page_count) * 100)
                        : null;

                      return (
                        <div
                          key={borrower.id}
                          className="bg-gray-50 rounded-lg p-4"
                        >
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex-1">
                              <h4
                                className="font-semibold text-gray-900 hover:text-#946B29 cursor-pointer"
                                onClick={() => {
                                  if (onViewStudent) {
                                    setViewingBook(null);
                                    setCurrentBorrowers([]);
                                    onViewStudent(borrower.students.id);
                                  }
                                }}
                              >
                                {borrower.students.first_name} {borrower.students.last_name}
                              </h4>
                              <p className="text-xs text-gray-500">
                                Begonnen op {new Date(borrower.borrowed_at).toLocaleDateString('nl-NL', {
                                  day: 'numeric',
                                  month: 'long'
                                })}
                              </p>
                            </div>
                            <div className="flex items-center gap-2">
                              {borrower.current_page && (
                                <div className="text-right">
                                  <p className="text-sm font-semibold text-#946B29">
                                    Pagina {borrower.current_page}
                                    {viewingBook.page_count && ` / ${viewingBook.page_count}`}
                                  </p>
                                </div>
                              )}
                              <button
                                onClick={async () => {
                                  try {
                                    const { error } = await supabase
                                      .from('student_books')
                                      .update({ status: 'returned' })
                                      .eq('id', borrower.id);

                                    if (error) throw error;

                                    await supabase
                                      .from('books')
                                      .update({ available_copies: viewingBook.available_copies + 1 })
                                      .eq('id', viewingBook.id);

                                    setToast({ message: 'Boek geretourneerd', type: 'success' });

                                    // Refetch the updated book
                                    const { data: updatedBook } = await supabase
                                      .from('books')
                                      .select('*, book_locations(name)')
                                      .eq('id', viewingBook.id)
                                      .single();

                                    if (updatedBook) {
                                      await handleViewBook(updatedBook);
                                    }
                                    await fetchBooks();
                                  } catch (error) {
                                    console.error('Error returning book:', error);
                                    setToast({ message: 'Fout bij retourneren', type: 'error' });
                                  }
                                }}
                                className="px-3 py-1 text-xs bg-#946B29 text-white rounded hover:bg-#74531F transition-colors flex items-center gap-1"
                              >
                                <X className="w-3 h-3" />
                                Retourneer
                              </button>
                            </div>
                          </div>

                          {progressPercentage !== null && (
                            <div>
                              <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
                                <span>Voortgang</span>
                                <span className="font-semibold">{progressPercentage}%</span>
                              </div>
                              <div className="w-full bg-gray-200 rounded-full h-2">
                                <div
                                  className="bg-#946B29 h-2 rounded-full transition-all"
                                  style={{ width: `${progressPercentage}%` }}
                                />
                              </div>
                            </div>
                          )}

                          {borrower.total_pages_read > 0 && (
                            <p className="text-xs text-gray-600 mt-2">
                              Totaal gelezen: {borrower.total_pages_read} pagina's
                            </p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="border-t pt-4 mt-6">
                <div className="flex items-center gap-2 mb-4">
                  <MessageSquare className="w-5 h-5 text-green-600" />
                  <h3 className="text-lg font-semibold text-gray-900">
                    Recensies ({bookReviews.length})
                  </h3>
                </div>

                {bookReviews.length === 0 ? (
                  <p className="text-gray-500 text-center py-8">
                    Nog geen recensies voor dit boek
                  </p>
                ) : (
                  <div className="space-y-3">
                    {bookReviews.map((review) => (
                      <div
                        key={review.id}
                        className="bg-gray-50 rounded-lg p-4"
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <h4
                                className="font-semibold text-gray-900 hover:text-#946B29 cursor-pointer"
                                onClick={() => {
                                  if (onViewStudent) {
                                    setViewingBook(null);
                                    setCurrentBorrowers([]);
                                    setBookReviews([]);
                                    onViewStudent(review.students.id);
                                  }
                                }}
                              >
                                {review.students.first_name} {review.students.last_name}
                              </h4>
                              <div className="flex items-center gap-0.5">
                                {[...Array(5)].map((_, i) => (
                                  <Star
                                    key={i}
                                    className={`w-4 h-4 ${
                                      i < review.rating
                                        ? 'text-yellow-400 fill-yellow-400'
                                        : 'text-gray-300'
                                    }`}
                                  />
                                ))}
                              </div>
                            </div>
                            <p className="text-xs text-gray-500">
                              {new Date(review.created_at).toLocaleDateString('nl-NL', {
                                day: 'numeric',
                                month: 'long',
                                year: 'numeric'
                              })}
                            </p>
                          </div>
                          <button
                            onClick={() => handleDeleteReview(review.id)}
                            className="text-red-600 hover:text-red-700 transition-colors p-1"
                            title="Verwijder recensie"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>

                        {review.review_text && (
                          <p className="text-sm text-gray-700 bg-white p-3 rounded border border-gray-200 mt-2">
                            {review.review_text}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {showQuickScan && (
        <QuickScanModal
          schoolId={schoolId}
          onClose={() => setShowQuickScan(false)}
          onBookProcessed={() => {
            fetchBooks();
          }}
        />
      )}

      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

      {cropperFile && (
        <ImageCropper
          imageFile={cropperFile}
          aspectRatio={2 / 3}
          title="Boekcover bijsnijden"
          onCropComplete={handleCropComplete}
          onCancel={() => setCropperFile(null)}
        />
      )}
    </div>
  );
}
