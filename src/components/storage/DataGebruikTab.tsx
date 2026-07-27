import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Card } from '../ui/Card';
import { HardDrive, AlertCircle } from 'lucide-react';

interface DataGebruikTabProps {
  schoolId?: string;
}

export function DataGebruikTab({ schoolId }: DataGebruikTabProps) {
  const [loading, setLoading] = useState(true);
  const [storageUsedGB, setStorageUsedGB] = useState<number>(0);
  const [storageLimitGB, setStorageLimitGB] = useState<number>(5);
  const [isPremium, setIsPremium] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (schoolId) {
      loadStorageData();
    }
  }, [schoolId]);

  const loadStorageData = async () => {
    if (!schoolId) return;

    setLoading(true);
    setError(null);

    try {
      const { data: school, error: schoolError } = await supabase
        .from('schools')
        .select('storage_used_bytes, storage_limit_bytes, premium_school')
        .eq('id', schoolId)
        .maybeSingle();

      if (schoolError) throw schoolError;

      if (!school) {
        setError('School niet gevonden');
        return;
      }

      const usedGB = school.storage_used_bytes / (1024 * 1024 * 1024);
      const limitGB = school.storage_limit_bytes / (1024 * 1024 * 1024);

      setStorageUsedGB(parseFloat(usedGB.toFixed(2)));
      setStorageLimitGB(parseFloat(limitGB.toFixed(2)));
      setIsPremium(school.premium_school === 1);
    } catch (err) {
      console.error('Error loading storage data:', err);
      setError('Kon opslaggegevens niet laden');
    } finally {
      setLoading(false);
    }
  };

  const percentageUsed = storageLimitGB > 0 ? (storageUsedGB / storageLimitGB) * 100 : 0;
  const getStorageColor = () => {
    if (percentageUsed >= 90) return 'bg-red-500';
    if (percentageUsed >= 75) return 'bg-orange-500';
    return 'bg-amber-500';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-#946B29"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="w-16 h-16 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          Geen opslaggegevens beschikbaar
        </h3>
        <p className="text-gray-600">{error}</p>
      </div>
    );
  }

  const availableGB = storageLimitGB - storageUsedGB;

  return (
    <div className="max-w-2xl">
      <Card>
        <div className="flex items-center gap-4 mb-6">
          <div className={`p-4 ${isPremium ? 'bg-yellow-50' : 'bg-amber-50'} rounded-xl`}>
            <HardDrive className={`w-8 h-8 ${isPremium ? 'text-yellow-600' : 'text-#946B29'}`} />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Opslaggebruik</h2>
            <p className="text-sm text-gray-600">
              {isPremium ? 'Premium Account' : 'Gratis Account'}
            </p>
          </div>
        </div>

        <div className="space-y-6">
          <div>
            <div className="flex justify-between items-center mb-3">
              <span className="text-sm font-medium text-gray-700">
                {storageUsedGB} GB van {storageLimitGB} GB gebruikt
              </span>
              <span
                className={`px-3 py-1 rounded-full text-sm font-medium ${
                  percentageUsed >= 90
                    ? 'bg-red-100 text-red-800'
                    : percentageUsed >= 75
                    ? 'bg-orange-100 text-orange-800'
                    : 'bg-amber-100 text-#5C4118'
                }`}
              >
                {percentageUsed.toFixed(1)}%
              </span>
            </div>

            <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
              <div
                className={`h-3 rounded-full transition-all duration-500 ${getStorageColor()}`}
                style={{ width: `${Math.min(percentageUsed, 100)}%` }}
              ></div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4 pt-4 border-t border-gray-200">
            <div>
              <p className="text-xs text-gray-500 mb-1">Totaal</p>
              <p className="text-lg font-semibold text-gray-900">{storageLimitGB} GB</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-1">Gebruikt</p>
              <p className="text-lg font-semibold text-gray-900">{storageUsedGB} GB</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-1">Beschikbaar</p>
              <p className="text-lg font-semibold text-gray-900">{availableGB.toFixed(2)} GB</p>
            </div>
          </div>

          {percentageUsed >= 90 && (
            <div className="flex items-start gap-3 p-4 bg-red-50 rounded-lg border border-red-200">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="font-medium text-red-900">Opslaglimiet bijna bereikt</h4>
                <p className="text-sm text-red-700 mt-1">
                  U heeft bijna uw opslaglimiet bereikt. Verwijder oude bestanden of neem contact op voor meer opslagruimte.
                </p>
              </div>
            </div>
          )}

          {percentageUsed >= 75 && percentageUsed < 90 && (
            <div className="flex items-start gap-3 p-4 bg-orange-50 rounded-lg border border-orange-200">
              <AlertCircle className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="font-medium text-orange-900">Opslagruimte wordt schaars</h4>
                <p className="text-sm text-orange-700 mt-1">
                  Overweeg om oude bestanden te verwijderen om ruimte vrij te maken.
                </p>
              </div>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
