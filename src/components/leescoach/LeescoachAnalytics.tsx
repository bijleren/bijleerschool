import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { ArrowLeft, Download } from 'lucide-react';

interface LeescoachAnalyticsProps {
  schoolId: string;
  onNavigateBack: () => void;
}

interface AnalyticsData {
  totalSessions: number;
  totalStudents: number;
  avgSessionsPerStudent: number;
  scaleDistribution: {
    leesniveau: Record<string, number>;
    begrip: Record<string, number>;
    motivatie: Record<string, number>;
    smaakontwikkeling: Record<string, number>;
  };
}

export function LeescoachAnalytics({ schoolId, onNavigateBack }: LeescoachAnalyticsProps) {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAnalytics();
  }, [schoolId]);

  const loadAnalytics = async () => {
    const { data: sessions, error } = await supabase
      .from('reading_coach_sessions')
      .select('*, students!inner(is_active)')
      .eq('school_id', schoolId)
      .eq('students.is_active', true);

    if (error || !sessions) {
      console.error('Error loading analytics:', error);
      setLoading(false);
      return;
    }

    const uniqueStudents = new Set(sessions.map(s => s.student_id));

    const scaleDistribution = {
      leesniveau: {} as Record<string, number>,
      begrip: {} as Record<string, number>,
      motivatie: {} as Record<string, number>,
      smaakontwikkeling: {} as Record<string, number>,
    };

    sessions.forEach(session => {
      if (session.leesniveau_scale) {
        scaleDistribution.leesniveau[session.leesniveau_scale] =
          (scaleDistribution.leesniveau[session.leesniveau_scale] || 0) + 1;
      }
      if (session.begrip_scale) {
        scaleDistribution.begrip[session.begrip_scale] =
          (scaleDistribution.begrip[session.begrip_scale] || 0) + 1;
      }
      if (session.motivatie_scale) {
        scaleDistribution.motivatie[session.motivatie_scale] =
          (scaleDistribution.motivatie[session.motivatie_scale] || 0) + 1;
      }
      if (session.smaakontwikkeling_scale) {
        scaleDistribution.smaakontwikkeling[session.smaakontwikkeling_scale] =
          (scaleDistribution.smaakontwikkeling[session.smaakontwikkeling_scale] || 0) + 1;
      }
    });

    setAnalytics({
      totalSessions: sessions.length,
      totalStudents: uniqueStudents.size,
      avgSessionsPerStudent: uniqueStudents.size > 0 ? sessions.length / uniqueStudents.size : 0,
      scaleDistribution,
    });

    setLoading(false);
  };

  const getScaleLabel = (scale: string) => {
    switch (scale) {
      case 'very_poor': return '--';
      case 'poor': return '-';
      case 'good': return '+';
      case 'excellent': return '++';
      default: return scale;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-gray-600">Laden...</p>
      </div>
    );
  }

  if (!analytics) {
    return null;
  }

  return (
    <div className="h-full overflow-y-auto p-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center gap-4 mb-6">
          <Button variant="ghost" onClick={onNavigateBack}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-2xl font-bold">Analytics</h1>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card className="p-6">
            <div className="text-3xl font-bold text-#946B29 mb-2">{analytics.totalSessions}</div>
            <div className="text-gray-600">Totaal Sessies</div>
          </Card>
          <Card className="p-6">
            <div className="text-3xl font-bold text-green-600 mb-2">{analytics.totalStudents}</div>
            <div className="text-gray-600">Leerlingen Beoordeeld</div>
          </Card>
          <Card className="p-6">
            <div className="text-3xl font-bold text-orange-600 mb-2">
              {analytics.avgSessionsPerStudent.toFixed(1)}
            </div>
            <div className="text-gray-600">Gem. Sessies per Leerling</div>
          </Card>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Leesniveau Verdeling</h3>
            <div className="space-y-2">
              {Object.entries(analytics.scaleDistribution.leesniveau).map(([scale, count]) => (
                <div key={scale} className="flex items-center justify-between">
                  <span>{getScaleLabel(scale)}</span>
                  <div className="flex items-center gap-3">
                    <div className="w-32 bg-gray-200 rounded-full h-4">
                      <div
                        className="bg-amber-500 h-4 rounded-full"
                        style={{ width: `${(count / analytics.totalSessions) * 100}%` }}
                      />
                    </div>
                    <span className="text-sm text-gray-600 w-12 text-right">{count}</span>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Begrip Verdeling</h3>
            <div className="space-y-2">
              {Object.entries(analytics.scaleDistribution.begrip).map(([scale, count]) => (
                <div key={scale} className="flex items-center justify-between">
                  <span>{getScaleLabel(scale)}</span>
                  <div className="flex items-center gap-3">
                    <div className="w-32 bg-gray-200 rounded-full h-4">
                      <div
                        className="bg-green-500 h-4 rounded-full"
                        style={{ width: `${(count / analytics.totalSessions) * 100}%` }}
                      />
                    </div>
                    <span className="text-sm text-gray-600 w-12 text-right">{count}</span>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Motivatie Verdeling</h3>
            <div className="space-y-2">
              {Object.entries(analytics.scaleDistribution.motivatie).map(([scale, count]) => (
                <div key={scale} className="flex items-center justify-between">
                  <span>{getScaleLabel(scale)}</span>
                  <div className="flex items-center gap-3">
                    <div className="w-32 bg-gray-200 rounded-full h-4">
                      <div
                        className="bg-orange-500 h-4 rounded-full"
                        style={{ width: `${(count / analytics.totalSessions) * 100}%` }}
                      />
                    </div>
                    <span className="text-sm text-gray-600 w-12 text-right">{count}</span>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Smaakontwikkeling Verdeling</h3>
            <div className="space-y-2">
              {Object.entries(analytics.scaleDistribution.smaakontwikkeling).map(([scale, count]) => (
                <div key={scale} className="flex items-center justify-between">
                  <span>{getScaleLabel(scale)}</span>
                  <div className="flex items-center gap-3">
                    <div className="w-32 bg-gray-200 rounded-full h-4">
                      <div
                        className="bg-amber-500 h-4 rounded-full"
                        style={{ width: `${(count / analytics.totalSessions) * 100}%` }}
                      />
                    </div>
                    <span className="text-sm text-gray-600 w-12 text-right">{count}</span>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
