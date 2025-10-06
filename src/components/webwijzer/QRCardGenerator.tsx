import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { X, Download, Loader } from 'lucide-react';
import QRCode from 'qrcode';

interface Student {
  id: string;
  first_name: string;
  last_name: string;
  student_number: string | null;
  grade_level: string | null;
  profile_picture_url: string | null;
  color: string | null;
  symbol_url: string | null;
  student_display_number: number | null;
}

interface QRCardGeneratorProps {
  onClose: () => void;
}

export function QRCardGenerator({ onClose }: QRCardGeneratorProps) {
  const { user } = useAuth();
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedStudents, setSelectedStudents] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (user) {
      fetchStudents();
    }
  }, [user]);

  const fetchStudents = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const { data: userSchools } = await supabase
        .from('user_schools')
        .select('school_id')
        .eq('user_id', user.id);

      const schoolIds = userSchools?.map(us => us.school_id) || [];

      const { data, error } = await supabase
        .from('students')
        .select('id, first_name, last_name, student_number, grade_level, profile_picture_url, color, symbol_url, student_display_number')
        .in('school_id', schoolIds)
        .eq('is_active', true)
        .order('grade_level', { ascending: true })
        .order('first_name', { ascending: true });

      if (error) throw error;
      setStudents(data || []);
    } catch (error) {
      console.error('Error fetching students:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleStudent = (studentId: string) => {
    const newSelected = new Set(selectedStudents);
    if (newSelected.has(studentId)) {
      newSelected.delete(studentId);
    } else {
      newSelected.add(studentId);
    }
    setSelectedStudents(newSelected);
  };

  const selectAll = () => {
    const filtered = filteredStudents;
    setSelectedStudents(new Set(filtered.map(s => s.id)));
  };

  const deselectAll = () => {
    setSelectedStudents(new Set());
  };

  const generateQRCode = async (studentId: string): Promise<string> => {
    const url = `${window.location.origin}/webwijzer/${studentId}`;
    return QRCode.toDataURL(url, {
      width: 300,
      margin: 1,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      }
    });
  };

  const generatePDF = async () => {
    if (selectedStudents.size === 0) {
      alert('Please select at least one student');
      return;
    }

    setGenerating(true);
    try {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const selectedStudentsList = students.filter(s => selectedStudents.has(s.id));
      const totalPages = Math.ceil(selectedStudentsList.length / 9);

      const A4_WIDTH = 793.7;
      const A4_HEIGHT = 1122.5;
      const CARD_WIDTH_CM = 5.2;
      const CARD_HEIGHT_CM = 9;
      const CM_TO_PX = 37.795;
      const CARD_WIDTH = CARD_WIDTH_CM * CM_TO_PX;
      const CARD_HEIGHT = CARD_HEIGHT_CM * CM_TO_PX;

      canvas.width = A4_WIDTH;
      canvas.height = A4_HEIGHT * totalPages;

      ctx.fillStyle = 'white';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const MARGIN_X = (A4_WIDTH - (CARD_WIDTH * 3)) / 2;
      const MARGIN_Y = (A4_HEIGHT - (CARD_HEIGHT * 3)) / 2;

      for (let i = 0; i < selectedStudentsList.length; i++) {
        const student = selectedStudentsList[i];
        const page = Math.floor(i / 9);
        const cardIndex = i % 9;
        const row = Math.floor(cardIndex / 3);
        const col = cardIndex % 3;

        const x = MARGIN_X + (col * CARD_WIDTH);
        const y = (page * A4_HEIGHT) + MARGIN_Y + (row * CARD_HEIGHT);

        await drawCard(ctx, student, x, y, CARD_WIDTH, CARD_HEIGHT);
      }

      const dataUrl = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.href = dataUrl;
      link.download = 'webwijzer-qr-cards.png';
      link.click();

    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Failed to generate PDF');
    } finally {
      setGenerating(false);
    }
  };

  const drawCard = async (
    ctx: CanvasRenderingContext2D,
    student: Student,
    x: number,
    y: number,
    width: number,
    height: number
  ) => {
    const color = student.color || '#6B7280';

    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 2;
    ctx.strokeRect(x, y, width, height);

    const headerHeight = height * 0.15;
    ctx.fillStyle = color;
    ctx.fillRect(x, y, width, headerHeight);

    ctx.fillStyle = 'white';
    ctx.font = 'bold 16px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('bijleren.school', x + width / 2, y + headerHeight / 2 + 6);

    const colorBarHeight = 50;
    const colorBarY = y + headerHeight;
    ctx.fillStyle = color;
    ctx.fillRect(x, colorBarY, width, colorBarHeight);

    ctx.fillStyle = 'white';
    ctx.font = 'bold 20px Arial';
    ctx.textAlign = 'left';
    const gradeText = student.grade_level || '';
    ctx.fillText(gradeText, x + 15, colorBarY + 33);

    ctx.textAlign = 'right';
    const displayNumber = student.student_display_number?.toString() || '';
    ctx.fillText(displayNumber, x + width - 15, colorBarY + 33);

    const photoSize = 150;
    const photoY = colorBarY + colorBarHeight;
    const photoX = x + (width - photoSize) / 2;

    ctx.save();
    ctx.beginPath();
    ctx.arc(photoX + photoSize / 2, photoY + photoSize / 2, photoSize / 2, 0, Math.PI * 2);
    ctx.closePath();
    ctx.clip();

    if (student.profile_picture_url) {
      try {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        await new Promise((resolve, reject) => {
          img.onload = resolve;
          img.onerror = reject;
          img.src = student.profile_picture_url!;
        });
        ctx.drawImage(img, photoX, photoY, photoSize, photoSize);
      } catch {
        ctx.fillStyle = '#E5E7EB';
        ctx.fillRect(photoX, photoY, photoSize, photoSize);
      }
    } else {
      ctx.fillStyle = '#E5E7EB';
      ctx.fillRect(photoX, photoY, photoSize, photoSize);
    }
    ctx.restore();

    const nameY = photoY + photoSize + 20;
    ctx.fillStyle = '#000000';
    ctx.textAlign = 'center';

    let firstNameFontSize = 48;
    ctx.font = `bold ${firstNameFontSize}px Arial`;
    let textWidth = ctx.measureText(student.first_name).width;
    while (textWidth > width - 20 && firstNameFontSize > 24) {
      firstNameFontSize -= 2;
      ctx.font = `bold ${firstNameFontSize}px Arial`;
      textWidth = ctx.measureText(student.first_name).width;
    }
    ctx.fillText(student.first_name, x + width / 2, nameY);

    let lastNameFontSize = 32;
    ctx.font = `${lastNameFontSize}px Arial`;
    let lastNameWidth = ctx.measureText(student.last_name).width;
    while (lastNameWidth > width - 20 && lastNameFontSize > 16) {
      lastNameFontSize -= 2;
      ctx.font = `${lastNameFontSize}px Arial`;
      lastNameWidth = ctx.measureText(student.last_name).width;
    }
    ctx.fillText(student.last_name, x + width / 2, nameY + 40);

    const qrSize = 120;
    const qrY = nameY + 60;
    const qrX = x + (width - qrSize) / 2;
    const qrDataUrl = await generateQRCode(student.id);
    const qrImg = new Image();
    await new Promise((resolve) => {
      qrImg.onload = resolve;
      qrImg.src = qrDataUrl;
    });
    ctx.drawImage(qrImg, qrX, qrY, qrSize, qrSize);

    if (student.symbol_url) {
      try {
        const symbolSize = 50;
        const symbolImg = new Image();
        symbolImg.crossOrigin = 'anonymous';
        await new Promise((resolve, reject) => {
          symbolImg.onload = resolve;
          symbolImg.onerror = reject;
          symbolImg.src = student.symbol_url!;
        });
        ctx.drawImage(symbolImg, x + width - symbolSize - 10, y + height - symbolSize - 50, symbolSize, symbolSize);
      } catch (error) {
        console.error('Error loading symbol:', error);
      }
    }

    const footerHeight = 40;
    const footerY = y + height - footerHeight;
    ctx.fillStyle = color;
    ctx.fillRect(x, footerY, width, footerHeight);

    ctx.fillStyle = 'white';
    ctx.font = '16px Arial';
    ctx.textAlign = 'center';
    const studentCode = student.student_number || '';
    ctx.fillText(studentCode, x + width / 2, footerY + 25);
  };

  const filteredStudents = students.filter(s =>
    `${s.first_name} ${s.last_name} ${s.student_number || ''} ${s.grade_level || ''}`
      .toLowerCase()
      .includes(searchTerm.toLowerCase())
  );

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <Card className="max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">QR-kaarten Generator</h2>
            <p className="text-gray-600 mt-1">Select students to generate QR cards (3x3 per page)</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto flex-1">
          <div className="mb-4 flex gap-3">
            <input
              type="text"
              placeholder="Search students..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <Button variant="secondary" onClick={selectAll}>
              Select All
            </Button>
            <Button variant="secondary" onClick={deselectAll}>
              Deselect All
            </Button>
          </div>

          {loading ? (
            <div className="text-center py-12">
              <Loader className="w-8 h-8 animate-spin mx-auto text-gray-400" />
              <p className="text-gray-600 mt-4">Loading students...</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {filteredStudents.map((student) => (
                <label
                  key={student.id}
                  className={`flex items-center gap-3 p-3 border-2 rounded-lg cursor-pointer transition-colors ${
                    selectedStudents.has(student.id)
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={selectedStudents.has(student.id)}
                    onChange={() => toggleStudent(student.id)}
                    className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 truncate">
                      {student.first_name} {student.last_name}
                    </p>
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      {student.grade_level && <span>{student.grade_level}</span>}
                      {student.student_number && (
                        <span className="text-gray-400">#{student.student_number}</span>
                      )}
                    </div>
                  </div>
                </label>
              ))}
            </div>
          )}
        </div>

        <div className="p-6 border-t border-gray-200 flex items-center justify-between">
          <p className="text-gray-600">
            {selectedStudents.size} student{selectedStudents.size !== 1 ? 's' : ''} selected
            {selectedStudents.size > 0 && (
              <span className="ml-2 text-gray-500">
                ({Math.ceil(selectedStudents.size / 9)} page{Math.ceil(selectedStudents.size / 9) !== 1 ? 's' : ''})
              </span>
            )}
          </p>
          <div className="flex gap-3">
            <Button variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Button
              onClick={generatePDF}
              disabled={selectedStudents.size === 0 || generating}
            >
              {generating ? (
                <>
                  <Loader className="w-4 h-4 mr-2 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Download className="w-4 h-4 mr-2" />
                  Generate Cards
                </>
              )}
            </Button>
          </div>
        </div>
      </Card>

      <canvas ref={canvasRef} style={{ display: 'none' }} />
    </div>
  );
}
