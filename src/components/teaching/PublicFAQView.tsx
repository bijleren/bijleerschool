import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { GraduationCap, ArrowLeft, LogIn, HelpCircle } from 'lucide-react';

interface FAQ {
  id: string;
  question: string;
  answer: string;
  category: string;
  display_order: number;
  is_published: boolean;
  created_at: string;
  updated_at: string;
}

export function PublicFAQView() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [faq, setFaq] = useState<FAQ | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const faqId = searchParams.get('faq');
    if (faqId) {
      fetchFAQ(faqId);
    } else {
      setError('Geen FAQ ID gevonden');
      setLoading(false);
    }
  }, [searchParams]);

  const fetchFAQ = async (id: string) => {
    try {
      const { data, error } = await supabase
        .from('didactiek_faq')
        .select('*')
        .eq('id', id)
        .eq('is_published', true)
        .maybeSingle();

      if (error) throw error;

      if (!data) {
        setError('FAQ niet gevonden');
      } else {
        setFaq(data);
      }
    } catch (err) {
      console.error('Error fetching FAQ:', err);
      setError('Fout bij het laden van de FAQ');
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = () => {
    navigate('/auth');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-50 via-white to-cyan-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-#946B29 mx-auto mb-4"></div>
          <p className="text-gray-600">FAQ wordt geladen...</p>
        </div>
      </div>
    );
  }

  if (error || !faq) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-50 via-white to-cyan-50 flex items-center justify-center p-4">
        <Card className="max-w-md w-full text-center p-8">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <HelpCircle className="w-8 h-8 text-red-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">FAQ niet gevonden</h2>
          <p className="text-gray-600 mb-6">{error || 'De gevraagde FAQ kon niet worden geladen.'}</p>
          <Button onClick={() => navigate('/')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Terug naar home
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-white to-cyan-50">
      <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-#946B29 rounded-xl flex items-center justify-center">
                <GraduationCap className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">bijleer.school</h1>
                <p className="text-sm text-gray-600">Didactiek FAQ</p>
              </div>
            </div>
            <Button onClick={handleLogin}>
              <LogIn className="w-4 h-4 mr-2" />
              Inloggen
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Terug naar home</span>
          </button>
        </div>

        <Card className="p-8">
          <div className="flex items-start gap-4 mb-6">
            <div className="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center flex-shrink-0">
              <HelpCircle className="w-6 h-6 text-#946B29" />
            </div>
            <div className="flex-1">
              <div className="mb-3">
                <span className="text-xs px-3 py-1 bg-amber-100 text-#74531F rounded-full">
                  {faq.category}
                </span>
              </div>
              <h1 className="text-3xl font-bold text-gray-900 mb-4">{faq.question}</h1>
            </div>
          </div>

          <div className="prose max-w-none">
            <div className="text-gray-800" dangerouslySetInnerHTML={{ __html: faq.answer }} />
          </div>
        </Card>

        <div className="mt-8 text-center">
          <Card className="p-6 bg-amber-50 border-amber-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Meer vragen over didactiek?
            </h3>
            <p className="text-gray-600 mb-4">
              Log in om toegang te krijgen tot alle FAQs en didactische technieken.
            </p>
            <Button onClick={handleLogin} className="bg-#946B29 hover:bg-#74531F">
              <LogIn className="w-4 h-4 mr-2" />
              Inloggen voor volledige toegang
            </Button>
          </Card>
        </div>
      </main>

      <footer className="mt-12 py-6 border-t border-gray-200 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-sm text-gray-500">
            © 2025 bijleer.school. Alle rechten voorbehouden.
          </p>
        </div>
      </footer>
    </div>
  );
}
