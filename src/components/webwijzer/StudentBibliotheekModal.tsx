import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Button } from '../ui/Button';
import { UniversalScanner } from '../ui/UniversalScanner';
import { ReadingSessionModal } from './ReadingSessionModal';
import { ReturnItemModal } from './ReturnItemModal';
import { X, BookOpen, Package, Scan, AlertCircle } from 'lucide-react';

interface Book {
  id: string;
  title: string;
  author: string;
  cover_image_url: string;
  borrowed_at: string;
  student_book_id: string;
}

interface Material {
  id: string;
  title: string;
  description: string;
  photo_url: string;
  loaned_at: string;
  blink_code: string;
  material_loan_id: string;
}

interface StudentBibliotheekModalProps {
  studentId: string;
  schoolId: string;
  onClose: () => void;
}

export function StudentBibliotheekModal({ studentId, schoolId, onClose }: StudentBibliotheekModalProps) {
  const [books, setBooks] = useState<Book[]>([]);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [loading, setLoading] = useState(true);
  const [showScanner, setShowScanner] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [scannedItem, setScannedItem] = useState<{code: string; type: 'book' | 'material'; title: string} | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [selectedBook, setSelectedBook] = useState<Book | null>(null);
  const [selectedMaterial, setMaterial] = useState<Material | null>(null);
  const [showReadingModal, setShowReadingModal] = useState(false);
  const [showReturnModal, setShowReturnModal] = useState(false);

  useEffect(() => {
    fetchBibliotheek();
  }, [studentId]);

  const fetchBibliotheek = async () => {
    try {
      setLoading(true);

      const [booksResult, materialsResult] = await Promise.all([
        supabase
          .from('student_books')
          .select(`
            id,
            borrowed_at,
            books (
              id,
              title,
              author,
              cover_image_url
            )
          `)
          .eq('student_id', studentId)
          .is('returned_at', null),

        supabase
          .from('school_material_loans')
          .select(`
            id,
            loaned_at,
            school_materials (
              id,
              title,
              description,
              photo_url,
              blink_code
            )
          `)
          .eq('student_id', studentId)
          .is('returned_at', null)
      ]);

      if (booksResult.error) throw booksResult.error;
      if (materialsResult.error) throw materialsResult.error;

      const formattedBooks = (booksResult.data || [])
        .filter(item => item.books)
        .map(item => ({
          id: item.books.id,
          title: item.books.title,
          author: item.books.author,
          cover_image_url: item.books.cover_image_url,
          borrowed_at: item.borrowed_at,
          student_book_id: item.id
        }));

      const formattedMaterials = (materialsResult.data || [])
        .filter(item => item.school_materials)
        .map(item => ({
          id: item.school_materials.id,
          title: item.school_materials.title,
          description: item.school_materials.description,
          photo_url: item.school_materials.photo_url,
          blink_code: item.school_materials.blink_code,
          loaned_at: item.loaned_at,
          material_loan_id: item.id
        }));

      setBooks(formattedBooks);
      setMaterials(formattedMaterials);
    } catch (error) {
      console.error('Error fetching bibliotheek:', error);
      setError('Fout bij ophalen van items');
    } finally {
      setLoading(false);
    }
  };

  const handleScan = async (code: string) => {
    try {
      setError(null);
      setConfirming(true);

      let cleanCode = code;
      if (code.includes('blinkqr.app/qr/')) {
        cleanCode = code.split('blinkqr.app/qr/')[1];
      }

      const isBlinkQR = cleanCode.includes('-');

      if (isBlinkQR) {
        const { data: materialData, error: materialError } = await supabase
          .from('school_materials')
          .select('id, title, is_available')
          .eq('school_id', schoolId)
          .eq('blink_code', cleanCode)
          .maybeSingle();

        if (materialError) throw materialError;
        if (!materialData) {
          setError('Materiaal niet gevonden');
          setConfirming(false);
          return;
        }

        if (!materialData.is_available) {
          setError('Materiaal is niet beschikbaar');
          setConfirming(false);
          return;
        }

        setScannedItem({ code: cleanCode, type: 'material', title: materialData.title });
      } else {
        const { data: bookData, error: bookError } = await supabase
          .from('books')
          .select('id, title, available_copies')
          .eq('school_id', schoolId)
          .eq('isbn', cleanCode)
          .maybeSingle();

        if (bookError) throw bookError;
        if (!bookData) {
          setError('Boek niet gevonden');
          setConfirming(false);
          return;
        }

        if (bookData.available_copies <= 0) {
          setError('Boek is niet beschikbaar');
          setConfirming(false);
          return;
        }

        setScannedItem({ code: cleanCode, type: 'book', title: bookData.title });
      }

      setConfirming(false);
    } catch (error) {
      console.error('Error processing scan:', error);
      setError('Fout bij scannen');
      setConfirming(false);
    }
  };

  const handleConfirm = async () => {
    if (!scannedItem) return;

    try {
      setConfirming(true);
      setError(null);

      if (scannedItem.type === 'book') {
        const { data: bookData, error: bookError } = await supabase
          .from('books')
          .select('id, available_copies')
          .eq('school_id', schoolId)
          .eq('isbn', scannedItem.code)
          .maybeSingle();

        if (bookError) throw bookError;
        if (!bookData) {
          setError('Boek niet gevonden');
          return;
        }

        const { error: loanError } = await supabase
          .from('student_books')
          .insert({
            student_id: studentId,
            book_id: bookData.id,
            borrowed_at: new Date().toISOString()
          });

        if (loanError) throw loanError;

        await supabase
          .from('books')
          .update({ available_copies: bookData.available_copies - 1 })
          .eq('id', bookData.id);
      } else {
        const { data: materialData, error: materialError } = await supabase
          .from('school_materials')
          .select('id')
          .eq('school_id', schoolId)
          .eq('blink_code', scannedItem.code)
          .maybeSingle();

        if (materialError) throw materialError;
        if (!materialData) {
          setError('Materiaal niet gevonden');
          return;
        }

        const { error: loanError } = await supabase
          .from('school_material_loans')
          .insert({
            material_id: materialData.id,
            student_id: studentId,
            loaned_at: new Date().toISOString()
          });

        if (loanError) throw loanError;

        await supabase
          .from('school_materials')
          .update({ is_available: false })
          .eq('id', materialData.id);
      }

      setShowScanner(false);
      setScannedItem(null);
      fetchBibliotheek();
    } catch (error) {
      console.error('Error confirming item:', error);
      setError('Fout bij toevoegen');
    } finally {
      setConfirming(false);
    }
  };

  const handleCancelScan = () => {
    setScannedItem(null);
    setError(null);
  };

  const handleBookClick = (book: Book) => {
    setSelectedBook(book);
  };

  const handleMaterialClick = (material: Material) => {
    setMaterial(material);
  };

  const handleStartReading = () => {
    if (selectedBook) {
      setShowReadingModal(true);
    }
  };

  const handleReturnBook = () => {
    if (selectedBook) {
      setShowReturnModal(true);
    }
  };

  const handleReturnMaterial = () => {
    if (selectedMaterial) {
      setShowReturnModal(true);
    }
  };

  const handleReadingComplete = () => {
    setShowReadingModal(false);
    setSelectedBook(null);
    fetchBibliotheek();
  };

  const handleReturnComplete = () => {
    setShowReturnModal(false);
    setSelectedBook(null);
    setMaterial(null);
    fetchBibliotheek();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-2xl font-bold text-gray-900">Mijn Bibliotheek</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-6 h-6 text-gray-600" />
          </button>
        </div>

        {showScanner ? (
          <div className="p-6">
            {!scannedItem ? (
              <>
                <div className="mb-4">
                  <button
                    onClick={() => setShowScanner(false)}
                    className="text-blue-600 hover:text-blue-700 font-medium"
                  >
                    ← Terug
                  </button>
                </div>
                <div className="mb-4">
                  <p className="text-gray-700 mb-4 text-center">
                    Scan een ISBN (boek) of BlinkQR code (materiaal)
                  </p>
                  <UniversalScanner
                    onBookScan={handleScan}
                    onMaterialScan={handleScan}
                    scanningFor="all"
                  />
                </div>
                {confirming && (
                  <div className="text-center py-4">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                    <p className="text-gray-600 mt-2">Item zoeken...</p>
                  </div>
                )}
                {error && (
                  <div className="flex items-center gap-2 p-4 bg-red-50 text-red-700 rounded-lg">
                    <AlertCircle className="w-5 h-5" />
                    <span>{error}</span>
                  </div>
                )}
              </>
            ) : (
              <div className="text-center">
                <div className="mb-6">
                  {scannedItem.type === 'book' ? (
                    <BookOpen className="w-16 h-16 text-blue-600 mx-auto mb-4" />
                  ) : (
                    <Package className="w-16 h-16 text-green-600 mx-auto mb-4" />
                  )}
                  <h3 className="text-xl font-bold text-gray-900 mb-2">
                    {scannedItem.title}
                  </h3>
                  <p className="text-gray-600 mb-6">
                    {scannedItem.type === 'book' ? 'Boek' : 'Materiaal'} toevoegen aan je bibliotheek?
                  </p>
                </div>
                <div className="flex gap-4 justify-center">
                  <Button
                    variant="secondary"
                    onClick={handleCancelScan}
                    disabled={confirming}
                  >
                    Annuleren
                  </Button>
                  <Button
                    onClick={handleConfirm}
                    disabled={confirming}
                  >
                    {confirming ? 'Bezig...' : 'Bevestigen'}
                  </Button>
                </div>
                {error && (
                  <div className="flex items-center gap-2 p-4 bg-red-50 text-red-700 rounded-lg mt-4">
                    <AlertCircle className="w-5 h-5" />
                    <span>{error}</span>
                  </div>
                )}
              </div>
            )}
          </div>
        ) : (
          <div className="overflow-y-auto max-h-[calc(90vh-180px)]">
            <div className="p-6 space-y-6">
              {loading ? (
                <div className="text-center py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                </div>
              ) : (
                <>
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                        <BookOpen className="w-5 h-5 text-blue-600" />
                        Mijn Boeken ({books.length})
                      </h3>
                    </div>
                    {books.length === 0 ? (
                      <p className="text-gray-500 text-center py-8">Geen geleende boeken</p>
                    ) : (
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        {books.map((book) => (
                          <div key={book.id} className="bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                            <button
                              onClick={() => handleBookClick(book)}
                              className="w-full text-left"
                            >
                              {book.cover_image_url ? (
                                <img
                                  src={book.cover_image_url}
                                  alt={book.title}
                                  className="w-full h-48 object-cover"
                                />
                              ) : (
                                <div className="w-full h-48 bg-gray-100 flex items-center justify-center">
                                  <BookOpen className="w-12 h-12 text-gray-400" />
                                </div>
                              )}
                              <div className="p-3">
                                <h4 className="font-semibold text-sm text-gray-900 line-clamp-1">
                                  {book.title}
                                </h4>
                                <p className="text-xs text-gray-600 mt-1">{book.author}</p>
                              </div>
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="border-t border-gray-200 pt-6">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                        <Package className="w-5 h-5 text-green-600" />
                        Mijn Materialen ({materials.length})
                      </h3>
                    </div>
                    {materials.length === 0 ? (
                      <p className="text-gray-500 text-center py-8">Geen geleende materialen</p>
                    ) : (
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        {materials.map((material) => (
                          <div key={material.id} className="bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                            <button
                              onClick={() => handleMaterialClick(material)}
                              className="w-full text-left"
                            >
                              {material.photo_url ? (
                                <img
                                  src={material.photo_url}
                                  alt={material.title}
                                  className="w-full h-48 object-cover"
                                />
                              ) : (
                                <div className="w-full h-48 bg-gray-100 flex items-center justify-center">
                                  <Package className="w-12 h-12 text-gray-400" />
                                </div>
                              )}
                              <div className="p-3">
                                <h4 className="font-semibold text-sm text-gray-900 line-clamp-1">
                                  {material.title}
                                </h4>
                                {material.description && (
                                  <p className="text-xs text-gray-600 mt-1 line-clamp-2">
                                    {material.description}
                                  </p>
                                )}
                              </div>
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {!showScanner && !selectedBook && !selectedMaterial && (
          <div className="p-6 border-t border-gray-200">
            <Button
              onClick={() => setShowScanner(true)}
              className="w-full"
            >
              <Scan className="w-5 h-5 mr-2" />
              Nieuw item scannen
            </Button>
          </div>
        )}

        {selectedBook && !showScanner && (
          <div className="p-6 border-t border-gray-200 space-y-3">
            <Button
              onClick={handleStartReading}
              className="w-full bg-green-600 hover:bg-green-700"
            >
              <BookOpen className="w-5 h-5 mr-2" />
              Ik lees
            </Button>
            <Button
              onClick={handleReturnBook}
              variant="secondary"
              className="w-full"
            >
              Inleveren
            </Button>
            <Button
              onClick={() => setSelectedBook(null)}
              variant="secondary"
              className="w-full"
            >
              Annuleren
            </Button>
          </div>
        )}

        {selectedMaterial && !showScanner && (
          <div className="p-6 border-t border-gray-200 space-y-3">
            <Button
              onClick={handleReturnMaterial}
              className="w-full"
            >
              Inleveren
            </Button>
            <Button
              onClick={() => setMaterial(null)}
              variant="secondary"
              className="w-full"
            >
              Annuleren
            </Button>
          </div>
        )}
      </div>

      {showReadingModal && selectedBook && (
        <ReadingSessionModal
          book={selectedBook}
          studentId={studentId}
          onClose={() => setShowReadingModal(false)}
          onComplete={handleReadingComplete}
        />
      )}

      {showReturnModal && (selectedBook || selectedMaterial) && (
        <ReturnItemModal
          item={
            selectedBook
              ? {
                  id: selectedBook.id,
                  title: selectedBook.title,
                  type: 'book' as const,
                  student_book_id: selectedBook.student_book_id,
                  cover_image_url: selectedBook.cover_image_url
                }
              : {
                  id: selectedMaterial!.id,
                  title: selectedMaterial!.title,
                  type: 'material' as const,
                  material_loan_id: selectedMaterial!.material_loan_id,
                  photo_url: selectedMaterial!.photo_url
                }
          }
          studentId={studentId}
          onClose={() => setShowReturnModal(false)}
          onComplete={handleReturnComplete}
        />
      )}
    </div>
  );
}
