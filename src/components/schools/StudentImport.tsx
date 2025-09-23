import React, { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { 
  X, 
  Upload, 
  FileText, 
  CheckCircle, 
  XCircle, 
  AlertTriangle
} from 'lucide-react';
import Papa from 'papaparse';

interface StudentImportProps {
  schoolId: string;
  onImportComplete: () => void;
  onClose: () => void;
}

interface ParsedStudent {
  first_name: string;
  last_name: string;
  student_number: string;
  grade_level: string;
  date_of_birth: string;
}

interface ValidationResult {
  valid: boolean;
  errors: string[];
  student: ParsedStudent;
  index: number;
}

export function StudentImport({ schoolId, onImportComplete, onClose }: StudentImportProps) {
  const [csvData, setCsvData] = useState('');
  const [validationResults, setValidationResults] = useState<ValidationResult[]>([]);
  const [importing, setImporting] = useState(false);
  const [importComplete, setImportComplete] = useState(false);
  const [importResults, setImportResults] = useState<{
    success: number;
    failed: number;
    errors: string[];
  }>({ success: 0, failed: 0, errors: [] });

  const handleValidateAndImport = async () => {
    if (!csvData.trim()) return;

    setImporting(true);

    try {
      // Parse CSV data
      const parseResult = Papa.parse(csvData, {
        header: true,
        skipEmptyLines: true,
      });

      const rows = parseResult.data as any[];
      
      if (rows.length === 0) {
        alert('Geen geldige data gevonden. Controleer je CSV formaat.');
        setImporting(false);
        return;
      }

      // Auto-detect field mappings
      const headers = Object.keys(rows[0]);
      const fieldMapping = {
        first_name: '',
        last_name: '',
        student_number: '',
        grade_level: '',
        date_of_birth: ''
      };

      // Auto-detect common field names
      headers.forEach(header => {
        const normalized = header.toLowerCase().trim();
        if (normalized.includes('voornaam') || normalized.includes('first')) {
          fieldMapping.first_name = header;
        } else if (normalized.includes('achternaam') || normalized.includes('last')) {
          fieldMapping.last_name = header;
        } else if (normalized.includes('nummer') || normalized.includes('number')) {
          fieldMapping.student_number = header;
        } else if (normalized.includes('klas') || normalized.includes('grade') || normalized.includes('groep')) {
          fieldMapping.grade_level = header;
        } else if (normalized.includes('geboorte') || normalized.includes('birth') || normalized.includes('datum')) {
          fieldMapping.date_of_birth = header;
        }
      });

      // Map and validate students
      const students = rows.map(row => ({
        first_name: row[fieldMapping.first_name] || '',
        last_name: row[fieldMapping.last_name] || '',
        student_number: row[fieldMapping.student_number] || '',
        grade_level: row[fieldMapping.grade_level] || '',
        date_of_birth: row[fieldMapping.date_of_birth] || ''
      }));

      const validationResults = students.map((student, index) => {
        const errors: string[] = [];

        // Required fields
        if (!student.first_name?.trim()) {
          errors.push('Voornaam is verplicht');
        }
        if (!student.last_name?.trim()) {
          errors.push('Achternaam is verplicht');
        }

        // Date validation
        if (student.date_of_birth && student.date_of_birth.trim()) {
          const dateStr = student.date_of_birth.trim();
          let parsedDate: Date | null = null;
          
          // Try DD-MM-YYYY or DD/MM/YYYY
          if (dateStr.match(/^\d{1,2}[-/]\d{1,2}[-/]\d{4}$/)) {
            const parts = dateStr.split(/[-/]/);
            parsedDate = new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
          }
          // Try YYYY-MM-DD
          else if (dateStr.match(/^\d{4}-\d{1,2}-\d{1,2}$/)) {
            parsedDate = new Date(dateStr);
          }

          if (!parsedDate || isNaN(parsedDate.getTime())) {
            errors.push('Ongeldige geboortedatum (gebruik DD-MM-YYYY of YYYY-MM-DD)');
          }
        }

        return {
          valid: errors.length === 0,
          errors,
          student,
          index: index + 1
        };
      });

      setValidationResults(validationResults);

      // Import valid students
      const validStudents = validationResults.filter(result => result.valid);
      let successCount = 0;
      let failedCount = 0;
      const errors: string[] = [];

      for (const result of validStudents) {
        try {
          const studentData = {
            school_id: schoolId,
            first_name: result.student.first_name.trim(),
            last_name: result.student.last_name.trim(),
            student_number: result.student.student_number?.trim() || null,
            grade_level: result.student.grade_level?.trim() || null,
            date_of_birth: formatDateForDatabase(result.student.date_of_birth || ''),
          };

          const { error } = await supabase
            .from('students')
            .insert(studentData);

          if (error) {
            failedCount++;
            errors.push(`Rij ${result.index}: ${error.message}`);
          } else {
            successCount++;
          }
        } catch (error) {
          failedCount++;
          errors.push(`Rij ${result.index}: Onbekende fout`);
        }
      }

      setImportResults({
        success: successCount,
        failed: failedCount + validationResults.filter(r => !r.valid).length,
        errors
      });

      setImportComplete(true);

      if (successCount > 0) {
        onImportComplete();
      }
    } catch (error) {
      console.error('Import error:', error);
      alert('Er is een fout opgetreden bij het importeren. Controleer je data formaat.');
    } finally {
      setImporting(false);
    }
  };

  const formatDateForDatabase = (dateStr: string): string | null => {
    if (!dateStr?.trim()) return null;
    
    const trimmed = dateStr.trim();
    
    // Try DD-MM-YYYY or DD/MM/YYYY
    if (trimmed.match(/^\d{1,2}[-/]\d{1,2}[-/]\d{4}$/)) {
      const parts = trimmed.split(/[-/]/);
      const date = new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
      if (!isNaN(date.getTime())) {
        return date.toISOString().split('T')[0];
      }
    }
    
    // Try YYYY-MM-DD
    if (trimmed.match(/^\d{4}-\d{1,2}-\d{1,2}$/)) {
      const date = new Date(trimmed);
      if (!isNaN(date.getTime())) {
        return date.toISOString().split('T')[0];
      }
    }
    
    return null;
  };

  if (importComplete) {
    return (
      <div className="fixed inset-0 z-50 overflow-y-auto">
        <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
          <div 
            className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
            onClick={onClose}
          />
          
          <div className="relative transform overflow-hidden rounded-lg bg-white px-4 pb-4 pt-5 text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg sm:p-6">
            <div className="text-center">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100 mb-4">
                <CheckCircle className="h-6 w-6 text-green-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Import voltooid</h3>
              <div className="space-y-2 mb-6">
                <p className="text-green-600">✓ {importResults.success} studenten succesvol geïmporteerd</p>
                {importResults.failed > 0 && (
                  <p className="text-red-600">✗ {importResults.failed} studenten gefaald</p>
                )}
              </div>
              
              {importResults.errors.length > 0 && (
                <div className="mb-6 p-4 bg-red-50 rounded-lg text-left">
                  <h4 className="font-medium text-red-800 mb-2">Fouten:</h4>
                  <ul className="text-sm text-red-700 space-y-1 max-h-32 overflow-y-auto">
                    {importResults.errors.slice(0, 10).map((error, index) => (
                      <li key={index}>• {error}</li>
                    ))}
                    {importResults.errors.length > 10 && (
                      <li>... en {importResults.errors.length - 10} meer</li>
                    )}
                  </ul>
                </div>
              )}
              
              <Button onClick={onClose} className="w-full">
                Sluiten
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
        <div 
          className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
          onClick={onClose}
        />
        
        <div className="relative transform overflow-hidden rounded-lg bg-white px-4 pb-4 pt-5 text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-2xl sm:p-6">
          <div className="absolute right-0 top-0 pr-4 pt-4">
            <button
              type="button"
              className="rounded-md bg-white text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
              onClick={onClose}
            >
              <X className="h-6 w-6" />
            </button>
          </div>

          <div className="mb-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Studenten importeren</h2>
            <p className="text-gray-600">Plak je Excel data hieronder en klik op importeren</p>
          </div>

          <div className="space-y-6">
            {/* Instructions */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start">
                <FileText className="w-5 h-5 text-blue-600 mt-0.5 mr-3" />
                <div className="text-sm text-blue-800">
                  <p className="font-medium mb-1">Instructies:</p>
                  <ul className="space-y-1">
                    <li>• Selecteer je data in Excel inclusief headers</li>
                    <li>• Kopieer (Ctrl+C) en plak (Ctrl+V) in het tekstveld hieronder</li>
                    <li>• Verplichte kolommen: Voornaam, Achternaam</li>
                    <li>• Optionele kolommen: Leerlingnummer, Klas, Geboortedatum</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Input Field */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Excel/CSV Data
              </label>
              <textarea
                className="w-full h-64 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 resize-none font-mono text-sm"
                placeholder="Plak hier je Excel data...

Voorbeeld:
Voornaam,Achternaam,Leerlingnummer,Klas,Geboortedatum
Jan,Jansen,12345,3A,01-01-2010
Marie,Pietersen,12346,3A,15-03-2010"
                value={csvData}
                onChange={(e) => setCsvData(e.target.value)}
              />
            </div>

            {/* Validation Results */}
            {validationResults.length > 0 && (
              <div className="border rounded-lg p-4">
                <h3 className="font-medium text-gray-900 mb-3">Validatie resultaten:</h3>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {validationResults.map((result, index) => (
                    <div key={index} className={`flex items-center space-x-2 p-2 rounded ${
                      result.valid ? 'bg-green-50' : 'bg-red-50'
                    }`}>
                      {result.valid ? (
                        <CheckCircle className="w-4 h-4 text-green-600" />
                      ) : (
                        <XCircle className="w-4 h-4 text-red-600" />
                      )}
                      <span className="text-sm">
                        Rij {result.index}: {result.student.first_name} {result.student.last_name}
                        {!result.valid && ` - ${result.errors.join(', ')}`}
                      </span>
                    </div>
                  ))}
                </div>
                <div className="mt-3 text-sm text-gray-600">
                  {validationResults.filter(r => r.valid).length} geldig, {validationResults.filter(r => !r.valid).length} ongeldig
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex justify-end space-x-3">
              <Button variant="secondary" onClick={onClose}>
                Annuleren
              </Button>
              <Button
                onClick={handleValidateAndImport}
                loading={importing}
                disabled={!csvData.trim()}
              >
                <Upload className="w-4 h-4 mr-2" />
                Valideren & Importeren
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}