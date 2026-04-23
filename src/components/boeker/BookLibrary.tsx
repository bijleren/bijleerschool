import React, { useState, useEffect } from 'react';
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
import { Plus, Search, CreditCard as Edit, Trash2, Camera, BookOpen, Users, X, Scan, Star, MessageSquare, MapPin } from 'lucide-react';
import { LocationCombobox } from './LocationCombobox';

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

interface BookLibraryProps {
  schoolId: string;
  onViewStudent?: (studentId: string) => void;
}

export function BookLibrary({ schoolId, onViewStudent }: BookLibraryProps) {
  const { user } = useAuth();
  const [books, setBooks] = useState<Book[]>([]);
  const [filteredBooks, setFilteredBooks] = useState<Book[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [showScanner, setShowScanner] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showQuickScan, setShowQuickScan] = useState(false);
  const [editingBook, setEditingBook] = useState<Book | null>(null);
  const [viewingBook, setViewingBook] = useState<Book | null>(null);
  const [currentBorrowers, setCurrentBorrowers] = useState<StudentBookInfo[]>([]);
  const [bookReviews, setBookReviews] = useState<BookReview[]>([]);
  const [fetchingMetadata, setFetchingMetadata] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [customCoverFile, setCustomCoverFile] = useState<File | null>(null);
  const [customCoverPreview, setCustomCoverPreview] = useState<string | null>(null);
  const [useCustomCover, setUseCustomCover] = useState(false);

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
    fetchBooks();
  }, [schoolId]);

  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredBooks(books);
    } else {
      const query = searchQuery.toLowerCase();
      setFilteredBooks(
        books.filter(
          (book) =>
            book.title.toLowerCase().includes(query) ||
            book.author?.toLowerCase().includes(query) ||
            book.isbn.includes(query)
        )
      );
    }
  }, [searchQuery, books]);

  const fetchBooks = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('books')
        .select('*, book_locations(name)')
        .eq('school_id', schoolId)
        .order('title');

      if (error) throw error;
      setBooks(data || []);
      setFilteredBooks(data || []);
    } catch (error) {
      console.error('Error fetching books:', error);
      setToast({ message: 'Fout bij ophalen boeken', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleCustomCoverChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setCustomCoverFile(file);
      setCustomCoverPreview(URL.createObjectURL(file));
      setUseCustomCover(true);
    }
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

  const handleIsbnScan = async (isbn: string) => {
    setShowScanner(false);
    setFetchingMetadata(true);
    setToast({ message: 'Boekgegevens ophalen...', type: 'info' });

    try {
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

      if (editingBook) {
        const { error } = await supabase
          .from('books')
          .update(bookData)
          .eq('id', editingBook.id);

        if (error) throw error;
        setToast({ message: 'Boek bijgewerkt', type: 'success' });
      } else {
        const { error } = await supabase
          .from('books')
          .insert(bookData);

        if (error) throw error;
        setToast({ message: 'Boek toegevoegd', type: 'success' });
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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex-1 max-w-md">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Zoek op titel, auteur of ISBN..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Button onClick={() => setShowQuickScan(true)} className="bg-green-600 hover:bg-green-700">
                <Scan className="w-4 h-4 mr-2" />
                Quick Scan
              </Button>
              <Button onClick={() => setShowScanner(true)}>
                <Camera className="w-4 h-4 mr-2" />
                Scan ISBN
              </Button>
              <Button
                variant="secondary"
                onClick={() => {
                  resetForm();
                  setEditingBook(null);
                  setShowAddModal(true);
                }}
              >
                <Plus className="w-4 h-4 mr-2" />
                Handmatig Toevoegen
              </Button>
            </div>
          </div>

          {filteredBooks.length === 0 ? (
            <div className="text-center py-12">
              <BookOpen className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-600">
                {searchQuery ? 'Geen boeken gevonden' : 'Nog geen boeken in de bibliotheek'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
              {filteredBooks.map((book) => (
                <div
                  key={book.id}
                  className="bg-white border border-gray-200 rounded-lg overflow-hidden hover:shadow-md transition-shadow"
                >
                  <div
                    className="aspect-[2/3] bg-gray-100 relative cursor-pointer"
                    onClick={() => handleViewBook(book)}
                  >
                    {(book.custom_cover_url || book.cover_image_url) ? (
                      <img
                        src={book.custom_cover_url || book.cover_image_url || ''}
                        alt={book.title}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                          if (e.currentTarget.parentElement) {
                            const fallback = e.currentTarget.parentElement.querySelector('.fallback-icon');
                            if (fallback) {
                              (fallback as HTMLElement).style.display = 'flex';
                            }
                          }
                        }}
                      />
                    ) : null}
                    <div className={`fallback-icon w-full h-full flex items-center justify-center ${(book.custom_cover_url || book.cover_image_url) ? 'hidden' : ''}`}>
                      <BookOpen className="w-12 h-12 text-gray-300" />
                    </div>
                  </div>
                  <div className="p-2">
                    <h3
                      className="font-semibold text-gray-900 text-xs mb-0.5 line-clamp-2 min-h-[2rem] cursor-pointer hover:text-blue-600"
                      onClick={() => handleViewBook(book)}
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
                        <div className="flex items-center gap-0.5 text-blue-600 mt-0.5">
                          <MapPin className="w-2.5 h-2.5 flex-shrink-0" />
                          <span className="line-clamp-1">{book.book_locations.name}</span>
                        </div>
                      )}
                    </div>
                    <div className="flex gap-1">
                      <button
                        onClick={() => handleEditBook(book)}
                        className="flex-1 px-2 py-1 text-[10px] bg-gray-100 hover:bg-gray-200 text-gray-700 rounded transition-colors flex items-center justify-center"
                        title="Bewerken"
                      >
                        <Edit className="w-3 h-3" />
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
                  <Input
                    value={formData.isbn}
                    onChange={(e) => setFormData({ ...formData, isbn: e.target.value })}
                    placeholder="9781234567890"
                    disabled={!!editingBook}
                  />
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
                              className="text-xs text-blue-600 hover:text-blue-700 mt-1"
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
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
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
                        <p className="flex items-center gap-1 text-blue-600">
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
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="border-t pt-4">
                <div className="flex items-center gap-2 mb-4">
                  <Users className="w-5 h-5 text-blue-600" />
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
                                className="font-semibold text-gray-900 hover:text-blue-600 cursor-pointer"
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
                                  <p className="text-sm font-semibold text-blue-600">
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
                                className="px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors flex items-center gap-1"
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
                                  className="bg-blue-600 h-2 rounded-full transition-all"
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
                                className="font-semibold text-gray-900 hover:text-blue-600 cursor-pointer"
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
    </div>
  );
}
