import React, { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { Button } from '../ui/Button';
import {
  X,
  Upload,
  FileText,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Users,
  Plus,
  ArrowRight,
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

interface GroupInfo {
  name: string;
  studentCount: number;
  existsInDb: boolean;
  existingGroupId?: string;
}

type Step = 'input' | 'groups' | 'done';

export function StudentImport({ schoolId, onImportComplete, onClose }: StudentImportProps) {
  const [csvData, setCsvData] = useState('');
  const [step, setStep] = useState<Step>('input');
  const [validationResults, setValidationResults] = useState<ValidationResult[]>([]);
  const [groupInfos, setGroupInfos] = useState<GroupInfo[]>([]);
  const [createMissingGroups, setCreateMissingGroups] = useState(true);
  const [assignToGroups, setAssignToGroups] = useState(true);
  const [parsing, setParsing] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importResults, setImportResults] = useState<{
    success: number;
    failed: number;
    groupsCreated: number;
    errors: string[];
  }>({ success: 0, failed: 0, groupsCreated: 0, errors: [] });
  const [headerErrors, setHeaderErrors] = useState<{
    unrecognized: string[];
    missingRequired: string[];
  } | null>(null);

  const parseAndValidate = async () => {
    if (!csvData.trim()) return;
    setParsing(true);
    setHeaderErrors(null);

    try {
      const delimiter = csvData.includes('\t') ? '\t' : csvData.includes(';') ? ';' : ',';
      const parseResult = Papa.parse(csvData, { header: true, skipEmptyLines: true, delimiter });
      const rows = parseResult.data as any[];

      if (rows.length === 0) {
        alert('Geen geldige data gevonden. Controleer je CSV formaat.');
        setParsing(false);
        return;
      }

      const headers = Object.keys(rows[0]);
      const fieldMapping = { first_name: '', last_name: '', student_number: '', grade_level: '', date_of_birth: '' };
      const recognizedHeaders = new Set<string>();

      headers.forEach(header => {
        const n = header.toLowerCase().trim();
        if (n.includes('voornaam') || n.includes('first')) { fieldMapping.first_name = header; recognizedHeaders.add(header); }
        else if (n.includes('achternaam') || n.includes('last')) { fieldMapping.last_name = header; recognizedHeaders.add(header); }
        else if (n.includes('nummer') || n.includes('number')) { fieldMapping.student_number = header; recognizedHeaders.add(header); }
        else if (n.includes('klas') || n.includes('grade') || n.includes('groep')) { fieldMapping.grade_level = header; recognizedHeaders.add(header); }
        else if (n.includes('geboorte') || n.includes('birth') || n.includes('datum')) { fieldMapping.date_of_birth = header; recognizedHeaders.add(header); }
      });

      const unrecognized = headers.filter(h => !recognizedHeaders.has(h));
      const missingRequired: string[] = [];
      if (!fieldMapping.first_name) missingRequired.push('Voornaam');
      if (!fieldMapping.last_name) missingRequired.push('Achternaam');

      if (unrecognized.length > 0 || missingRequired.length > 0) {
        setHeaderErrors({ unrecognized, missingRequired });
        setParsing(false);
        return;
      }

      const students = rows.map(row => ({
        first_name: row[fieldMapping.first_name] || '',
        last_name: row[fieldMapping.last_name] || '',
        student_number: row[fieldMapping.student_number] || '',
        grade_level: row[fieldMapping.grade_level] || '',
        date_of_birth: row[fieldMapping.date_of_birth] || '',
      }));

      const results = students.map((student, index) => {
        const errors: string[] = [];
        if (!student.first_name?.trim()) errors.push('Voornaam is verplicht');
        if (!student.last_name?.trim()) errors.push('Achternaam is verplicht');

        if (student.date_of_birth?.trim()) {
          const ds = student.date_of_birth.trim();
          let parsed: Date | null = null;
          if (ds.match(/^\d{1,2}[-/.]\d{1,2}[-/.]\d{4}$/)) {
            const p = ds.split(/[-/.]/);
            parsed = new Date(parseInt(p[2]), parseInt(p[1]) - 1, parseInt(p[0]));
          } else if (ds.match(/^\d{4}-\d{1,2}-\d{1,2}$/)) {
            parsed = new Date(ds);
          }
          if (!parsed || isNaN(parsed.getTime())) {
            errors.push('Ongeldige geboortedatum (gebruik DD-MM-YYYY of YYYY-MM-DD)');
          }
        }

        return { valid: errors.length === 0, errors, student, index: index + 1 };
      });

      setValidationResults(results);

      // Detect unique class names from valid students
      const validStudents = results.filter(r => r.valid);
      const classNames = [...new Set(
        validStudents
          .map(r => r.student.grade_level?.trim())
          .filter(Boolean)
      )] as string[];

      if (classNames.length === 0) {
        // No classes in data — skip group step, go straight to import
        await runImport(results, [], false, false);
        return;
      }

      // Check which groups already exist
      const { data: existingGroups } = await supabase
        .from('groups')
        .select('id, name')
        .eq('school_id', schoolId)
        .eq('is_active', true)
        .in('name', classNames);

      const existingMap = new Map((existingGroups || []).map(g => [g.name, g.id]));

      const infos: GroupInfo[] = classNames.map(name => ({
        name,
        studentCount: validStudents.filter(r => r.student.grade_level?.trim() === name).length,
        existsInDb: existingMap.has(name),
        existingGroupId: existingMap.get(name),
      }));

      setGroupInfos(infos);
      setStep('groups');
    } catch (err) {
      console.error('Parse error:', err);
      alert('Er is een fout opgetreden bij het verwerken van de data.');
    } finally {
      setParsing(false);
    }
  };

  const runImport = async (
    results: ValidationResult[],
    groups: GroupInfo[],
    shouldCreateGroups: boolean,
    shouldAssign: boolean,
  ) => {
    setImporting(true);
    let successCount = 0;
    let failedCount = 0;
    let groupsCreated = 0;
    const errors: string[] = [];

    try {
      // Build group id map (create missing ones if requested)
      const groupIdMap = new Map<string, string>();

      for (const info of groups) {
        if (info.existsInDb && info.existingGroupId) {
          groupIdMap.set(info.name, info.existingGroupId);
        } else if (shouldCreateGroups) {
          const { data, error } = await supabase
            .from('groups')
            .insert({ school_id: schoolId, name: info.name, is_active: true })
            .select('id')
            .single();
          if (error) {
            errors.push(`Klas "${info.name}" kon niet aangemaakt worden: ${error.message}`);
          } else {
            groupIdMap.set(info.name, data.id);
            groupsCreated++;
          }
        }
      }

      // Insert valid students
      const validStudents = results.filter(r => r.valid);
      for (const result of validStudents) {
        try {
          const { data: inserted, error } = await supabase
            .from('students')
            .insert({
              school_id: schoolId,
              first_name: result.student.first_name.trim(),
              last_name: result.student.last_name.trim(),
              student_number: result.student.student_number?.trim() || null,
              grade_level: result.student.grade_level?.trim() || null,
              date_of_birth: formatDateForDatabase(result.student.date_of_birth || ''),
              color: '#3B82F6',
            })
            .select('id')
            .single();

          if (error) {
            failedCount++;
            errors.push(`Rij ${result.index}: ${error.message}`);
            continue;
          }

          successCount++;

          // Assign to group
          if (shouldAssign && result.student.grade_level?.trim()) {
            const groupId = groupIdMap.get(result.student.grade_level.trim());
            if (groupId) {
              await supabase.from('student_groups').insert({
                student_id: inserted.id,
                group_id: groupId,
              });
            }
          }
        } catch {
          failedCount++;
          errors.push(`Rij ${result.index}: Onbekende fout`);
        }
      }

      // Count invalid rows as failed too
      failedCount += results.filter(r => !r.valid).length;

      setImportResults({ success: successCount, failed: failedCount, groupsCreated, errors });
      setStep('done');

      if (successCount > 0) onImportComplete();
    } catch (err) {
      console.error('Import error:', err);
      alert('Er is een fout opgetreden bij het importeren.');
    } finally {
      setImporting(false);
    }
  };

  const formatDateForDatabase = (dateStr: string): string | null => {
    if (!dateStr?.trim()) return null;
    const trimmed = dateStr.trim();
    if (trimmed.match(/^\d{1,2}[-/.]\d{1,2}[-/.]\d{4}$/)) {
      const p = trimmed.split(/[-/.]/);
      const d = new Date(parseInt(p[2]), parseInt(p[1]) - 1, parseInt(p[0]));
      if (!isNaN(d.getTime())) return d.toISOString().split('T')[0];
    }
    if (trimmed.match(/^\d{4}-\d{1,2}-\d{1,2}$/)) {
      const d = new Date(trimmed);
      if (!isNaN(d.getTime())) return d.toISOString().split('T')[0];
    }
    return null;
  };

  const validCount = validationResults.filter(r => r.valid).length;
  const invalidCount = validationResults.filter(r => !r.valid).length;
  const missingGroups = groupInfos.filter(g => !g.existsInDb);
  const existingGroups = groupInfos.filter(g => g.existsInDb);

  // --- Done screen ---
  if (step === 'done') {
    return (
      <div className="fixed inset-0 z-50 overflow-y-auto">
        <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
          <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={onClose} />
          <div className="relative transform overflow-hidden rounded-lg bg-white px-4 pb-4 pt-5 text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg sm:p-6">
            <div className="text-center">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100 mb-4">
                <CheckCircle className="h-6 w-6 text-green-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Import voltooid</h3>
              <div className="space-y-2 mb-6 text-sm">
                <p className="text-green-700 flex items-center justify-center gap-2">
                  <CheckCircle className="w-4 h-4" />
                  {importResults.success} leerlingen succesvol geïmporteerd
                </p>
                {importResults.groupsCreated > 0 && (
                  <p className="text-blue-700 flex items-center justify-center gap-2">
                    <Plus className="w-4 h-4" />
                    {importResults.groupsCreated} klassen aangemaakt
                  </p>
                )}
                {importResults.failed > 0 && (
                  <p className="text-red-600 flex items-center justify-center gap-2">
                    <XCircle className="w-4 h-4" />
                    {importResults.failed} rijen mislukt
                  </p>
                )}
              </div>
              {importResults.errors.length > 0 && (
                <div className="mb-6 p-4 bg-red-50 rounded-lg text-left">
                  <h4 className="font-medium text-red-800 mb-2">Fouten:</h4>
                  <ul className="text-sm text-red-700 space-y-1 max-h-32 overflow-y-auto">
                    {importResults.errors.slice(0, 10).map((e, i) => (
                      <li key={i}>• {e}</li>
                    ))}
                    {importResults.errors.length > 10 && (
                      <li>... en {importResults.errors.length - 10} meer</li>
                    )}
                  </ul>
                </div>
              )}
              <Button onClick={onClose} className="w-full">Sluiten</Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // --- Group confirmation screen ---
  if (step === 'groups') {
    return (
      <div className="fixed inset-0 z-50 overflow-y-auto">
        <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
          <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={onClose} />
          <div className="relative transform overflow-hidden rounded-lg bg-white px-4 pb-4 pt-5 text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-2xl sm:p-6">
            <div className="absolute right-0 top-0 pr-4 pt-4">
              <button
                type="button"
                className="rounded-md bg-white text-gray-400 hover:text-gray-500"
                onClick={onClose}
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <div className="mb-6">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                  <Users className="w-4 h-4 text-blue-600" />
                </div>
                <h2 className="text-xl font-bold text-gray-900">Klassen gevonden in je import</h2>
              </div>
              <p className="text-gray-500 text-sm ml-11">
                We hebben {groupInfos.length} klas{groupInfos.length !== 1 ? 'sen' : ''} herkend in je data. Wil je leerlingen automatisch aan klassen koppelen?
              </p>
            </div>

            {/* Summary badges */}
            <div className="flex gap-3 mb-5 ml-0">
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium bg-blue-50 text-blue-700 border border-blue-200">
                <Users className="w-3.5 h-3.5" />
                {validCount} leerling{validCount !== 1 ? 'en' : ''}
              </span>
              {existingGroups.length > 0 && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium bg-green-50 text-green-700 border border-green-200">
                  <CheckCircle className="w-3.5 h-3.5" />
                  {existingGroups.length} klas{existingGroups.length !== 1 ? 'sen' : ''} bestaan al
                </span>
              )}
              {missingGroups.length > 0 && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium bg-amber-50 text-amber-700 border border-amber-200">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  {missingGroups.length} nieuw{missingGroups.length !== 1 ? 'e' : ''}
                </span>
              )}
            </div>

            {/* Class list */}
            <div className="border border-gray-200 rounded-lg overflow-hidden mb-5">
              <div className="bg-gray-50 px-4 py-2.5 border-b border-gray-200">
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Klassen in import</span>
              </div>
              <div className="divide-y divide-gray-100 max-h-52 overflow-y-auto">
                {groupInfos.map(info => (
                  <div key={info.name} className="flex items-center justify-between px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className={`w-2 h-2 rounded-full flex-shrink-0 ${info.existsInDb ? 'bg-green-500' : 'bg-amber-400'}`} />
                      <span className="font-medium text-gray-900">{info.name}</span>
                      <span className="text-xs text-gray-400">{info.studentCount} leerling{info.studentCount !== 1 ? 'en' : ''}</span>
                    </div>
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                      info.existsInDb
                        ? 'bg-green-50 text-green-700'
                        : 'bg-amber-50 text-amber-700'
                    }`}>
                      {info.existsInDb ? 'Bestaat al' : 'Nieuw aan te maken'}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Options */}
            <div className="space-y-3 mb-6">
              {missingGroups.length > 0 && (
                <label className="flex items-start gap-3 p-3 rounded-lg border border-gray-200 cursor-pointer hover:bg-gray-50 transition-colors">
                  <input
                    type="checkbox"
                    checked={createMissingGroups}
                    onChange={e => setCreateMissingGroups(e.target.checked)}
                    className="mt-0.5 w-4 h-4 text-blue-600 rounded border-gray-300"
                  />
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      Maak {missingGroups.length} ontbrekende klas{missingGroups.length !== 1 ? 'sen' : ''} aan
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {missingGroups.map(g => g.name).join(', ')}
                    </p>
                  </div>
                </label>
              )}
              <label className="flex items-start gap-3 p-3 rounded-lg border border-gray-200 cursor-pointer hover:bg-gray-50 transition-colors">
                <input
                  type="checkbox"
                  checked={assignToGroups}
                  onChange={e => setAssignToGroups(e.target.checked)}
                  className="mt-0.5 w-4 h-4 text-blue-600 rounded border-gray-300"
                />
                <div>
                  <p className="text-sm font-medium text-gray-900">Koppel leerlingen automatisch aan hun klas</p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Leerlingen worden direct ingeschreven in de klas uit de import
                  </p>
                </div>
              </label>
            </div>

            {invalidCount > 0 && (
              <div className="mb-5 p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
                <p className="text-sm text-amber-800">
                  {invalidCount} rij{invalidCount !== 1 ? 'en' : ''} met fouten worden overgeslagen.
                </p>
              </div>
            )}

            <div className="flex justify-between items-center">
              <button
                onClick={() => setStep('input')}
                className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
              >
                Terug
              </button>
              <div className="flex gap-3">
                <Button variant="secondary" onClick={onClose}>Annuleren</Button>
                <Button
                  onClick={() => runImport(validationResults, groupInfos, createMissingGroups, assignToGroups)}
                  loading={importing}
                >
                  <ArrowRight className="w-4 h-4 mr-2" />
                  Importeren ({validCount} leerling{validCount !== 1 ? 'en' : ''})
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // --- Input screen ---
  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={onClose} />
        <div className="relative transform overflow-hidden rounded-lg bg-white px-4 pb-4 pt-5 text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-2xl sm:p-6">
          <div className="absolute right-0 top-0 pr-4 pt-4">
            <button
              type="button"
              className="rounded-md bg-white text-gray-400 hover:text-gray-500"
              onClick={onClose}
            >
              <X className="h-6 w-6" />
            </button>
          </div>

          <div className="mb-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-1">Studenten importeren</h2>
            <p className="text-gray-500 text-sm">Plak je Excel data hieronder en klik op valideren</p>
          </div>

          <div className="space-y-5">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start">
                <FileText className="w-5 h-5 text-blue-600 mt-0.5 mr-3 flex-shrink-0" />
                <div className="text-sm text-blue-800">
                  <p className="font-semibold mb-1.5">Instructies:</p>
                  <ul className="space-y-1">
                    <li>• Selecteer je data in Excel inclusief headers</li>
                    <li>• Kopieer (Ctrl+C) en plak (Ctrl+V) in het tekstveld hieronder</li>
                    <li>• Scheidingsteken wordt automatisch herkend (komma, puntkomma of tab)</li>
                    <li>• Verplichte kolommen: <strong>Voornaam, Achternaam</strong></li>
                    <li>• Optionele kolommen: Leerlingnummer, <strong>Klas</strong>, Geboortedatum</li>
                  </ul>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Excel/CSV Data</label>
              <textarea
                className="w-full h-64 px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none font-mono text-sm"
                placeholder={`Plak hier je Excel data (komma, puntkomma of tab gescheiden)...\n\nVoorbeeld:\nVoornaam\tAchternaam\tLeerlingnummer\tKlas\tGeboortedatum\nJan\tJansen\t12345\t3A\t01-01-2010\nMarie\tPietersen\t12346\t3A\t15-03-2010`}
                value={csvData}
                onChange={e => { setCsvData(e.target.value); setHeaderErrors(null); }}
              />
            </div>

            {headerErrors && (
              <div className="rounded-xl border border-red-200 bg-red-50 p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0" />
                  <p className="text-sm font-semibold text-red-800">Kolomnamen niet herkend</p>
                </div>

                {headerErrors.missingRequired.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-red-700 mb-1">Verplichte kolommen ontbreken:</p>
                    <div className="flex flex-wrap gap-1.5">
                      {headerErrors.missingRequired.map(col => (
                        <span key={col} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-red-100 border border-red-300 text-red-800 text-xs font-mono font-medium">
                          <XCircle className="w-3 h-3" /> {col}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {headerErrors.unrecognized.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-red-700 mb-1">
                      Deze kolomnamen worden niet herkend:
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {headerErrors.unrecognized.map(col => (
                        <span key={col} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-white border border-red-300 text-red-700 text-xs font-mono">
                          &quot;{col}&quot;
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                <div className="pt-1 border-t border-red-200">
                  <p className="text-xs text-red-600">
                    Gebruik de volgende kolomnamen (hoofdlettergevoelig maakt niet uit):
                  </p>
                  <div className="flex flex-wrap gap-1.5 mt-1.5">
                    {['Voornaam', 'Achternaam', 'Leerlingnummer', 'Klas', 'Geboortedatum'].map(col => (
                      <span key={col} className="px-2 py-0.5 rounded-md bg-white border border-gray-300 text-gray-700 text-xs font-mono">
                        {col}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            )}

            <div className="flex justify-end space-x-3">
              <Button variant="secondary" onClick={onClose}>Annuleren</Button>
              <Button
                onClick={parseAndValidate}
                loading={parsing}
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
