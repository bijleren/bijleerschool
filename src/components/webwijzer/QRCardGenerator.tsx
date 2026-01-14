import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { X, Download, Loader } from 'lucide-react';
import QRCode from 'qrcode';
import { jsPDF } from 'jspdf';

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
  access_hash: string | null;
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
        .select('id, first_name, last_name, student_number, grade_level, profile_picture_url, color, symbol_url, student_display_number, access_hash')
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
    const filtered = students.filter(s =>
      `${s.first_name} ${s.last_name} ${s.student_number || ''} ${s.grade_level || ''}`
        .toLowerCase()
        .includes(searchTerm.toLowerCase())
    );
    setSelectedStudents(new Set(filtered.map(s => s.id)));
  };

  const deselectAll = () => {
    setSelectedStudents(new Set());
  };

  const generateQRCode = async (student: Student): Promise<string> => {
    if (!student.access_hash) {
      throw new Error('Student does not have an access hash');
    }
    const url = `https://bijleer.school/webwijzer?h=${encodeURIComponent(student.access_hash)}`;
    return QRCode.toDataURL(url, {
      width: 800,
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

      const SCALE = 3;
      const A4_WIDTH_PX = 793.7 * SCALE;
      const A4_HEIGHT_PX = 1122.5 * SCALE;
      const CARD_WIDTH_CM = 5.2;
      const CARD_HEIGHT_CM = 9;
      const CM_TO_PX = 37.795 * SCALE;
      const CARD_WIDTH = CARD_WIDTH_CM * CM_TO_PX;
      const CARD_HEIGHT = CARD_HEIGHT_CM * CM_TO_PX;

      const CELL_WIDTH = A4_WIDTH_PX / 3;
      const CELL_HEIGHT = A4_HEIGHT_PX / 3;

      canvas.width = A4_WIDTH_PX;
      canvas.height = A4_HEIGHT_PX * totalPages;

      ctx.fillStyle = 'white';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      for (let i = 0; i < selectedStudentsList.length; i++) {
        const student = selectedStudentsList[i];
        const page = Math.floor(i / 9);
        const cardIndex = i % 9;
        const row = Math.floor(cardIndex / 3);
        const col = cardIndex % 3;

        const cellX = col * CELL_WIDTH;
        const cellY = (page * A4_HEIGHT_PX) + (row * CELL_HEIGHT);

        const cardX = cellX + (CELL_WIDTH - CARD_WIDTH) / 2;
        const cardY = cellY + (CELL_HEIGHT - CARD_HEIGHT) / 2;

        await drawCard(ctx, student, cardX, cardY, CARD_WIDTH, CARD_HEIGHT);
      }

      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      for (let page = 0; page < totalPages; page++) {
        if (page > 0) {
          pdf.addPage();
        }

        const pageCanvas = document.createElement('canvas');
        pageCanvas.width = A4_WIDTH_PX;
        pageCanvas.height = A4_HEIGHT_PX;
        const pageCtx = pageCanvas.getContext('2d');
        if (pageCtx) {
          pageCtx.drawImage(
            canvas,
            0, page * A4_HEIGHT_PX,
            A4_WIDTH_PX, A4_HEIGHT_PX,
            0, 0,
            A4_WIDTH_PX, A4_HEIGHT_PX
          );
          const pageImgData = pageCanvas.toDataURL('image/png');
          pdf.addImage(pageImgData, 'PNG', 0, 0, 210, 297);
        }
      }

      pdf.save('webwijzer-qr-cards.pdf');

    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Failed to generate PDF');
    } finally {
      setGenerating(false);
    }
  };

  const roundRect = (
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    width: number,
    height: number,
    radius: number
  ) => {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
  };

  const drawRoundedHexagon = (
    ctx: CanvasRenderingContext2D,
    centerX: number,
    centerY: number,
    radius: number,
    cornerRadius: number
  ) => {
    const angle = Math.PI / 3;
    const points: Array<{x: number, y: number}> = [];

    for (let i = 0; i < 6; i++) {
      const pointAngle = angle * i - Math.PI / 2;
      points.push({
        x: centerX + radius * Math.cos(pointAngle),
        y: centerY + radius * Math.sin(pointAngle)
      });
    }

    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const current = points[i];
      const next = points[(i + 1) % 6];
      const prev = points[(i + 5) % 6];

      const dx1 = current.x - prev.x;
      const dy1 = current.y - prev.y;
      const len1 = Math.sqrt(dx1 * dx1 + dy1 * dy1);

      const dx2 = next.x - current.x;
      const dy2 = next.y - current.y;
      const len2 = Math.sqrt(dx2 * dx2 + dy2 * dy2);

      const startX = current.x - (dx1 / len1) * cornerRadius;
      const startY = current.y - (dy1 / len1) * cornerRadius;
      const endX = current.x + (dx2 / len2) * cornerRadius;
      const endY = current.y + (dy2 / len2) * cornerRadius;

      if (i === 0) {
        ctx.moveTo(startX, startY);
      }

      ctx.lineTo(startX, startY);
      ctx.quadraticCurveTo(current.x, current.y, endX, endY);
    }
    ctx.closePath();
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
    const CM_TO_PX = 37.795 * 3;
    const radius = 0.5 * CM_TO_PX;

    ctx.fillStyle = 'white';
    roundRect(ctx, x, y, width, height, radius);
    ctx.fill();

    const topHeight = 2 * CM_TO_PX;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + topHeight);
    ctx.lineTo(x, y + topHeight);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = 'white';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    let headerFontSize = 4 * CM_TO_PX / 10;
    ctx.font = `300 ${headerFontSize}px "Open Sans", sans-serif`;
    let headerWidth = ctx.measureText('bijleren.school').width;
    while (headerWidth > width - (0.4 * CM_TO_PX) && headerFontSize > (2 * CM_TO_PX / 10)) {
      headerFontSize -= 0.5;
      ctx.font = `300 ${headerFontSize}px "Open Sans", sans-serif`;
      headerWidth = ctx.measureText('bijleren.school').width;
    }
    ctx.fillText('bijleren.school', x + width / 2, y + 0.25 * CM_TO_PX);

    const bottomHeight = 0.5 * CM_TO_PX;
    const bottomY = y + height - bottomHeight;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(x, bottomY);
    ctx.lineTo(x + width, bottomY);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, bottomY);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = 'white';
    let footerFontSize = 4 * CM_TO_PX / 10;
    ctx.font = `300 ${footerFontSize}px "Open Sans", sans-serif`;
    const studentCode = student.student_number || '';
    let footerWidth = ctx.measureText(studentCode).width;
    while (footerWidth > width - (0.4 * CM_TO_PX) && footerFontSize > (2 * CM_TO_PX / 10)) {
      footerFontSize -= 0.5;
      ctx.font = `300 ${footerFontSize}px "Open Sans", sans-serif`;
      footerWidth = ctx.measureText(studentCode).width;
    }
    ctx.fillText(studentCode, x + width / 2, y + height - (0.5 * CM_TO_PX));

    const studentNumberY = y + height - (7.5 * CM_TO_PX);
    const studentNumberX = x + width - (7 * CM_TO_PX);
    ctx.fillStyle = 'white';
    ctx.textAlign = 'left';
    ctx.font = `300 ${footerFontSize}px "Open Sans", sans-serif`;
    ctx.fillText(studentCode, studentNumberX, studentNumberY);

    const photoSize = 3 * CM_TO_PX;
    const photoCenterY = y + height - (7 * CM_TO_PX);
    const photoCenterX = x + width / 2;
    const hexRadius = photoSize / 2;
    const hexCornerRadius = 0.5 * CM_TO_PX;

    ctx.save();
    drawRoundedHexagon(ctx, photoCenterX, photoCenterY, hexRadius, hexCornerRadius);
    ctx.fillStyle = color;
    ctx.fill();
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
        const imgSize = hexRadius * 2;
        ctx.drawImage(img, photoCenterX - hexRadius, photoCenterY - hexRadius, imgSize, imgSize);
      } catch {
        drawRoundedHexagon(ctx, photoCenterX, photoCenterY, hexRadius, hexCornerRadius);
        ctx.fillStyle = color;
        ctx.fill();
      }
    }
    ctx.restore();

    const qrSize = 2 * CM_TO_PX;
    const qrY = y + height - (1 * CM_TO_PX) - qrSize;
    const qrX = x + (width - qrSize) / 2;
    const qrDataUrl = await generateQRCode(student);
    const qrImg = new Image();
    await new Promise((resolve) => {
      qrImg.onload = resolve;
      qrImg.src = qrDataUrl;
    });
    ctx.drawImage(qrImg, qrX, qrY, qrSize, qrSize);

    const lastNameY = y + height - (3.5 * CM_TO_PX);
    ctx.fillStyle = '#000000';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    let lastNameFontSize = 5 * CM_TO_PX / 10;
    ctx.font = `${lastNameFontSize}px "Noteworthy", "Comic Sans MS", cursive`;
    let lastNameWidth = ctx.measureText(student.last_name).width;
    while (lastNameWidth > width - (0.4 * CM_TO_PX) && lastNameFontSize > (2 * CM_TO_PX / 10)) {
      lastNameFontSize -= 0.5;
      ctx.font = `${lastNameFontSize}px "Noteworthy", "Comic Sans MS", cursive`;
      lastNameWidth = ctx.measureText(student.last_name).width;
    }
    ctx.fillText(student.last_name, x + width / 2, lastNameY);

    const firstNameY = y + height / 2;
    let firstNameFontSize = 10 * CM_TO_PX / 10;
    ctx.font = `${firstNameFontSize}px "Noteworthy", "Comic Sans MS", cursive`;
    let firstNameWidth = ctx.measureText(student.first_name).width;
    while (firstNameWidth > width - (0.4 * CM_TO_PX) && firstNameFontSize > (4 * CM_TO_PX / 10)) {
      firstNameFontSize -= 0.5;
      ctx.font = `${firstNameFontSize}px "Noteworthy", "Comic Sans MS", cursive`;
      firstNameWidth = ctx.measureText(student.first_name).width;
    }
    ctx.fillText(student.first_name, x + width / 2, firstNameY);

    if (student.symbol_url) {
      try {
        const symbolSize = 1 * CM_TO_PX;
        const symbolImg = new Image();
        symbolImg.crossOrigin = 'anonymous';
        await new Promise((resolve, reject) => {
          symbolImg.onload = resolve;
          symbolImg.onerror = reject;
          symbolImg.src = student.symbol_url!;
        });

        const symbolX = x + width - (0.3 * CM_TO_PX) - symbolSize;
        const symbolY = y + height - (1.5 * CM_TO_PX) - symbolSize;

        ctx.save();
        ctx.beginPath();
        ctx.arc(symbolX + symbolSize / 2, symbolY + symbolSize / 2, symbolSize / 2, 0, Math.PI * 2);
        ctx.fillStyle = 'white';
        ctx.fill();
        ctx.closePath();
        ctx.clip();
        ctx.drawImage(symbolImg, symbolX, symbolY, symbolSize, symbolSize);
        ctx.restore();
      } catch (error) {
        console.error('Error loading symbol:', error);
      }
    }

    ctx.strokeStyle = '#D1D5DB';
    ctx.lineWidth = 6;
    roundRect(ctx, x, y, width, height, radius);
    ctx.stroke();
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
            <p className="text-gray-600 mt-1">Selecteer leerlingen om QR-kaarten te genereren (3x3 per pagina)</p>
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
              placeholder="Zoek leerlingen..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <Button variant="secondary" onClick={selectAll}>
              Alles Selecteren
            </Button>
            <Button variant="secondary" onClick={deselectAll}>
              Alles Deselecteren
            </Button>
          </div>

          {loading ? (
            <div className="text-center py-12">
              <Loader className="w-8 h-8 animate-spin mx-auto text-gray-400" />
              <p className="text-gray-600 mt-4">Leerlingen laden...</p>
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
            {selectedStudents.size} leerling{selectedStudents.size !== 1 ? 'en' : ''} geselecteerd
            {selectedStudents.size > 0 && (
              <span className="ml-2 text-gray-500">
                ({Math.ceil(selectedStudents.size / 9)} pagina{Math.ceil(selectedStudents.size / 9) !== 1 ? "'s" : ''})
              </span>
            )}
          </p>
          <div className="flex gap-3">
            <Button variant="secondary" onClick={onClose}>
              Annuleren
            </Button>
            <Button
              onClick={generatePDF}
              disabled={selectedStudents.size === 0 || generating}
            >
              {generating ? (
                <>
                  <Loader className="w-4 h-4 mr-2 animate-spin" />
                  Genereren...
                </>
              ) : (
                <>
                  <Download className="w-4 h-4 mr-2" />
                  PDF Genereren
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
