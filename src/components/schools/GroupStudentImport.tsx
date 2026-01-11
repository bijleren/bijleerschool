import React, { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { Button } from '../ui/Button';
import { X, Upload, FileText, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';
import Papa from 'papaparse';

interface GroupStudentImportProps {
  schoolId: string;
  groupId: string;
  onImportComplete: () => void;
  onClose: () => void;
}

interface ParsedStudent {
  first_name: string;
  last_name: string;
  rowNumber: number;
}

interface MatchResult {
  parsed: ParsedStudent;
  matched: boolean;
  studentId?: string;
  alreadyInGroup?: boolean;
  multipleMatches?: boolean;
  error?: string;
}

export function GroupStudentImport({ schoolId, groupId, onImportComplete, onClose }: GroupStudentImportProps) {
  const [csvData, setCsvData] = useState('');
  const [processing, setProcessing] = useState(false);
  const [matchResults, setMatchResults] = useState<MatchResult[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importComplete, setImportComplete] = useState(false);
  const [importStats, setImportStats] = useState({ added: 0, skipped: 0, errors: 0 });

  const handleProcessData = async () => {
    if (!csvData.trim()) {
      alert('Plak eerst CSV data in het tekstveld');
      return;
    }

    setProcessing(true);
    setMatchResults([]);

    try {
      const text = csvData;

      // Auto-detect delimiter (tab for Excel/Sheets copy-paste, comma for CSV)
      const delimiter = text.includes('\t') ? '\t' : ',';

      const parseResult = Papa.parse(text, {
        header: true,
        skipEmptyLines: true,
        delimiter: delimiter,
      });

      const rows = parseResult.data as any[];

      if (rows.length === 0) {
        alert('Geen geldige data gevonden. Controleer je CSV formaat.');
        setProcessing(false);
        return;
      }

      const headers = Object.keys(rows[0]);
      let firstNameField = '';
      let lastNameField = '';

      headers.forEach(header => {
        const normalized = header.toLowerCase().trim().replace(/[_\s]/g, '');
        if (normalized.includes('voornaam') || normalized.includes('first') || normalized === 'naam' || normalized === 'name') {
          if (!firstNameField) firstNameField = header;
        } else if (normalized.includes('achternaam') || normalized.includes('last') || normalized.includes('achter')) {
          lastNameField = header;
        }
      });

      if (!firstNameField || !lastNameField) {
        alert('Kan kolommen voor voornaam en achternaam niet vinden.\n\nZorg ervoor dat de eerste rij kolomnamen bevat zoals:\n- "voornaam" en "achternaam"\n- "first_name" en "last_name"\n\nOf kopieer direct vanuit Excel/Sheets met headers.');
        setProcessing(false);
        return;
      }

      const parsedStudents: ParsedStudent[] = rows.map((row, index) => ({
        first_name: (row[firstNameField] || '').trim(),
        last_name: (row[lastNameField] || '').trim(),
        rowNumber: index + 2
      })).filter(s => s.first_name && s.last_name);

      const { data: schoolStudents, error: studentsError } = await supabase
        .from('students')
        .select('id, first_name, last_name')
        .eq('school_id', schoolId)
        .eq('is_active', true);

      if (studentsError) throw studentsError;

      const { data: existingGroupStudents, error: groupError } = await supabase
        .from('student_groups')
        .select('student_id')
        .eq('group_id', groupId)
        .eq('is_active', true);

      if (groupError) throw groupError;

      const existingStudentIds = new Set(existingGroupStudents?.map(gs => gs.student_id) || []);

      const results: MatchResult[] = parsedStudents.map(parsed => {
        const matches = schoolStudents?.filter(s =>
          s.first_name.toLowerCase() === parsed.first_name.toLowerCase() &&
          s.last_name.toLowerCase() === parsed.last_name.toLowerCase()
        ) || [];

        if (matches.length === 0) {
          return {
            parsed,
            matched: false,
            error: 'Student niet gevonden in school'
          };
        }

        if (matches.length > 1) {
          return {
            parsed,
            matched: false,
            multipleMatches: true,
            error: `${matches.length} studenten gevonden met deze naam`
          };
        }

        const student = matches[0];
        const alreadyInGroup = existingStudentIds.has(student.id);

        return {
          parsed,
          matched: true,
          studentId: student.id,
          alreadyInGroup
        };
      });

      setMatchResults(results);
      setShowResults(true);
    } catch (error) {
      console.error('Error processing file:', error);
      alert('Fout bij verwerken van bestand');
    } finally {
      setProcessing(false);
    }
  };

  const handleImport = async () => {
    const studentsToAdd = matchResults.filter(r => r.matched && !r.alreadyInGroup && r.studentId);

    if (studentsToAdd.length === 0) {
      alert('Geen studenten om toe te voegen');
      return;
    }

    setImporting(true);

    try {
      const insertData = studentsToAdd.map(result => ({
        student_id: result.studentId!,
        group_id: groupId,
        is_active: true
      }));

      const { error } = await supabase
        .from('student_groups')
        .insert(insertData);

      if (error) throw error;

      const alreadyInGroupCount = matchResults.filter(r => r.matched && r.alreadyInGroup).length;
      const errorCount = matchResults.filter(r => !r.matched).length;

      setImportStats({
        added: studentsToAdd.length,
        skipped: alreadyInGroupCount,
        errors: errorCount
      });

      setImportComplete(true);
      onImportComplete();
    } catch (error) {
      console.error('Error importing students:', error);
      alert('Fout bij importeren van studenten');
    } finally {
      setImporting(false);
    }
  };

  const downloadTemplate = () => {
    const csvContent = 'voornaam,achternaam\nJan,Jansen\nMarie,Pietersen\n';
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'groep_studenten_template.csv';
    link.click();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-bold text-gray-900">Studenten Importeren naar Groep</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {!importComplete ? (
            <>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-blue-800">
                    <p className="font-medium mb-2">Let op:</p>
                    <ul className="list-disc ml-4 space-y-1">
                      <li>Plak CSV data met kolommen "voornaam" en "achternaam" (of kopieer direct vanuit Excel/Google Sheets)</li>
                      <li>Alleen bestaande studenten in de school worden gematcht</li>
                      <li>Studenten die al in de groep zitten worden overgeslagen</li>
                      <li>Bij meerdere studenten met dezelfde naam wordt geen match gemaakt</li>
                    </ul>
                  </div>
                </div>
              </div>

              <div>
                <Button variant="secondary" onClick={downloadTemplate} className="mb-4">
                  <FileText className="w-4 h-4 mr-2" />
                  Download Template
                </Button>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Plak CSV Data
                </label>
                <textarea
                  value={csvData}
                  onChange={(e) => setCsvData(e.target.value)}
                  placeholder="Plak hier je CSV data (bijv. gekopieerd vanuit Excel of Google Sheets)&#10;&#10;voornaam,achternaam&#10;Jan,Jansen&#10;Marie,Pietersen"
                  className="w-full h-64 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Tip: Kopieer cellen uit Excel/Google Sheets en plak ze hier
                </p>
              </div>

              {csvData.trim() && !showResults && (
                <Button onClick={handleProcessData} loading={processing}>
                  <Upload className="w-4 h-4 mr-2" />
                  Data Verwerken
                </Button>
              )}

              {showResults && matchResults.length > 0 && (
                <div className="space-y-4">
                  <div className="grid grid-cols-3 gap-4">
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                      <div className="flex items-center gap-2 text-green-800">
                        <CheckCircle className="w-5 h-5" />
                        <div>
                          <div className="text-2xl font-bold">
                            {matchResults.filter(r => r.matched && !r.alreadyInGroup).length}
                          </div>
                          <div className="text-sm">Toe te voegen</div>
                        </div>
                      </div>
                    </div>

                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                      <div className="flex items-center gap-2 text-yellow-800">
                        <AlertTriangle className="w-5 h-5" />
                        <div>
                          <div className="text-2xl font-bold">
                            {matchResults.filter(r => r.matched && r.alreadyInGroup).length}
                          </div>
                          <div className="text-sm">Al in groep</div>
                        </div>
                      </div>
                    </div>

                    <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                      <div className="flex items-center gap-2 text-red-800">
                        <XCircle className="w-5 h-5" />
                        <div>
                          <div className="text-2xl font-bold">
                            {matchResults.filter(r => !r.matched).length}
                          </div>
                          <div className="text-sm">Niet gevonden</div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="border rounded-lg max-h-96 overflow-y-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50 sticky top-0">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Rij</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Voornaam</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Achternaam</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {matchResults.map((result, index) => (
                          <tr key={index} className="hover:bg-gray-50">
                            <td className="px-4 py-3 text-sm text-gray-900">{result.parsed.rowNumber}</td>
                            <td className="px-4 py-3 text-sm text-gray-900">{result.parsed.first_name}</td>
                            <td className="px-4 py-3 text-sm text-gray-900">{result.parsed.last_name}</td>
                            <td className="px-4 py-3 text-sm">
                              {result.matched && !result.alreadyInGroup && (
                                <span className="flex items-center gap-1 text-green-600">
                                  <CheckCircle className="w-4 h-4" />
                                  Wordt toegevoegd
                                </span>
                              )}
                              {result.matched && result.alreadyInGroup && (
                                <span className="flex items-center gap-1 text-yellow-600">
                                  <AlertTriangle className="w-4 h-4" />
                                  Al in groep
                                </span>
                              )}
                              {!result.matched && (
                                <span className="flex items-center gap-1 text-red-600">
                                  <XCircle className="w-4 h-4" />
                                  {result.error}
                                </span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="flex gap-3">
                    <Button
                      onClick={handleImport}
                      loading={importing}
                      disabled={matchResults.filter(r => r.matched && !r.alreadyInGroup).length === 0}
                    >
                      <Upload className="w-4 h-4 mr-2" />
                      Importeren ({matchResults.filter(r => r.matched && !r.alreadyInGroup).length} studenten)
                    </Button>
                    <Button variant="secondary" onClick={onClose}>
                      Annuleren
                    </Button>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-8">
              <CheckCircle className="w-16 h-16 text-green-600 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-gray-900 mb-2">Import Voltooid!</h3>
              <div className="space-y-2 mb-6">
                <p className="text-gray-600">
                  <span className="font-semibold text-green-600">{importStats.added}</span> studenten toegevoegd
                </p>
                {importStats.skipped > 0 && (
                  <p className="text-gray-600">
                    <span className="font-semibold text-yellow-600">{importStats.skipped}</span> studenten overgeslagen (al in groep)
                  </p>
                )}
                {importStats.errors > 0 && (
                  <p className="text-gray-600">
                    <span className="font-semibold text-red-600">{importStats.errors}</span> studenten niet gevonden
                  </p>
                )}
              </div>
              <Button onClick={onClose}>
                Sluiten
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
