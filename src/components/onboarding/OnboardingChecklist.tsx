import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import {
  CheckCircle2,
  Circle,
  GraduationCap,
  BookOpen,
  Users,
  UserPlus,
  Upload,
  Settings,
  ArrowRight,
  Sparkles,
  School,
  ChevronRight,
  Hash,
  ImagePlus,
  Link,
  Clock,
} from 'lucide-react';

interface OnboardingChecklistProps {
  focusSchool: { id: string; name: string; school_code?: string } | null;
  onNavigateToSchools: () => void;
  onNavigateToWebWijzer?: () => void;
  onNavigateToSchoolDay?: () => void;
}

interface ChecklistItem {
  id: string;
  title: string;
  description: string;
  tip: string;
  icon: React.ReactNode;
  actionLabel: string;
  onAction: () => void;
  done: boolean;
}

export function OnboardingChecklist({ focusSchool, onNavigateToSchools, onNavigateToWebWijzer, onNavigateToSchoolDay }: OnboardingChecklistProps) {
  const { user } = useAuth();
  const [hasStudents, setHasStudents] = useState(false);
  const [hasGroups, setHasGroups] = useState(false);
  const [hasSubjects, setHasSubjects] = useState(false);
  const [hasGrades, setHasGrades] = useState(false);
  const [hasTeamMembers, setHasTeamMembers] = useState(false);
  const [hasEnrichedProfiles, setHasEnrichedProfiles] = useState(false);
  const [hasWebWijzerCards, setHasWebWijzerCards] = useState(false);
  const [hasActiveTemplate, setHasActiveTemplate] = useState(false);
  const [schoolCode, setSchoolCode] = useState('');
  const [loading, setLoading] = useState(true);
  const [expandedItem, setExpandedItem] = useState<string | null>('students');

  useEffect(() => {
    if (focusSchool?.id) {
      fetchChecklistStatus();
    }
  }, [focusSchool?.id]);

  const fetchChecklistStatus = async () => {
    if (!focusSchool?.id) return;
    setLoading(true);

    try {
      const [studentsRes, groupsRes, subjectsRes, gradesRes, teamRes, schoolRes, enrichedRes, webwijzerRes, templateRes] = await Promise.all([
        supabase.from('students').select('id', { count: 'exact', head: true }).eq('school_id', focusSchool.id).eq('is_active', true),
        supabase.from('groups').select('id', { count: 'exact', head: true }).eq('school_id', focusSchool.id).eq('is_active', true),
        supabase.from('school_subjects').select('id', { count: 'exact', head: true }).eq('school_id', focusSchool.id).eq('is_active', true),
        supabase.from('school_grades').select('id', { count: 'exact', head: true }).eq('school_id', focusSchool.id).eq('is_active', true),
        supabase.from('user_schools').select('id', { count: 'exact', head: true }).eq('school_id', focusSchool.id).eq('status', 'approved').eq('is_active', true),
        supabase.from('schools').select('school_code').eq('id', focusSchool.id).maybeSingle(),
        supabase.from('students').select('id', { count: 'exact', head: true }).eq('school_id', focusSchool.id).eq('is_active', true).not('profile_picture_url', 'is', null),
        supabase.from('webwijzer_content').select('id', { count: 'exact', head: true }).eq('school_id', focusSchool.id),
        supabase.from('school_day_templates').select('id', { count: 'exact', head: true }).eq('school_id', focusSchool.id),
      ]);

      setHasStudents((studentsRes.count ?? 0) > 0);
      setHasGroups((groupsRes.count ?? 0) > 0);
      setHasSubjects((subjectsRes.count ?? 0) > 0);
      setHasGrades((gradesRes.count ?? 0) > 0);
      setHasTeamMembers((teamRes.count ?? 0) > 1);
      setSchoolCode(schoolRes.data?.school_code ?? focusSchool.school_code ?? '');
      setHasEnrichedProfiles((enrichedRes.count ?? 0) > 0);
      setHasWebWijzerCards((webwijzerRes.count ?? 0) > 0);
      setHasActiveTemplate((templateRes.count ?? 0) > 0);
    } catch (err) {
      console.error('Error fetching checklist status:', err);
    } finally {
      setLoading(false);
    }
  };

  const completedCount = [hasStudents, hasSubjects, hasGrades, hasGroups, hasTeamMembers, hasEnrichedProfiles, hasWebWijzerCards, hasActiveTemplate].filter(Boolean).length;
  const totalCount = 8;
  const progressPercent = Math.round((completedCount / totalCount) * 100);

  const items: ChecklistItem[] = [
    {
      id: 'students',
      title: 'Leerlingen toevoegen',
      description: 'Voeg je leerlingen toe aan de school. Je kunt ze één voor één invoeren of gebruik de handige importfunctie om ze in bulk te uploaden via een CSV-bestand.',
      tip: 'Gebruik de importfunctie om snel een grote groep leerlingen toe te voegen. Ga naar Scholen > jouw school > Leerlingen > Importeren.',
      icon: <GraduationCap className="w-5 h-5" />,
      actionLabel: 'Ga naar leerlingen',
      onAction: onNavigateToSchools,
      done: hasStudents,
    },
    {
      id: 'subjects',
      title: 'Vakken instellen',
      description: 'Definieer de vakken die op jouw school gegeven worden. Deze worden gebruikt bij het plannen van lessen en het bijhouden van technieken per vak.',
      tip: 'Je vindt vakken beheren via Scholen > jouw school > tabblad "Vakken".',
      icon: <BookOpen className="w-5 h-5" />,
      actionLabel: 'Vakken instellen',
      onAction: onNavigateToSchools,
      done: hasSubjects,
    },
    {
      id: 'grades',
      title: 'Leerjaren definiëren',
      description: 'Stel de leerjaren en niveaus in die op jouw school voorkomen. Dit geeft structuur aan je klassen en maakt rapportages overzichtelijker.',
      tip: 'Leerjaren beheer je via Scholen > jouw school > tabblad "Leerjaren".',
      icon: <Settings className="w-5 h-5" />,
      actionLabel: 'Leerjaren instellen',
      onAction: onNavigateToSchools,
      done: hasGrades,
    },
    {
      id: 'groups',
      title: 'Klassen aanmaken',
      description: 'Maak klassen aan en koppel leerlingen eraan. Klassen maken het makkelijker om groepen leerlingen samen te beheren. Ook hier is een importfunctie beschikbaar.',
      tip: 'Klassen vind je via Scholen > jouw school > tabblad "Klassen". Leerlingen koppel je via de klas.',
      icon: <Users className="w-5 h-5" />,
      actionLabel: 'Klassen beheren',
      onAction: onNavigateToSchools,
      done: hasGroups,
    },
    {
      id: 'team',
      title: 'Collega\'s uitnodigen',
      description: 'Laat collega\'s aansluiten bij jouw school door hen de schoolcode te geven. Zij kunnen die code gebruiken bij het aanmelden om toegang te krijgen.',
      tip: `Deel de schoolcode met je collega's. Ze kunnen inloggen op bijleer.school en de code invoeren om te koppelen.`,
      icon: <UserPlus className="w-5 h-5" />,
      actionLabel: 'Schoolcode bekijken',
      onAction: onNavigateToSchools,
      done: hasTeamMembers,
    },
    {
      id: 'profiles',
      title: 'Leerlingprofielen verrijken',
      description: 'Maak leerlingprofielen persoonlijker door een profielfoto of een herkenbaar pictogram toe te voegen. Dit maakt het makkelijker om leerlingen snel te herkennen in overzichten, op het activiteitenbord en in andere modules.',
      tip: 'Open een leerlingprofiel via Scholen > jouw school > klik op een leerling. Daar vind je de opties voor foto en pictogram bovenaan de profielpagina.',
      icon: <ImagePlus className="w-5 h-5" />,
      actionLabel: 'Ga naar leerlingen',
      onAction: onNavigateToSchools,
      done: hasEnrichedProfiles,
    },
    {
      id: 'webwijzer',
      title: 'WebWijzer-kaarten aanmaken',
      description: 'Met WebWijzer geef je leerlingen veilige toegang tot goedgekeurde websites en digitale tools. Maak kaarten aan met een naam, link en pictogram. Leerlingen scannen een QR-code om meteen naar de juiste pagina te gaan — zonder zelf te hoeven typen.',
      tip: 'Ga naar de WebWijzer-module en klik op "Nieuwe kaart". Voeg een titel, URL en een icoon toe. Je kunt kaarten per klas of groep zichtbaar maken.',
      icon: <Link className="w-5 h-5" />,
      actionLabel: 'Ga naar WebWijzer',
      onAction: onNavigateToWebWijzer ?? onNavigateToSchools,
      done: hasWebWijzerCards,
    },
    {
      id: 'schooluren',
      title: 'Schooluren aanmaken',
      description: 'Stel een dagindeling in voor jouw school door een uurrooster-template aan te maken en te koppelen. Zo weet iedereen wanneer welk vak of welke activiteit plaatsvindt, en kunnen roosters automatisch worden toegepast.',
      tip: 'Ga naar Instellingen > Schooldag, maak een template aan via "Sjablonen" en koppel het daarna via "Koppelingen" aan je school of een klas.',
      icon: <Clock className="w-5 h-5" />,
      actionLabel: 'Ga naar Schooldag',
      onAction: onNavigateToSchoolDay ?? onNavigateToSchools,
      done: hasActiveTemplate,
    },
  ];

  if (!focusSchool) {
    return (
      <div className="max-w-2xl mx-auto text-center py-16">
        <School className="w-16 h-16 text-gray-300 mx-auto mb-4" />
        <h2 className="text-xl font-semibold text-gray-700 mb-2">Geen school geselecteerd</h2>
        <p className="text-gray-500 mb-6">Koppel eerst een school om aan de slag te gaan.</p>
        <Button onClick={onNavigateToSchools}>
          <School className="w-4 h-4 mr-2" />
          Scholen beheren
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      {/* Welcome hero */}
      <div className="rounded-2xl bg-blue-600 px-8 py-10 text-white">
        <div>
          <div className="flex items-center space-x-2 mb-3">
            <Sparkles className="w-5 h-5 text-blue-200" />
            <span className="text-blue-200 text-sm font-medium uppercase tracking-wide">Welkom bij bijleer.school</span>
          </div>
          <h1 className="text-3xl font-bold mb-2">Ontdek bijleer.school</h1>
          <p className="text-blue-100 text-lg leading-relaxed max-w-lg">
            Laten we samen jouw school klaarzetten. Volg de stappen hieronder om alles in te stellen — het duurt maar een paar minuten.
          </p>
        </div>
      </div>

      {/* Progress */}
      <Card>
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="font-semibold text-gray-900">Voortgang instellen</h2>
            <p className="text-sm text-gray-500">{completedCount} van {totalCount} stappen voltooid</p>
          </div>
          <span className="text-2xl font-bold text-blue-600">{progressPercent}%</span>
        </div>
        <div className="w-full bg-gray-100 rounded-full h-2.5">
          <div
            className="bg-blue-600 h-2.5 rounded-full transition-all duration-700"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
        {progressPercent === 100 && (
          <div className="mt-4 flex items-center space-x-2 text-green-700 bg-green-50 rounded-lg px-4 py-3">
            <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
            <span className="text-sm font-medium">Geweldig! Je school is volledig ingesteld. Je kunt nu optimaal gebruik maken van bijleer.school.</span>
          </div>
        )}
      </Card>

      {/* School code highlight */}
      {schoolCode && (
        <div className="flex items-center space-x-4 bg-amber-50 border border-amber-200 rounded-xl px-6 py-4">
          <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center flex-shrink-0">
            <Hash className="w-5 h-5 text-amber-600" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium text-amber-900">Jouw schoolcode</p>
            <p className="text-xs text-amber-700">Deel deze code met collega's zodat zij kunnen aansluiten</p>
          </div>
          <div className="bg-white border border-amber-300 rounded-lg px-4 py-2">
            <span className="text-xl font-mono font-bold text-amber-800 tracking-widest">{schoolCode}</span>
          </div>
        </div>
      )}

      {/* Checklist */}
      <div className="space-y-3">
        <h2 className="text-lg font-semibold text-gray-900">Aan de slag</h2>
        {loading ? (
          <div className="space-y-3">
            {[1,2,3,4,5].map(i => (
              <div key={i} className="h-16 bg-gray-100 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : (
          items.map((item, index) => (
            <div
              key={item.id}
              className={`rounded-xl border transition-all duration-200 ${
                item.done
                  ? 'border-green-200 bg-green-50'
                  : expandedItem === item.id
                  ? 'border-blue-200 bg-blue-50'
                  : 'border-gray-200 bg-white hover:border-gray-300'
              }`}
            >
              <button
                className="w-full text-left px-5 py-4 flex items-center space-x-4"
                onClick={() => setExpandedItem(expandedItem === item.id ? null : item.id)}
              >
                <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 transition-colors ${
                  item.done ? 'bg-green-500 text-white' : 'bg-gray-100 text-gray-400'
                }`}>
                  {item.done ? (
                    <CheckCircle2 className="w-5 h-5" />
                  ) : (
                    <span className="text-sm font-bold text-gray-500">{index + 1}</span>
                  )}
                </div>
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                  item.done ? 'bg-green-100 text-green-600' : 'bg-blue-100 text-blue-600'
                }`}>
                  {item.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className={`font-semibold ${item.done ? 'text-green-800 line-through' : 'text-gray-900'}`}>
                    {item.title}
                  </h3>
                </div>
                <div className="flex items-center space-x-2 flex-shrink-0">
                  {item.done && (
                    <span className="text-xs font-medium text-green-700 bg-green-100 px-2 py-0.5 rounded-full">Klaar</span>
                  )}
                  <ChevronRight className={`w-4 h-4 text-gray-400 transition-transform ${expandedItem === item.id ? 'rotate-90' : ''}`} />
                </div>
              </button>

              {expandedItem === item.id && (
                <div className="px-5 pb-5">
                  <div className="border-t border-gray-200 pt-4 space-y-4">
                    <p className="text-gray-600 text-sm leading-relaxed">{item.description}</p>
                    <div className="bg-blue-50 border border-blue-100 rounded-lg px-4 py-3 flex items-start space-x-3">
                      <div className="w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                        <span className="text-white text-xs font-bold">!</span>
                      </div>
                      <p className="text-blue-800 text-sm">{item.tip}</p>
                    </div>
                    {!item.done && (
                      <Button size="sm" onClick={item.onAction}>
                        {item.actionLabel}
                        <ArrowRight className="w-4 h-4 ml-2" />
                      </Button>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
