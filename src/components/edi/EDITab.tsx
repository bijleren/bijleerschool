import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import {
  Edit2,
  Users,
  Clock,
  MessageCircle,
  UserPlus,
  CheckCircle,
  Volume2,
  Eye,
  BookOpen,
  Move,
  UserCheck,
  Hand,
  FileText,
  MessageSquare,
  AlertTriangle,
  Mic,
  Brain,
  Presentation,
  Play,
  Home,
  Book
} from 'lucide-react';

interface Student {
  id: string;
  first_name: string;
  last_name: string;
}

interface StudentGroup {
  id: string;
  name: string;
}

export function EDITab() {
  const { user } = useAuth();
  const [leerdoel, setLeerdoel] = useState('Leerdoel: Wat ga je vandaag leren?');
  const [isEditingLeerdoel, setIsEditingLeerdoel] = useState(false);
  const [activeStep, setActiveStep] = useState<string | null>(null);

  const [showNamePicker, setShowNamePicker] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [showStudentSelector, setShowStudentSelector] = useState(false);
  const [students, setStudents] = useState<Student[]>([]);
  const [groups, setGroups] = useState<StudentGroup[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<string>('all');
  const [selectedStudents, setSelectedStudents] = useState<string[]>([]);

  const [lesTimer, setLesTimer] = useState(0);
  const [lesTargetTime, setLesTargetTime] = useState(300);
  const [isLesTimerRunning, setIsLesTimerRunning] = useState(false);
  const [showLesTimerInput, setShowLesTimerInput] = useState(false);

  const [vraagCountdown, setVraagCountdown] = useState(0);
  const [duoDeelCountdown, setDuoDeelCountdown] = useState(0);

  const [showControLEER, setShowControLEER] = useState(false);
  const [controleScore, setControleScore] = useState({ pp: 0, p: 0, m: 0, mm: 0 });
  const [selectedTechnique, setSelectedTechnique] = useState<string | null>(null);

  const [showLeerdoel, setShowLeerdoel] = useState(true);
  const [showInstructieTechnieken, setShowInstructieTechnieken] = useState(true);

  const didacticSteps = [
    { id: 'wat-weet', label: 'Wat weet je al?', icon: Brain },
    { id: 'uitleg', label: 'Uitleg', icon: Presentation },
    { id: 'oefenen', label: 'Oefenen', icon: Play },
    { id: 'waarom', label: 'Waarom nodig?', icon: Home },
    { id: 'pas-toe', label: 'Pas toe', icon: Book }
  ];

  const teachingTechniques = [
    { id: 'spreek-mee', label: 'Zeg mee', icon: Mic },
    { id: 'volg-mee', label: 'Volg mee', icon: Eye },
    { id: 'lees-mee', label: 'Lees mee', icon: BookOpen },
    { id: 'beweging', label: 'Beweeg mee', icon: Hand },
    { id: 'duo-delen', label: 'Duo-delen', icon: UserPlus },
    { id: 'aandacht', label: 'Aandacht vragen', icon: AlertTriangle },
    { id: 'bordjes', label: 'Schrijf op', icon: FileText },
    { id: 'zin', label: 'Zeg een zin', icon: MessageSquare }
  ];

  useEffect(() => {
    if (user) {
      fetchStudentsAndGroups();
    }
  }, [user]);

  useEffect(() => {
    if (selectedGroup !== 'all') {
      fetchStudentsByGroup(selectedGroup);
    } else {
      setSelectedStudents(students.map(s => s.id));
    }
  }, [selectedGroup]);

  const fetchStudentsByGroup = async (groupId: string) => {
    try {
      const { data: groupStudents } = await supabase
        .from('group_students')
        .select('student_id')
        .eq('group_id', groupId);

      if (groupStudents) {
        setSelectedStudents(groupStudents.map(gs => gs.student_id));
      }
    } catch (error) {
      console.error('Error fetching group students:', error);
    }
  };

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isLesTimerRunning && lesTimer < lesTargetTime) {
      interval = setInterval(() => {
        setLesTimer(prev => Math.min(prev + 1, lesTargetTime));
      }, 1000);
    } else if (lesTimer >= lesTargetTime) {
      setIsLesTimerRunning(false);
    }
    return () => clearInterval(interval);
  }, [isLesTimerRunning, lesTimer, lesTargetTime]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (vraagCountdown > 0) {
      interval = setInterval(() => {
        setVraagCountdown(prev => prev - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [vraagCountdown]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (duoDeelCountdown > 0) {
      interval = setInterval(() => {
        setDuoDeelCountdown(prev => prev - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [duoDeelCountdown]);

  const fetchStudentsAndGroups = async () => {
    try {
      const { data: schoolsData } = await supabase
        .from('user_schools')
        .select('school_id')
        .eq('user_id', user?.id)
        .eq('is_active', true)
        .eq('status', 'approved')
        .limit(1)
        .maybeSingle();

      if (schoolsData) {
        const { data: studentsData } = await supabase
          .from('students')
          .select('id, first_name, last_name')
          .eq('school_id', schoolsData.school_id)
          .eq('is_active', true)
          .order('first_name');

        const { data: groupsData } = await supabase
          .from('student_groups')
          .select('id, name')
          .eq('school_id', schoolsData.school_id)
          .eq('is_active', true)
          .order('name');

        setStudents(studentsData || []);
        setGroups(groupsData || []);
        setSelectedStudents(studentsData?.map(s => s.id) || []);
      }
    } catch (error) {
      console.error('Error fetching students and groups:', error);
    }
  };

  const pickRandomStudent = () => {
    const availableStudents = students.filter(s => selectedStudents.includes(s.id));
    if (availableStudents.length > 0) {
      const randomStudent = availableStudents[Math.floor(Math.random() * availableStudents.length)];
      setSelectedStudent(randomStudent);
      setShowNamePicker(true);
      setTimeout(() => setShowNamePicker(false), 10000);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const totalControleCount = controleScore.pp + controleScore.p + controleScore.m + controleScore.mm;

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold text-gray-900">EDI - Expliciete Directe Instructie</h1>
        <div className="flex items-center gap-3">
          <Button variant="primary" onClick={pickRandomStudent}>
            <Users className="w-4 h-4 mr-2" />
            Kies Random Leerling
          </Button>
          <Button variant="secondary" onClick={() => setShowStudentSelector(!showStudentSelector)}>
            <Edit2 className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {showStudentSelector && (
        <Card className="p-4 border-2 border-blue-500">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Selecteer Groep</label>
              <select
                value={selectedGroup}
                onChange={(e) => setSelectedGroup(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              >
                <option value="all">Alle Leerlingen</option>
                {groups.map(group => (
                  <option key={group.id} value={group.id}>{group.name}</option>
                ))}
              </select>
            </div>
            <div className="max-h-60 overflow-y-auto">
              <label className="block text-sm font-medium text-gray-700 mb-2">Of selecteer individuele leerlingen</label>
              {students.map(student => (
                <label key={student.id} className="flex items-center space-x-2 p-2 hover:bg-gray-50 rounded">
                  <input
                    type="checkbox"
                    checked={selectedStudents.includes(student.id)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedStudents([...selectedStudents, student.id]);
                      } else {
                        setSelectedStudents(selectedStudents.filter(id => id !== student.id));
                      }
                    }}
                    className="w-4 h-4"
                  />
                  <span>{student.first_name} {student.last_name}</span>
                </label>
              ))}
            </div>
          </div>
        </Card>
      )}

      <Card className="p-4">
        <button
          onClick={() => setShowInstructieTechnieken(!showInstructieTechnieken)}
          className="w-full flex items-center justify-between text-lg font-bold text-gray-900 mb-3"
        >
          <span>Instructietechnieken</span>
          <span className="text-gray-500">{showInstructieTechnieken ? '−' : '+'}</span>
        </button>
        {showInstructieTechnieken && (
          <div className="flex gap-2 overflow-x-auto pb-2">
            {teachingTechniques.map(technique => (
              <button
                key={technique.id}
                onClick={() => setSelectedTechnique(selectedTechnique === technique.id ? null : technique.id)}
                className={`flex flex-col items-center justify-center py-2 px-3 rounded-lg transition-all border-2 min-w-[100px] ${
                  selectedTechnique === technique.id
                    ? 'bg-gradient-to-br from-blue-500 to-blue-600 border-blue-700'
                    : 'bg-gradient-to-br from-blue-50 to-blue-100 hover:from-blue-100 hover:to-blue-200 border-blue-200 hover:border-blue-400'
                }`}
              >
                <technique.icon className={`w-6 h-6 mb-1 ${
                  selectedTechnique === technique.id ? 'text-white' : 'text-blue-600'
                }`} />
                <span className={`text-xs font-medium text-center ${
                  selectedTechnique === technique.id ? 'text-white' : 'text-gray-900'
                }`}>{technique.label}</span>
              </button>
            ))}
          </div>
        )}
      </Card>

      <Card className="p-4">
        <div className="space-y-4">
          {isEditingLeerdoel ? (
            <div className="flex items-center gap-3">
              <input
                type="text"
                value={leerdoel}
                onChange={(e) => setLeerdoel(e.target.value)}
                onBlur={() => setIsEditingLeerdoel(false)}
                onKeyDown={(e) => e.key === 'Enter' && setIsEditingLeerdoel(false)}
                className="flex-1 px-4 py-3 text-xl font-semibold border-2 border-blue-500 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                autoFocus
              />
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900">{leerdoel}</h2>
              <Button variant="secondary" onClick={() => setIsEditingLeerdoel(true)}>
                <Edit2 className="w-4 h-4" />
              </Button>
            </div>
          )}

          <button
            onClick={() => setShowLeerdoel(!showLeerdoel)}
            className="w-full flex items-center justify-between text-sm text-gray-600 hover:text-gray-900"
          >
            <span className="font-medium">Didactische stappen</span>
            <span className="text-lg">{showLeerdoel ? '−' : '+'}</span>
          </button>

          {showLeerdoel && (
            <div className="grid grid-cols-5 gap-3">
              {didacticSteps.map((step) => (
                <button
                  key={step.id}
                  onClick={() => setActiveStep(activeStep === step.id ? null : step.id)}
                  className={`w-full px-4 py-3 rounded-lg font-semibold transition-all flex flex-col items-center gap-2 ${
                    activeStep === step.id
                      ? 'bg-blue-600 text-white shadow-lg scale-105'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  <step.icon className="w-5 h-5" />
                  <span className="text-sm">{step.label}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </Card>

      <div className="grid grid-cols-5 gap-2 mb-4">
        <button
          onClick={() => setShowLesTimerInput(!showLesTimerInput)}
          className="w-full h-12 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition-all shadow-sm"
        >
          <Clock className="w-5 h-5 inline mr-2" />
          Les
        </button>

        <button
          onClick={() => setVraagCountdown(10)}
          className="w-full h-12 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition-all shadow-sm"
        >
          <MessageCircle className="w-5 h-5 inline mr-2" />
          Vraag
        </button>

        <button
          onClick={() => setDuoDeelCountdown(5)}
          className="w-full h-12 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition-all shadow-sm"
        >
          <UserPlus className="w-5 h-5 inline mr-2" />
          Duo-deel
        </button>

        <button
          onClick={pickRandomStudent}
          className="w-full h-12 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition-all shadow-sm"
        >
          <UserCheck className="w-5 h-5 inline mr-2" />
          Zit klaar
        </button>

        <button
          onClick={() => setShowControLEER(true)}
          className="w-full h-12 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition-all shadow-sm"
        >
          <CheckCircle className="w-5 h-5 inline mr-2" />
          ControLEER
        </button>
      </div>

      <div className="space-y-3 mb-4">
        {showLesTimerInput && (
            <div className="p-3 bg-white border-2 border-blue-500 rounded-lg space-y-2">
              <input
                type="number"
                value={Math.floor(lesTargetTime / 60)}
                onChange={(e) => setLesTargetTime(parseInt(e.target.value || '0') * 60)}
                className="w-full px-3 py-2 border border-gray-300 rounded"
                placeholder="Minuten"
              />
              <div className="flex gap-2">
                <Button
                  variant="primary"
                  onClick={() => {
                    setLesTimer(0);
                    setIsLesTimerRunning(true);
                    setShowLesTimerInput(false);
                  }}
                >
                  Start
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => {
                    setIsLesTimerRunning(false);
                    setLesTimer(0);
                  }}
                >
                  Reset
                </Button>
              </div>
            </div>
          )}

          {isLesTimerRunning && (
            <div className="p-3 bg-blue-50 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">{formatTime(lesTimer)}</div>
              <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden mt-2">
                <div
                  className="h-full bg-blue-600 transition-all duration-1000"
                  style={{ width: `${(lesTimer / lesTargetTime) * 100}%` }}
                />
              </div>
            </div>
          )}

          {vraagCountdown > 0 && (
            <div className="p-4 bg-blue-50 rounded-lg text-center">
              <div className="text-3xl font-bold text-blue-600">{vraagCountdown}s</div>
            </div>
          )}

          {duoDeelCountdown > 0 && (
            <div className="p-4 bg-blue-50 rounded-lg text-center">
              <div className="text-3xl font-bold text-blue-600">{duoDeelCountdown}s</div>
            </div>
          )}

      </div>

      {showNamePicker && selectedStudent && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl shadow-2xl p-16 text-center relative min-w-[400px]">
            <button
              onClick={() => setShowNamePicker(false)}
              className="absolute top-4 right-4 text-white hover:text-gray-200 text-3xl font-bold w-10 h-10 flex items-center justify-center rounded-full hover:bg-white/20 transition-all"
            >
              ×
            </button>
            <p className="text-6xl font-bold text-white mb-2">
              {selectedStudent.first_name} {selectedStudent.last_name}
            </p>
            <p className="text-white/80 text-lg mt-4">Geselecteerde leerling</p>
          </div>
        </div>
      )}

      {showControLEER && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center">
              <h2 className="text-2xl font-bold text-gray-900">ControLEER</h2>
              <button
                onClick={() => setShowControLEER(false)}
                className="text-gray-500 hover:text-gray-700 text-2xl font-bold"
              >
                ×
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="grid grid-cols-4 gap-3">
                <button
                  onClick={() => setControleScore({ ...controleScore, pp: controleScore.pp + 1 })}
                  className="px-6 py-8 bg-green-600 hover:bg-green-700 text-white rounded-lg font-bold text-2xl transition-all"
                >
                  ++
                </button>
                <button
                  onClick={() => setControleScore({ ...controleScore, p: controleScore.p + 1 })}
                  className="px-6 py-8 bg-green-500 hover:bg-green-600 text-white rounded-lg font-bold text-2xl transition-all"
                >
                  +
                </button>
                <button
                  onClick={() => setControleScore({ ...controleScore, m: controleScore.m + 1 })}
                  className="px-6 py-8 bg-orange-500 hover:bg-orange-600 text-white rounded-lg font-bold text-2xl transition-all"
                >
                  -
                </button>
                <button
                  onClick={() => setControleScore({ ...controleScore, mm: controleScore.mm + 1 })}
                  className="px-6 py-8 bg-red-600 hover:bg-red-700 text-white rounded-lg font-bold text-2xl transition-all"
                >
                  --
                </button>
              </div>

              {totalControleCount > 0 && (
                <div className="flex gap-6 mt-6">
                  <div className="flex-1 flex justify-center">
                    <svg viewBox="0 0 100 100" className="w-48 h-48">
                      <circle cx="50" cy="50" r="40" fill="none" stroke="#e5e7eb" strokeWidth="20" />
                      <circle
                        cx="50"
                        cy="50"
                        r="40"
                        fill="none"
                        stroke="#16a34a"
                        strokeWidth="20"
                        strokeDasharray={`${((controleScore.pp + controleScore.p) / totalControleCount) * 251.2} 251.2`}
                        strokeDashoffset="0"
                        transform="rotate(-90 50 50)"
                      />
                      <circle
                        cx="50"
                        cy="50"
                        r="40"
                        fill="none"
                        stroke="#dc2626"
                        strokeWidth="20"
                        strokeDasharray={`${((controleScore.m + controleScore.mm) / totalControleCount) * 251.2} 251.2`}
                        strokeDashoffset={`-${((controleScore.pp + controleScore.p) / totalControleCount) * 251.2}`}
                        transform="rotate(-90 50 50)"
                      />
                    </svg>
                  </div>
                  <div className="flex-1 space-y-4">
                    <div className="p-4 bg-green-50 rounded-lg">
                      <div className="text-3xl font-bold text-green-600">
                        {Math.round(((controleScore.pp + controleScore.p) / totalControleCount) * 100)}%
                      </div>
                      <div className="text-sm text-gray-700 mt-1">++ en + totaal</div>
                    </div>
                    <div className="p-4 bg-red-50 rounded-lg">
                      <div className="text-3xl font-bold text-red-600">
                        {Math.round(((controleScore.m + controleScore.mm) / totalControleCount) * 100)}%
                      </div>
                      <div className="text-sm text-gray-700 mt-1">- en -- totaal</div>
                    </div>
                  </div>
                </div>
              )}

              <div className="text-center mt-6 pt-6 border-t border-gray-200">
                <div className="text-2xl font-semibold text-gray-700 mb-3">Totaal: {totalControleCount}</div>
                <div className="text-lg text-gray-600 mb-4">
                  ++ {controleScore.pp} | + {controleScore.p} | - {controleScore.m} | -- {controleScore.mm}
                </div>
                <Button
                  variant="secondary"
                  onClick={() => setControleScore({ pp: 0, p: 0, m: 0, mm: 0 })}
                >
                  Reset
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
